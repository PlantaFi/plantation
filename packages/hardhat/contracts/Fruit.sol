//SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

import { ERC20 } from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import { Ownable } from "@openzeppelin/contracts/access/Ownable.sol";

import { Plant } from "./Plant.sol";

contract Fruit is ERC20, Ownable {

    Plant plant;

    constructor() ERC20("Fruit", "FRUIT") { }

    function _initialize(Plant _plant) external onlyOwner {
        plant = _plant;
    }

    function freeFruit() public {
        _mint(msg.sender, 10 ether);
    }

    // Mints fruits but goes to Plant
    // TODO prevent abuse by checking calling plant's fruiting potential
    function mintFlowers(uint256 amount) public {
        _mint(address(plant), amount);
    }
}
