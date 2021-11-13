//SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

import { ERC20 } from "@openzeppelin/contracts/token/ERC20/ERC20.sol";

interface IERC677Receiver {
  function onTokenTransfer(
    address sender,
    uint value,
    bytes memory data
  )
    external;
}

contract ChainlinkMock is ERC20 {

    constructor() ERC20("Chainlink", "LINK") {
        _mint(msg.sender, 1000 ether);
    }

   /**
   * @dev transfer token to a contract address with additional data if the recipient is a contact.
   * @param to The address to transfer to.
   * @param value The amount to be transferred.
   * @param data The extra data to be passed to the receiving contract.
   */
  function transferAndCall(
    address to,
    uint value,
    bytes memory data
  )
    public
    virtual
    returns (bool success)
  {
    super.transfer(to, value);
    if (isContract(to)) {
      contractFallback(to, value, data);
    }
    return true;
  }


  // PRIVATE

  function contractFallback(
    address to,
    uint value,
    bytes memory data
  )
    private
  {
    IERC677Receiver receiver = IERC677Receiver(to);
    receiver.onTokenTransfer(msg.sender, value, data);
  }

  function isContract(
    address addr
  )
    private
    view
    returns (bool hasCode)
  {
    uint length;
    assembly { length := extcodesize(addr) }
    return length > 0;
  }
}