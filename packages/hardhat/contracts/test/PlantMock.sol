//SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

import { Plant } from "../Plant.sol";

contract PlantMock is Plant {

    function doTraitFactor(Trait trait, uint32 dna) external pure returns (uint256) {
        return traitFactor(trait, dna);
    }
}