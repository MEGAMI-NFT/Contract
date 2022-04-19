// SPDX-License-Identifier: MIT
pragma solidity ^0.8.7;

import "@openzeppelin/contracts/access/Ownable.sol";
import "../Extension/ContextMixin.sol";
import "./OnlyAdmin.sol";
import "./Round.sol";

contract StellarUtils is ContextMixin, Ownable, OnlyAdmin, Round {
    
}
