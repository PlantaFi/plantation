//SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

import { ERC20 } from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import { Ownable } from "@openzeppelin/contracts/access/Ownable.sol";

contract FMatic is ERC20, Ownable {

    constructor() ERC20("Frapped Matic", "FMATIC") {}

    function freeFMatic() public {
        _mint(msg.sender, 1000 ether);
    }
}
