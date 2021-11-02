//SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

/// You are not authorized to do this action
error Unauthorized();
/// You did not send enough funds
error InsufficientFunds();
/// The `symbol` transfer from `from` to `to` for `amount` failed
error FailedTransfer(address token, address from, address to, uint256 amount);