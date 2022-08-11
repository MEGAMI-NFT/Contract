// SPDX-License-Identifier: MIT

pragma solidity ^0.8.7;

import "@chainlink/contracts/src/v0.8/VRFConsumerBaseV2.sol";

contract MockVRFCoordinator {
    uint256 internal counter = 12345;

    function requestRandomWords(
        bytes32,
        uint64,
        uint16,
        uint32,
        uint32
    ) external returns (uint256) {
        VRFConsumerBaseV2 consumer = VRFConsumerBaseV2(msg.sender);
        uint256 requestId = 23456;
        uint256[] memory randomWords = new uint256[](1);
        randomWords[0] = counter;
        consumer.rawFulfillRandomWords(requestId, randomWords);
        counter += 1;

        return requestId;
    }
}