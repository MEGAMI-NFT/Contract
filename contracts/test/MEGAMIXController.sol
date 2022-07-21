// SPDX-License-Identifier: MIT

pragma solidity ^0.8.7;

import "../MEGAMIX.sol";

contract MEGAMIXController {
    MEGAMIX private megamixToken;

    constructor(MEGAMIX megamixContractAddress){
        megamixToken = megamixContractAddress;
    }

    function mint(address to, uint256 tokenId, uint256 amount, bytes memory data) external
    {
        megamixToken.mint(to, tokenId, amount, data);
    }
    
    function mintBatch(address to, uint256[] memory tokenIds, uint256[] memory amounts, bytes memory data) external 
    {
        megamixToken.mintBatch(to, tokenIds, amounts, data);
    }

    function burn(address holder, uint256 tokenId, uint256 amount) external 
    {
        megamixToken.burn(holder, tokenId, amount);
    }

    function burnBatch(address holder, uint256[] memory tokenIds, uint256[] memory amounts) external 
    {
		megamixToken.burnBatch(holder, tokenIds, amounts);
    }
}