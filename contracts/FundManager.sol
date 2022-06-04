//SPDX-License-Identifier: MIT
pragma solidity ^0.8.7;

import "@openzeppelin/contracts/access/Ownable.sol";

contract FundManager is Ownable {
    // Withdraw management
    struct fundReceiver { 
        address payable receiver;
        uint96 sharePercentageBasisPoints;
    }
    fundReceiver[] private _fundReceivers;

    // Withdraw 
    receive() external payable {}
    fallback() external payable {}

    function setFeeReceivers(fundReceiver[] calldata receivers) external onlyOwner {
        uint256 receiversLength = receivers.length;
        require(receiversLength > 0, "at least one receiver is necessary");
        uint256 totalPercentageBasisPoints = 0;
        delete _fundReceivers;
        for(uint256 i = 0; i < receiversLength;) {
            require(receivers[i].receiver != address(0), "receiver address can't be null");
            require(receivers[i].sharePercentageBasisPoints != 0, "share percentage basis points can't be 0");
            _fundReceivers.push(fundReceiver(receivers[i].receiver, receivers[i].sharePercentageBasisPoints));

            totalPercentageBasisPoints += receivers[i].sharePercentageBasisPoints;

            unchecked { ++i; }
        }
        require(totalPercentageBasisPoints == 10000, "total share percentage basis point isn't 10000");
    }

    function withdraw() public onlyOwner {
        require(_fundReceivers.length != 0, "receivers haven't been specified yet");

        uint256 sendingAmount = address(this).balance;
        uint256 receiversLength = _fundReceivers.length;
        uint256 totalSent = 0;
        if(receiversLength > 1) {
            for(uint256 i = 1; i < receiversLength;) {
                uint256 transferAmount = (sendingAmount * _fundReceivers[i].sharePercentageBasisPoints) / 10000;
                totalSent += transferAmount;
                require(_fundReceivers[i].receiver.send(transferAmount), "transfer failed");

                unchecked { ++i; }
            }
        }

        // Remainder is sent to the first receiver
        require(_fundReceivers[0].receiver.send(sendingAmount - totalSent), "transfer failed");
    }

    /**
     @dev Emergency withdraw. Please use moveFund to megami for regular withdraw
     */
    function emergencyWithdraw() public onlyOwner {
        require(payable(owner()).send(address(this).balance));
    }
}