//SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

import { ERC721 } from "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import { Counters } from "@openzeppelin/contracts/utils/Counters.sol";
import { Math as OPMath } from "@openzeppelin/contracts/utils/math/Math.sol";
import { Math } from "./Math.sol";
import { PRBMathSD59x18 as PRBI } from "prb-math/contracts/PRBMathSD59x18.sol";
import { PRBMathUD60x18 as PRBU } from "prb-math/contracts/PRBMathUD60x18.sol";

contract Plant is ERC721 {

    using Counters for Counters.Counter;

    Counters.Counter private _tokenIdCounter;
    // Every constant as wad
    uint256 GAME_TICK = PRBU.fromUint(1 hours);
    uint256 WATER_MAX_ABSORB = PRBU.fromUint(500);
    uint256 NORMAL_BRANCH_LINEAR_RATE = PRBU.fromUint(1); // base rate per hour
    uint256 NORMAL_BRANCH_WET_WEAKEN_RATE = PRBU.div(PRBU.fromUint(5), PRBU.fromUint(100)); // 0.05
    uint256 NORMAL_BRANCH_DRY_WEAKEN_RATE = PRBU.div(PRBU.fromUint(2), PRBU.fromUint(10)); // 0.2
    uint256 WEAK_BRANCH_STRENGTHEN_RATE = PRBU.div(PRBU.fromUint(1), PRBU.fromUint(10)); // 0.1
    uint256 WEAK_BRANCH_DEATH_RATE = PRBU.div(PRBU.fromUint(1), PRBU.fromUint(10)); // 0.1

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
        uint256 soilAbsorbFactor; // as wad TEMP soilAbsorbFactor is 1.0 to 1.5, default to 1.0
        // Plant properties
        uint256 lastNormalBranch; // as wad
        uint256 lastWeakBranch; // as wad
        uint256 lastDeadBranch; // as wad
        uint256 lastWaterLevel; // as wad
        uint256 lastWaterUseRate; // as wad
        uint256 lastWaterTicks; // as wad
        uint256 lastWateredAt;
        uint256 lastUpdatedAt;
    }

    /// Plants state
    mapping (uint256 => PlantState) public _plants;

    constructor() ERC721("Plant", "PLANT") {
        buy();
    }

    /* --- Action functions --- */

    /// Buy a new plant
    function buy() public {
        uint256 plantId = _tokenIdCounter.current();
        _safeMint(msg.sender, plantId);
        _tokenIdCounter.increment();
        _initializeState(_plants[plantId]);
        // TEMP 11110110111101100101000110001100
        _plants[plantId].dna = 4143337868;
    }

    /// Water a plant
    function water(uint256 plantId) external {
        PlantState storage plant = _plants[plantId];
        _updateState(plant);
        plant.lastWaterLevel = waterAbsorbed(traitFactor(Trait.ABSORB, plant.dna), plant.lastNormalBranch);
        plant.lastWaterUseRate = waterUseRate(plant.lastNormalBranch, plant.lastWeakBranch, plant.lastDeadBranch);
        plant.lastWaterTicks = PRBU.div(plant.lastWaterLevel, plant.lastWaterUseRate);
        plant.lastWateredAt = block.timestamp;
    }

    /// Prune a plant
    function prune(uint256 plantId) external {
        revert("Not yet Implemented");
    }

    /* --- State Helper functions --- */

    /// Query a plant current state
    function state(uint256 _plantId) external view returns (PlantState memory) {
        return _state(_plants[_plantId]);
    }

    function _state(PlantState memory p) internal view returns (PlantState memory) {
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
            p.lastNormalBranch = Math.or0(Math.toInt256(p.lastNormalBranch) - newNormalBranchGrowth);
            uint256 newDeadBranchGrowth = deadBranchGrowth(traitFactor(Trait.DIE, p.dna), ticks, p.lastWeakBranch);
            p.lastDeadBranch = p.lastDeadBranch + newDeadBranchGrowth;
            int256 newWeakBranchGrowth = weakBranchGrowth(newWetWeaken, newWetStrengthen, newDryWeaken, newDeadBranchGrowth);
            // Cannot be less than 0
            p.lastWeakBranch = Math.or0(Math.toInt256(p.lastWeakBranch) - newWeakBranchGrowth);
        }
        {
            (uint256 newWaterLevel, uint256 newWaterTicks) = remainingWater(ticks, p.lastWaterUseRate, p.lastWaterLevel, p.lastWaterTicks);
            p.lastWaterLevel = newWaterLevel;
            p.lastWaterTicks = newWaterTicks;
        }
        return p;
    }

    function _updateState(PlantState storage _plant) internal {
        PlantState memory _p = _state(_plant);
        _plant.lastNormalBranch = _p.lastNormalBranch;
        _plant.lastWeakBranch = _p.lastWeakBranch;
        _plant.lastDeadBranch = _p.lastDeadBranch;
        _plant.lastWaterLevel = _p.lastWaterLevel;
        _plant.lastWaterTicks = _p.lastWaterTicks;
        _plant.lastUpdatedAt = block.timestamp;
    }

    function _initializeState(PlantState storage plant) internal {
        // Only initialize non zero values
        plant.soilAbsorbFactor = PRBU.fromUint(1); // TEMP
        plant.lastNormalBranch = PRBU.fromUint(1);
        plant.lastWaterUseRate = waterUseRate(plant.lastNormalBranch, plant.lastWeakBranch, plant.lastDeadBranch);
        plant.lastUpdatedAt = block.timestamp;
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
        uint8 bitPosition = uint8(trait) * 3;
        uint32 shifted = dna >> bitPosition;
        uint8 traitValue = uint8(trait != Trait.COLOR ? shifted & 7 : shifted);
        // FIXME: Should use constants 
        return PRBU.fromUint(1) + PRBU.mul(traitValue, PRBU.div(PRBU.fromUint(4), PRBU.fromUint(100)));
    }
}