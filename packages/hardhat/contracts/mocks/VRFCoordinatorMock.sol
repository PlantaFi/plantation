// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

import { LinkTokenInterface } from "@chainlink/contracts/src/v0.8/interfaces/LinkTokenInterface.sol";
import { VRFConsumerBase } from "@chainlink/contracts/src/v0.8/VRFConsumerBase.sol";
import { VRFRequestIDBase } from "@chainlink/contracts/src/v0.8/VRFRequestIDBase.sol";

// forked from https://github.com/smartcontractkit/chainlink/blob/develop/contracts/src/v0.6/tests/VRFCoordinatorMock.sol
contract VRFCoordinatorMock is VRFRequestIDBase {

    LinkTokenInterface public LINK;

    event RandomnessRequest(address indexed sender, bytes32 indexed requestId);

    mapping(bytes32 /* provingKey */ => mapping(address /* consumer */ => uint256)) private nonces;

    modifier onlyLINK() {
        require(msg.sender == address(LINK), "Must use LINK token");
        _;
    }

    constructor(address linkAddress) {
        LINK = LinkTokenInterface(linkAddress);
    }

    function onTokenTransfer(address sender, uint256 fee, bytes memory data) external onlyLINK {
        (bytes32 keyHash, uint256 seed) = abi.decode(data, (bytes32, uint256));
        uint256 nonce = nonces[keyHash][sender];
        uint256 preSeed = makeVRFInputSeed(keyHash, seed, sender, nonce);
        bytes32 requestId = makeRequestId(keyHash, preSeed);
        emit RandomnessRequest(sender, requestId);
        nonces[keyHash][sender]++;
    }

    function callBackWithRandomness(bytes32 requestId, uint256 randomness, address consumerContract) public {
        bytes memory resp = abi.encodeWithSelector(VRFConsumerBase.rawFulfillRandomness.selector, requestId, randomness);
        // Chainlink limits the gas available for the callback
        (bool success, bytes memory data) = consumerContract.call{gas: 206000}(resp);
        require(success, string(data));
    }
}
