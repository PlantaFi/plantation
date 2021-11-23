//SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

import { console } from "hardhat/console.sol";
import { ERC721 } from "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import { ERC721Enumerable } from "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import { Math as OPMath } from "@openzeppelin/contracts/utils/math/Math.sol";
import { VRFConsumerBase } from "@chainlink/contracts/src/v0.8/VRFConsumerBase.sol";
import { PRBMathSD59x18 as PRBI } from "prb-math/contracts/PRBMathSD59x18.sol";
import { PRBMathUD60x18 as PRBU } from "prb-math/contracts/PRBMathUD60x18.sol";
import { Math } from "./Math.sol";
import { Unauthorized, InsufficientLinkFunds, FailedTransfer } from "./Shared.sol";
import { Land } from "./Land.sol";

contract Plant is ERC721, ERC721Enumerable, VRFConsumerBase {

    uint256 private counter;
    // Every constant as wad
    uint256 immutable GAME_TICK = PRBU.fromUint(1 hours);
    uint256 immutable WATER_MAX_ABSORB = PRBU.fromUint(500);
    uint256 immutable FRAILTY_THRESH = PRBU.fromUint(5000);
    uint256 constant public BASE_PRICE = 2 ether;
    uint256 constant public PRICE_INCREASE = 0.1 ether;
    uint256 immutable ONE = PRBU.fromUint(1);
    uint256 immutable NORMAL_BRANCH_LINEAR_RATE = PRBU.fromUint(1); // base rate per hour
    uint256 immutable NORMAL_BRANCH_WET_WEAKEN_RATE = PRBU.div(PRBU.fromUint(5), PRBU.fromUint(100)); // 0.05
    uint256 immutable NORMAL_BRANCH_DRY_WEAKEN_RATE = PRBU.div(PRBU.fromUint(2), PRBU.fromUint(10)); // 0.2
    uint256 immutable WEAK_BRANCH_STRENGTHEN_RATE = PRBU.div(PRBU.fromUint(1), PRBU.fromUint(10)); // 0.1
    uint256 immutable WEAK_BRANCH_DEATH_RATE = PRBU.div(PRBU.fromUint(1), PRBU.fromUint(10)); // 0.1
    uint256 immutable NORMAL_BRANCH_PRUNE_RATE = PRBU.div(PRBU.fromUint(1), PRBU.fromUint(10)); // 0.1
    uint256 immutable WEAK_BRANCH_PRUNE_RATE = PRBU.div(PRBU.fromUint(4), PRBU.fromUint(10)); // 0.4
    uint256 immutable DEAD_BRANCH_PRUNE_RATE = PRBU.div(PRBU.fromUint(8), PRBU.fromUint(10)); // 0.8
    // Chainlink properties
    bytes32 immutable chainlinkKeyHash;
    uint256 immutable chainlinkFee;
    // Contracts
    Land immutable land;
    IERC20 immutable fruit;

    struct PlantState {
        // Seed properties
        /**
         * DNA bits
         * 3: 1 of 8 species
         * 3: growth bonus (4% extra growth per unit 2^3)
         * 3: maturation bonus - less growth required per stage (4% less growth needed to stage up per unit 2^3)
         * 3: water efficiency (absorb 4% more water per unit)
         * 3: fertilizer efficiency (absorb 4% more fertilizer)
         * 3: fruit bonus (grows 4% more per)
         * 3: longevity (lives 6% longer per)
         * 3: weaken hardiness (3% less branch weaken)
         * 3: (branch) dying hardiness (3% less branch die)
         * 5: color/cosmetic
         * = sums to 32
         */
        uint32 dna;
        // Plant properties
        uint256 lastFrailty; // as wad
        uint256 lastNormalBranch; // as wad
        uint256 lastWeakBranch; // as wad
        uint256 lastDeadBranch; // as wad
        uint256 lastDeadPruned; // as wad
        uint256 lastWaterLevel; // as wad
        uint256 lastWaterUseRate; // as wad
        uint256 lastWaterTicks; // as wad
        uint256 lastWateredAt;
        uint256 lastUpdatedAt;
        uint16 landId; // Its associated land
        uint16 landSpecies;
        uint256 landBurns;
    }

    /// Plants state
    mapping (uint256 => PlantState) plantStates;
    // Mapping from a chainlink's request to a plantId
    mapping (bytes32 => uint256) requestIdToPlantId;
    // Mapping from a chainlink's request to the plant's owner
    mapping (bytes32 => address) requestIdToAddress;

    /// The plant `plantId` is being created
    event PlantCreationStarted(uint256 indexed plantId);

    constructor(address _vrfCoordinator, address _link, bytes32 _keyHash, uint256 _fee, address _land, address _fruit) ERC721("Plant", "PLANT") VRFConsumerBase(_vrfCoordinator, _link) {
        chainlinkKeyHash = _keyHash;
        chainlinkFee = _fee;
        land = Land(_land);
        fruit = IERC20(_fruit);
    }

    /* --- Action functions --- */

    /// Buy a new plant
    /*
        Because of chainlink's (even more) asynchronous pattern to get a random number,
        we need 2 functions to buy a new plant token: 
            1) we make the user pay for it, we request a randomNumber and start initializing its state
            2) the callback needs to mint and finish initializing its state
    */
    function buy() external {
        // Transfer the current price amount of fruit from the sender to this contract
        if (!fruit.transferFrom(msg.sender, address(this), currentPrice())) revert FailedTransfer(address(fruit), msg.sender, address(this), currentPrice());
        // Request a random number 
        requestRandomNumberFor(counter);
        // Initialize every plant state properties that don't use directly or indirectly the dna
        PlantState storage plant = plantStates[counter];
        plant.lastFrailty = ONE;
        plant.lastNormalBranch = ONE;
        plant.lastWaterUseRate = waterUseRate(ONE, plant.lastWeakBranch, plant.lastDeadBranch);
        plant.lastWateredAt = block.timestamp;
        plant.lastUpdatedAt = block.timestamp;
        plant.landId = type(uint16).max;
        emit PlantCreationStarted(counter);
        counter++;
    }

    function buyCallback(address to, uint256 plantId, uint32 dna) internal {
        // Mint the token
        _mint(to, plantId);
        // Finish the plant state initialization with the dna
        PlantState storage plant = plantStates[plantId];
        plant.dna = dna;
        uint256 absorbed = waterAbsorbed(traitFactor(Trait.ABSORB, dna), ONE);
        plant.lastWaterLevel = absorbed;
        plant.lastWaterTicks = PRBU.div(absorbed, plant.lastWaterUseRate);
    }

    /// Plant a plant into a land

    /// Water a plant
    function water(uint256 plantId) external {
        PlantState storage plant = plantStates[plantId];
        updateState(plant);
        plant.lastWaterLevel = waterAbsorbed(traitFactor(Trait.ABSORB, plant.dna), plant.lastNormalBranch);
        plant.lastWaterUseRate = waterUseRate(plant.lastNormalBranch, plant.lastWeakBranch, plant.lastDeadBranch);
        plant.lastWaterTicks = PRBU.div(plant.lastWaterLevel, plant.lastWaterUseRate);
        plant.lastWateredAt = block.timestamp;
    }

    /// Prune one of `your` `plant`
    function prune(uint256 plantId) external {
        PlantState storage plant = plantStates[plantId];
        updateState(plant);
        (uint256 prunedNormalBranch, uint256 prunedWeakBranch, uint256 prunedDeadBranch) = prunedBranch(plant.lastNormalBranch, plant.lastWeakBranch, plant.lastDeadBranch);
        plant.lastNormalBranch -= prunedNormalBranch;
        plant.lastWeakBranch -= prunedWeakBranch;
        plant.lastDeadBranch -= prunedDeadBranch;
        plant.lastDeadPruned += prunedDeadBranch;
        // factor: ONE + PRBU.mul(PRBU.fromUint(traitValue), PRBU.div(PRBU.fromUint(4), PRBU.fromUint(100)))
        uint256 burnFactor = ONE + PRBU.mul(PRBU.fromUint(plant.landBurns), PRBU.div(PRBU.fromUint(4), PRBU.fromUint(100)));
        // Tree.frailty = 1+(Tree.deadPruned/((1 + .04*Ctx.landBurns) * factor('long') * FRAILTY_THRESH))**3;
        plant.lastFrailty = 1 + PRBU.pow(PRBU.div(plant.lastDeadPruned, PRBU.mul(PRBU.mul(burnFactor, traitFactor(Trait.LONG, plant.dna)), FRAILTY_THRESH)), 3);
        // The plant won't consume as much water now
        plant.lastWaterUseRate = waterUseRate(plant.lastNormalBranch, plant.lastWeakBranch, plant.lastDeadBranch);
    }

    /**
     * Burn one of `your` `plants` and empty the corresponding `land`.
     * @dev See {ERC721-_burn}
     */
    function burn(uint256 plantId) external {
        burn(plantId, msg.sender);
    }

    /* --- Game state helper functions --- */

    /// Query the current price
    function currentPrice() public view returns (uint256) {
        return BASE_PRICE + PRBU.mul(PRBU.fromUint(counter), PRICE_INCREASE);
    }

    /// Get an address's unplanted plants
    function unplantedByAddress(address addr) external view returns (uint256[] memory) {
        require(addr != address(0), "Invalid address");
        uint256 balance = balanceOf(addr);
        uint256 count;
        uint256[] memory ids = new uint256[](balance);
        for (uint256 i; i < balance; i++) {
            uint256 plantId = tokenOfOwnerByIndex(addr, i);
            if (!isPlanted(plantStates[plantId])) {
                ids[count++] = plantId;
            } 
        }
        uint256[] memory filtered = new uint256[](count);
        for (uint256 i; i < count; i++) {
            filtered[i] = ids[i];
        }
        return filtered;
    }

    function plantedByAddress(address addr) external view returns (uint256[] memory) {
        require(addr != address(0), "Invalid address");
        uint256 balance = balanceOf(addr);
        uint256 count;
        uint256[] memory ids = new uint256[](balance);
        for (uint256 i; i < balance; i++) {
            uint256 plantId = tokenOfOwnerByIndex(addr, i);
            if (isPlanted(plantStates[plantId])) {
                ids[count++] = plantId;
            } 
        }
        uint256[] memory filtered = new uint256[](count);
        for (uint256 i; i < count; i++) {
            filtered[i] = ids[i];
        }
        return filtered;
    }

    /* --- Plant state helper functions --- */

    /// Query a plant current state
    function state(uint256 plantId) external view returns (PlantState memory) {
        return state(plantStates[plantId]);
    }

    function state(PlantState memory p) internal view returns (PlantState memory) {
        (uint256 wetTicks, uint256 dryTicks, uint256 ticks) = elapsedTicks(block.timestamp, p.lastUpdatedAt, p.lastWaterTicks);
        // To avoid the stack too deep error
        // https://soliditydeveloper.com/stacktoodeep
        {
            uint256 weakFactor = traitFactor(Trait.WEAK, p.dna);
            uint256 newWetWeaken = wetWeaken(wetTicks, weakFactor, p.lastNormalBranch);
            uint256 newDryWeaken = dryWeaken(dryTicks, weakFactor, p.lastNormalBranch);
            uint256 newWetStrengthen = wetStrengthen(wetTicks, p.lastWeakBranch);
            {
              uint256 newWetGrowth = wetGrowth(wetTicks, traitFactor(Trait.GROWTH, p.dna), p.lastNormalBranch);
              int256 newNormalBranchGrowth = normalBranchGrowth(newWetGrowth, newWetWeaken, newWetStrengthen, newDryWeaken, p.lastFrailty);
              // Cannot be less than 0
              p.lastNormalBranch = Math.or0(Math.toInt256(p.lastNormalBranch) + newNormalBranchGrowth);
            }
            {
              uint256 newDeadBranchGrowth = deadBranchGrowth(traitFactor(Trait.DIE, p.dna), ticks, p.lastWeakBranch);
              p.lastDeadBranch = p.lastDeadBranch + newDeadBranchGrowth;
              int256 newWeakBranchGrowth = weakBranchGrowth(newWetWeaken, newWetStrengthen, newDryWeaken, newDeadBranchGrowth, p.lastFrailty);
              // Cannot be less than 0
              p.lastWeakBranch = Math.or0(Math.toInt256(p.lastWeakBranch) + newWeakBranchGrowth);
            }
        }
        {
            (uint256 newWaterLevel, uint256 newWaterTicks) = remainingWater(ticks, p.lastWaterUseRate, p.lastWaterLevel, p.lastWaterTicks);
            p.lastWaterLevel = newWaterLevel;
            p.lastWaterTicks = newWaterTicks;
        }
        return p;
    }

    /// Check and save a plant new land
    function implant(uint16 landId, uint256 plantId, address sender) external {
        PlantState storage plant = plantStates[plantId];
        if (
            // Check if the token exists, if sender owns the plant
            ownerOf(plantId) != sender ||
            // Check if it is not already implanted
            isPlanted(plant) || 
            // If it is already assigned to this land
            land.isPlanted(landId) && land.plantByLand(landId) != plantId
        ) revert Unauthorized();
        plant.landId = landId;
        (, uint8[] memory species, uint32[] memory burns) = land.landDetailsByDistance(landId, 0);
        plant.landSpecies = species[0];
        plant.landBurns = burns[0]; // not PRBU
    }

    function burn(uint256 plantId, address sender) public {
        if (
            // Check if the token exists, if sender owns the plant
            ownerOf(plantId) != sender ||
            // If it is not implanted, only the owner can burn it
            !isPlanted(plantStates[plantId]) && msg.sender != sender ||
            // If it is, its land must have been cleared
            isPlanted(plantStates[plantId]) && land.isPlanted(plantStates[plantId].landId)
        ) revert Unauthorized();
        delete plantStates[plantId];
        _burn(plantId);
    }
    
    function isPlanted(PlantState storage plant) internal view returns (bool) {
        return plant.landId != type(uint16).max;
    }

    function updateState(PlantState storage plant) internal {
        PlantState memory p = state(plant);
        plant.lastNormalBranch = p.lastNormalBranch;
        plant.lastWeakBranch = p.lastWeakBranch;
        plant.lastDeadBranch = p.lastDeadBranch;
        plant.lastWaterLevel = p.lastWaterLevel;
        plant.lastWaterTicks = p.lastWaterTicks;
        plant.lastUpdatedAt = block.timestamp;
    }

    // as wad
    // wetGrowth - wetWeaken + weStrengthen - dryWeaken
    function normalBranchGrowth(uint256 newWetGrowth, uint256 newWetWeaken, uint256 newWetStrengthen, uint256 newDryWeaken, uint256 frailty) internal pure returns (int256) {
        // growth can be negative
        return Math.toInt256(newWetGrowth) - Math.toInt256(PRBU.mul(frailty, newWetWeaken)) + Math.toInt256(newWetStrengthen) - Math.toInt256(PRBU.mul(frailty, newDryWeaken));
    }

    // as wad
    // wetWeaken + weStrengthen + dryWeaken - deadBranchGrowth
    function weakBranchGrowth(uint256 newWetWeaken, uint256 newWetStrengthen, uint256 newDryWeaken, uint256 newDeadBranchGrowth, uint256 frailty) internal pure returns (int256) {
        // growth can be negative
        return Math.toInt256(PRBU.mul(frailty, newWetWeaken)) - Math.toInt256(newWetStrengthen) + Math.toInt256(PRBU.mul(frailty, newDryWeaken)) - Math.toInt256(newDeadBranchGrowth);
    }

    // as wad
    // dieFactor * deathRate * ticks * lastWeakBranch
    function deadBranchGrowth(uint256 dieFactor, uint256 ticks, uint256 lastWeakBranch) internal view returns (uint256) {
        return PRBU.mul(lastWeakBranch, PRBU.mul(ticks, PRBU.mul(dieFactor, WEAK_BRANCH_DEATH_RATE)));
    }

    // as wad
    // wetTicks * growthFactor * (branchLinearRate + sqrt(lastNormalBranch))
    function wetGrowth(uint256 wetTicks, uint256 growthFactor, uint256 lastNormalBranch) internal view returns (uint256) {
        uint256 newLinearNormalBranchRate = NORMAL_BRANCH_LINEAR_RATE + PRBU.sqrt(lastNormalBranch);
        return PRBU.mul(newLinearNormalBranchRate, PRBU.mul(wetTicks, growthFactor));
    }

    // as wad
    // wetTicks * weakFactor / 2 * wetWeakenRate * lastNormalBranch
    function wetWeaken(uint256 wetTicks, uint256 weakFactor, uint256 lastNormalBranch) internal view returns (uint256) {
        uint256 newWetWeakFactor = PRBU.mul(wetTicks, PRBU.div(weakFactor, PRBU.fromUint(2)));
        return PRBU.mul(lastNormalBranch, PRBU.mul(newWetWeakFactor, NORMAL_BRANCH_WET_WEAKEN_RATE));
    }

    // as wad
    // dryTicks * weakFactor / 2 * dryWeakendRate * lastNormalBranch
    function dryWeaken(uint256 dryTicks, uint256 weakFactor, uint256 lastNormalBranch) internal view returns (uint256) {
        uint256 newDryWeakFactor = PRBU.mul(dryTicks, PRBU.div(weakFactor, PRBU.fromUint(2)));
        return PRBU.mul(lastNormalBranch, PRBU.mul(newDryWeakFactor, NORMAL_BRANCH_DRY_WEAKEN_RATE));
    }
    
    // as wad
    // wetTicks * strengthRate * lastWeakBranch
    function wetStrengthen(uint256 wetTicks, uint256 lastWeakBranch) internal view returns (uint256) {
        return PRBU.mul(lastWeakBranch, PRBU.mul(wetTicks, WEAK_BRANCH_STRENGTHEN_RATE));
    }

    // Return values as wad
    function elapsedTicks(uint256 currentTimestamp, uint256 lastUpdate, uint256 lastWaterTicks) internal view returns (uint256 wet, uint256 dry, uint256 total) {
        uint256 elapsedTime = PRBU.fromUint(currentTimestamp - lastUpdate);
        total = PRBU.div(elapsedTime, GAME_TICK);
        wet = OPMath.min(lastWaterTicks, total);
        dry = total - wet;
    }

    // Params and return values as wad
    function remainingWater(uint256 ticks, uint256 lastWaterUseRate, uint256 lastWaterLevel, uint256 lastWaterTicks) internal pure returns (uint256 newWaterLevel, uint256 newWaterTicks) {
        uint256 usedWater = PRBU.mul(ticks, lastWaterUseRate);
        // Cannot be less than 0
        newWaterLevel = Math.or0(Math.toInt256(lastWaterLevel) - Math.toInt256(usedWater));
        newWaterTicks = Math.or0(Math.toInt256(lastWaterTicks) - Math.toInt256(ticks));
    }

    // Param and return values as wad
    function waterAbsorbed(uint256 absorbFactor, uint256 lastNormalBranch) internal view returns (uint256) {
        // absorbed amt related to healthy mass
        return OPMath.min(WATER_MAX_ABSORB, PRBU.mul(absorbFactor, lastNormalBranch));
    }

    // Params and return values as wad
    function waterUseRate(uint256 lastNormalBranch, uint256 lastWeakBranch, uint256 lastDeadBranch) internal view returns (uint256) {
        // TODO should we cap useRate?
        // weak/dead will spend absorbed water
        uint256 lastTotalBranch = lastNormalBranch + lastWeakBranch + lastDeadBranch;
        return ONE + PRBU.floor(PRBU.sqrt(lastTotalBranch));
    }

    // Params and return values as wad
    function prunedBranch(uint256 lastNormalBranch, uint256 lastWeakBranch, uint256 lastDeadBranch) internal view returns (uint256 prunedNormalBranch, uint256 prunedWeakBranch, uint256 prunedDeadBranch) {
        // FIXME: should use a constant
        uint256 targetAmount = PRBU.fromUint(100);
        prunedDeadBranch = OPMath.min(targetAmount, PRBU.mul(DEAD_BRANCH_PRUNE_RATE, lastDeadBranch));
        prunedWeakBranch = OPMath.min(targetAmount - prunedDeadBranch, PRBU.mul(WEAK_BRANCH_PRUNE_RATE, lastWeakBranch));
        prunedNormalBranch = OPMath.min(targetAmount - prunedWeakBranch, PRBU.mul(NORMAL_BRANCH_PRUNE_RATE, lastNormalBranch));
    }

    /* --- DNA helper functions --- */

    enum Trait {
        SPECIES,
        GROWTH,
        MATURATE,
        ABSORB,
        FERTILE,
        FRUIT,
        LONG,
        WEAK,
        DIE,
        COLOR
    }

    // Calculate the plant's trait factor. Result in wad
    function traitFactor(Trait trait, uint32 dna) internal view returns (uint256) {
        uint8 traitOrder = uint8(trait);
        uint8 lastBitPosition;
        uint8 mask;
        if (trait == Trait.COLOR) {
            lastBitPosition = 0;
            mask = 0x1f;
        } else {
            lastBitPosition = 32 - (traitOrder + 1) * 3;
            mask = 0x07;
        }
        uint32 shifted = dna >> lastBitPosition;
        uint8 traitValue = uint8(shifted & mask);
        // FIXME: Should use constants 
        return ONE + PRBU.mul(PRBU.fromUint(traitValue), PRBU.div(PRBU.fromUint(4), PRBU.fromUint(100)));
    }

    /* --- Chainlink functions --- */

    function requestRandomNumberFor(uint256 plantId) internal {
        // Check if the contract has enough LINK to pay the oracle
        if (LINK.balanceOf(address(this)) < chainlinkFee) revert InsufficientLinkFunds();
        bytes32 requestId = requestRandomness(chainlinkKeyHash, chainlinkFee);
        requestIdToPlantId[requestId] = plantId;
        requestIdToAddress[requestId] = msg.sender;
    }

    /**
     * Callback function used by VRF Coordinator
     * It should not revert and consume more than 200k gas
     */
    function fulfillRandomness(bytes32 requestId, uint256 randomness) internal override {
        uint32 dna = uint32(randomness);
        buyCallback(requestIdToAddress[requestId], requestIdToPlantId[requestId], dna);
    }

    /* --- Other functions --- */

    // The following functions are overrides required by Solidity.

    function _beforeTokenTransfer(address from, address to, uint256 tokenId)
        internal
        override(ERC721, ERC721Enumerable)
    {
        super._beforeTokenTransfer(from, to, tokenId);
    }

    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(ERC721, ERC721Enumerable)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }
}
