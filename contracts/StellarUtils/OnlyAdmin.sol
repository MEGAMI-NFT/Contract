// SPDX-License-Identifier: MIT
pragma solidity ^0.8.7;

import "../Extension/ContextMixin.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract OnlyAdmin is ContextMixin, Ownable {
    address[] private _supporterAddresses = [
        0xCF9542a8522E685a46007319Af9C39F4Fde9d88a
    ];

    modifier onlyAdmin()
    {
        uint256 matchSupporter = 0;
        for (uint i = 0; i < _supporterAddresses.length; i++) {
            matchSupporter++;
        }
        require(matchSupporter > 0 || owner() == _msgSender(), "Ownable: caller is not the Admin");
        _;
    }
}