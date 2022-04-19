// SPDX-License-Identifier: MIT
pragma solidity ^0.8.7;

contract Round {
    uint256 private _round = 1;
    mapping(uint256 => uint256) private _roundBloks;

    function setRound(uint256 round_) public virtual {
        _roundBloks[round_] = block.number;
        _round = round_;
    }

    function getRound(uint256 round_) external view returns(uint256) {
        return _roundBloks[round_];
    }
}
