//SPDX-License-Identifier: MIT
pragma solidity ^0.8.7;

import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @dev Implementation of the Fund Manager contract that allows funds to split to contributors.
 */
contract FundManager is Ownable {
    
    /**
     * @dev Struct managing the receivers and their share (percentage basis points).
     */
    struct FundReceiver { 
        address payable receiver;
        uint96 sharePercentageBasisPoints;
    }
    /**
     * @dev Receivers whom FundManager are sending funds through withdraw function to.
     */
    FundReceiver[] private _fundReceivers;

    /**
     * @dev For receiving fund in case someone try to send it.
     */
    receive() external payable {}

    /**
     * @dev Register new receivers and their share.
     * @param receivers The list of new receivers and their share.
     */
    function setFeeReceivers(FundReceiver[] calldata receivers) external onlyOwner {
        uint256 receiversLength = receivers.length;
        require(receiversLength > 0, "at least one receiver is necessary");
        uint256 totalPercentageBasisPoints = 0;
        delete _fundReceivers;
        for(uint256 i = 0; i < receiversLength;) {
            require(receivers[i].receiver != address(0), "receiver address can't be null");
            require(receivers[i].sharePercentageBasisPoints != 0, "share percentage basis points can't be 0");
            _fundReceivers.push(FundReceiver(receivers[i].receiver, receivers[i].sharePercentageBasisPoints));

            totalPercentageBasisPoints += receivers[i].sharePercentageBasisPoints;

            unchecked { ++i; }
        }
        require(totalPercentageBasisPoints == 10000, "total share percentage basis point isn't 10000");
    }

    /**
     * @dev Send funds to registered receivers based on their share.
     *      If there is remainders, they are sent to the receiver registered at first (index 0).
     */
    function withdraw() external onlyOwner {
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
     * @dev Allow owner to send funds directly to recipient. This is for emergency purpose and use regular withdraw.
     * @param recipient The address of the recipinet.
     */
    function emergencyWithdraw(address recipient) external onlyOwner {
        require(recipient != address(0), "recipient shouldn't be 0");
        require(payable(recipient).send(address(this).balance), "failed to withdraw");
    }

    /**
     * @dev Do nothing for disable renouncing ownership.
     */ 
    function renounceOwnership() public override onlyOwner {}     
}