//SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

library Math {

    /// Could not convert `x` uint256 to int256
    error OverflowConversion(uint256 x);

    uint256 private constant POSITIVE_INT256_MAX = uint256(type(int256).max);

    function toInt256(uint256 x) internal pure returns (int256) {
        if (x > POSITIVE_INT256_MAX) revert OverflowConversion(x);
        return int256(x);
    }

    function or0(int256 x) internal pure returns (uint256) {
        return x > 0 ? uint256(x) : 0;
    }
}