//SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

// import { console } from "hardhat/console.sol";
import { ERC721 } from "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import { ERC721Enumerable } from "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
import { Counters } from "@openzeppelin/contracts/utils/Counters.sol";
import { Math as OPMath } from "@openzeppelin/contracts/utils/math/Math.sol";
import { PRBMathSD59x18 as PRBI } from "prb-math/contracts/PRBMathSD59x18.sol";
import { PRBMathUD60x18 as PRBU } from "prb-math/contracts/PRBMathUD60x18.sol";
import { Math } from "./Math.sol";
import { Unauthorized } from "./Shared.sol";

contract Plant is ERC721, ERC721Enumerable {

    using Counters for Counters.Counter;

    Counters.Counter private _tokenIdCounter;
    // Every constant as wad
    // FIXME: Should be immutable
    uint256 GAME_TICK = PRBU.fromUint(1 hours);
    uint256 WATER_MAX_ABSORB = PRBU.fromUint(500);
    uint256 NORMAL_BRANCH_LINEAR_RATE = PRBU.fromUint(1); // base rate per hour
    uint256 NORMAL_BRANCH_WET_WEAKEN_RATE = PRBU.div(PRBU.fromUint(5), PRBU.fromUint(100)); // 0.05
    uint256 NORMAL_BRANCH_DRY_WEAKEN_RATE = PRBU.div(PRBU.fromUint(2), PRBU.fromUint(10)); // 0.2
    uint256 WEAK_BRANCH_STRENGTHEN_RATE = PRBU.div(PRBU.fromUint(1), PRBU.fromUint(10)); // 0.1
    uint256 WEAK_BRANCH_DEATH_RATE = PRBU.div(PRBU.fromUint(1), PRBU.fromUint(10)); // 0.1
    uint256 NORMAL_BRANCH_PRUNE_RATE = PRBU.div(PRBU.fromUint(1), PRBU.fromUint(10)); // 0.1
    uint256 WEAK_BRANCH_PRUNE_RATE = PRBU.div(PRBU.fromUint(4), PRBU.fromUint(10)); // 0.4
    uint256 DEAD_BRANCH_PRUNE_RATE = PRBU.div(PRBU.fromUint(8), PRBU.fromUint(10)); // 0.8

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
        uint256 lastNormalBranch; // as wad
        uint256 lastWeakBranch; // as wad
        uint256 lastDeadBranch; // as wad
        uint256 lastWaterLevel; // as wad
        uint256 lastWaterUseRate; // as wad
        uint256 lastWaterTicks; // as wad
        uint256 lastWateredAt;
        uint256 lastUpdatedAt;
        uint256 landId; // Its associated land
    }

    /// Plants state
    mapping (uint256 => PlantState) plantStates;

    constructor() ERC721("Plant", "PLANT") {
        buy();
    }

    /* --- Action functions --- */

    /// Buy a new plant
    function buy() public {
        uint256 plantId = _tokenIdCounter.current();
        _safeMint(msg.sender, plantId);
        _tokenIdCounter.increment();
        // TEMP 11110110111101100101000110001100
        plantStates[plantId].dna = 4143337868;
        initializeState(plantStates[plantId]);
    }

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
        // The plant won't consume as much water now
        plant.lastWaterUseRate = waterUseRate(plant.lastNormalBranch, plant.lastWeakBranch, plant.lastDeadBranch);
    }

    /**
     * Burn one of `your` `plants` and empty the corresponding `land`.
     * @dev See {ERC721-_burn}
     */
    function burn(uint256 plantId) external {
        // Check if the token exists and if the sender owns the seed
        if (ownerOf(plantId) != msg.sender) revert Unauthorized();
        delete plantStates[plantId];
        _burn(plantId);
    }

    /* --- Game state helper functions --- */

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

    /* --- Plant state helper functions --- */

    /// Query a plant current state
    function state(uint256 _plantId) external view returns (PlantState memory) {
        return state(plantStates[_plantId]);
    }

    function isPlanted(PlantState storage plant) internal view returns (bool) {
        return plant.landId != type(uint256).max;
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
            uint256 newWetGrowth = wetGrowth(wetTicks, traitFactor(Trait.GROWTH, p.dna), p.lastNormalBranch);
            int256 newNormalBranchGrowth = normalBranchGrowth(newWetGrowth, newWetWeaken, newWetStrengthen, newDryWeaken);
            // Cannot be less than 0
            p.lastNormalBranch = Math.or0(Math.toInt256(p.lastNormalBranch) + newNormalBranchGrowth);
            uint256 newDeadBranchGrowth = deadBranchGrowth(traitFactor(Trait.DIE, p.dna), ticks, p.lastWeakBranch);
            p.lastDeadBranch = p.lastDeadBranch + newDeadBranchGrowth;
            int256 newWeakBranchGrowth = weakBranchGrowth(newWetWeaken, newWetStrengthen, newDryWeaken, newDeadBranchGrowth);
            // Cannot be less than 0
            p.lastWeakBranch = Math.or0(Math.toInt256(p.lastWeakBranch) + newWeakBranchGrowth);
        }
        {
            (uint256 newWaterLevel, uint256 newWaterTicks) = remainingWater(ticks, p.lastWaterUseRate, p.lastWaterLevel, p.lastWaterTicks);
            p.lastWaterLevel = newWaterLevel;
            p.lastWaterTicks = newWaterTicks;
        }
        return p;
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

    function initializeState(PlantState storage plant) internal {
        // Only initialize non zero values
        plant.lastNormalBranch = PRBU.fromUint(1); // FIXME: Should be a constant
        plant.lastWaterLevel = waterAbsorbed(traitFactor(Trait.ABSORB, plant.dna), plant.lastNormalBranch);
        plant.lastWaterUseRate = waterUseRate(plant.lastNormalBranch, plant.lastWeakBranch, plant.lastDeadBranch);
        plant.lastWaterTicks = PRBU.div(plant.lastWaterLevel, plant.lastWaterUseRate);
        plant.lastWateredAt = block.timestamp;
        plant.lastUpdatedAt = block.timestamp;
        plant.landId = type(uint256).max;
    }

    // as wad
    // wetGrowth - wetWeaken + weStrengthen - dryWeaken
    function normalBranchGrowth(uint256 newWetGrowth, uint256 newWetWeaken, uint256 newWetStrengthen, uint256 newDryWeaken) internal pure returns (int256) {
        // growth can be negative
        return Math.toInt256(newWetGrowth) - Math.toInt256(newWetWeaken) + Math.toInt256(newWetStrengthen) - Math.toInt256(newDryWeaken);
    }

    // as wad
    // wetWeaken + weStrengthen + dryWeaken - deadBranchGrowth
    function weakBranchGrowth(uint256 newWetWeaken, uint256 newWetStrengthen, uint256 newDryWeaken, uint256 newDeadBranchGrowth) internal pure returns (int256) {
        // growth can be negative
        return Math.toInt256(newWetWeaken) - Math.toInt256(newWetStrengthen) + Math.toInt256(newDryWeaken) - Math.toInt256(newDeadBranchGrowth);
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
    function waterUseRate(uint256 lastNormalBranch, uint256 lastWeakBranch, uint256 lastDeadBranch) internal pure returns (uint256) {
        // TODO should we cap useRate?
        // weak/dead will spend absorbed water
        uint256 lastTotalBranch = lastNormalBranch + lastWeakBranch + lastDeadBranch;
        return PRBU.fromUint(1) + PRBU.floor(PRBU.sqrt(lastTotalBranch));
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
    function traitFactor(Trait trait, uint32 dna) internal pure returns (uint256) {
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
        return PRBU.fromUint(1) + PRBU.mul(PRBU.fromUint(traitValue), PRBU.div(PRBU.fromUint(4), PRBU.fromUint(100)));
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