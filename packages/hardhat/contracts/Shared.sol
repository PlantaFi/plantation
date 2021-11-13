//SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

/// You are not authorized to do this action
error Unauthorized();
/// You did not send enough funds
error InsufficientFunds();
/// There aren't enough LINK funds to pay the oracle
error InsufficientLinkFunds();
/// The `symbol` transfer from `from` to `to` for `amount` failed
error FailedTransfer(address token, address from, address to, uint256 amount);