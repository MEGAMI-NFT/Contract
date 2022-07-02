//SPDX-License-Identifier: MIT
pragma solidity ^0.8.7;

import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @dev Implementation of the Fund Manager contract that allows funds to split to contributors.
 */
contract FundManager is Ownable {

    /**
     * @dev 100% in bases point
     */
    uint256 private constant HUNDRED_PERCENT_IN_BASIS_POINTS = 10000;
    
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
        require(receiversLength <= 50, "too many receivers");
        uint256 totalPercentageBasisPoints = 0;
        delete _fundReceivers;
        for(uint256 i = 0; i < receiversLength;) {
            require(receivers[i].receiver != address(0), "receiver address can't be null");
            require(receivers[i].sharePercentageBasisPoints != 0, "share percentage basis points can't be 0");
            _fundReceivers.push(FundReceiver(receivers[i].receiver, receivers[i].sharePercentageBasisPoints));

            totalPercentageBasisPoints += receivers[i].sharePercentageBasisPoints;

            unchecked { ++i; }
        }
        require(totalPercentageBasisPoints == HUNDRED_PERCENT_IN_BASIS_POINTS, "total share percentage basis point isn't 10000");
    }

    /**
     * @dev Send funds to registered receivers based on their share.
     *      If there is remainders, they are sent to the receiver registered at first (index 0).
     */
    function withdraw() external onlyOwner {
        require(_fundReceivers.length != 0, "receivers haven't been specified yet");

        uint256 sendingAmount = address(this).balance;
        uint256 receiversLength = _fundReceivers.length;
        if(receiversLength > 1) {
            for(uint256 i = 1; i < receiversLength;) {
                uint256 transferAmount = (sendingAmount * _fundReceivers[i].sharePercentageBasisPoints) / HUNDRED_PERCENT_IN_BASIS_POINTS;
                (bool sent, ) = _fundReceivers[i].receiver.call{value: transferAmount}("");
                require(sent, "transfer failed");
                unchecked { ++i; }
            }
        }

        // Remainder is sent to the first receiver
        (bool sentRemainder, ) = _fundReceivers[0].receiver.call{value: address(this).balance}("");
        require(sentRemainder, "transfer failed");
    }

    /**
     * @dev Allow owner to send funds directly to recipient. This is for emergency purpose and use regular withdraw.
     * @param recipient The address of the recipinet.
     */
    function emergencyWithdraw(address recipient) external onlyOwner {
        require(recipient != address(0), "recipient shouldn't be 0");

        (bool sent, ) = recipient.call{value: address(this).balance}("");
        require(sent, "failed to withdraw");
    }

    /**
     * @dev Do nothing for disable renouncing ownership.
     */ 
    function renounceOwnership() public override onlyOwner {}     
}