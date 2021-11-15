//SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

import { Land } from "../Land.sol";
import { Plant } from "../Plant.sol";

contract PlantMock is Plant {

    constructor(address _vrfCoordinator, address _link, bytes32 _keyHash, uint256 _fee, Land _land) Plant(_vrfCoordinator, _link, _keyHash, _fee, _land) {}

    function doTraitFactor(Trait trait, uint32 dna) external view returns (uint256) {
        return traitFactor(trait, dna);
    }

    function doFulfillRandomness(uint256 plantId, uint256 random) external {
        uint32 dna = uint32(random);
        buyCallback(msg.sender, plantId, dna);
    }
}