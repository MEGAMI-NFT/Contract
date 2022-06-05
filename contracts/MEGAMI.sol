// SPDX-License-Identifier: MIT
pragma solidity ^0.8.7;

import "@openzeppelin/contracts/access/Ownable.sol";
import '@openzeppelin/contracts/interfaces/IERC2981.sol';
import '@openzeppelin/contracts/security/ReentrancyGuard.sol';
import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import '@openzeppelin/contracts/token/ERC20/IERC20.sol';
import "./rarible/royalties/contracts/LibPart.sol";
import "./rarible/royalties/contracts/LibRoyaltiesV2.sol";
import "./rarible/royalties/contracts/RoyaltiesV2.sol";
import "./interfaces/IMEGAMI.sol";

/**
 * @dev Implementation of the MEGAMI tokens which are ERC721 tokens.
 */
contract MEGAMI is IMEGAMI, ERC721, Ownable, ReentrancyGuard, RoyaltiesV2 {
    using Strings for uint256;

    // @notice Total number of the MEGAMI tokens minted so far.
    uint256 public totalSupply = 0;

    // @dev Address of sales contract
    address private _salesContractAddr;

    // @dev Maxium number of MEGAMI tokens can be minted.
    uint256 private constant _maxSupply = 10000;

    // @dev The base URI of metadata 
    string private _baseTokenURI = "ipfs://xxxxx/";

    // @dev Address of the royalty recipient 
    address payable public defaultRoyaltiesReceipientAddress;

    // @dev Percentage basis points of the royalty
    uint96 public defaultPercentageBasisPoints = 300;  // 3%

    // @dev Address of the fund manager contract
    address payable private _fundManager;

    /**
     * @dev Constractor of MEGAMI contract. Setting the fund manager and royalty recipient.
     * @param fundManagerContractAddress Address of the contract managing funds.
     */
    constructor (address fundManagerContractAddress)
    ERC721("MEGAMI", "MEGAMI")
    {
        _fundManager = payable(fundManagerContractAddress);
        defaultRoyaltiesReceipientAddress = _fundManager;
    }

    /**
     * @dev Sets the address of the sales contract.
     * @param salesContractAddr Address of the contract selling MEGAMI tokens.
     */
    function setSalesContract(address salesContractAddr)
        external
        onlyOwner
    {
        _salesContractAddr = salesContractAddr;
    }

    /**
     * @dev The modifier allowing the function access only for owner and sales contract.
     */
    modifier onlyOwnerORSalesContract()
    {
        require(_salesContractAddr == _msgSender() || owner() == _msgSender(), "Ownable: caller is not the Owner or SalesContract");
        _;
    }

    function _beforeTokenTransfer(address from, address to, uint256 tokenId)
        internal
        virtual
        override(ERC721)
    {
        super._beforeTokenTransfer(from, to, tokenId);
    }

    /**
     * @dev Mint the specified MEGAMI token and transfer it to the specified address.
     * @param _tokenId The token ID being minted.
     * @param _address Receiver's address of the minted token.
     */
    function mint(uint256 _tokenId, address _address) 
        external 
        override 
        onlyOwnerORSalesContract nonReentrant 
    { 
        require(_tokenId < _maxSupply, "can't mint more than limit");
        
        totalSupply += 1;

        _safeMint(_address, _tokenId);
    }

    /**
     * @dev Return tokenURI for the specified token ID.
     * @param tokenId The token ID the token URI is returned for.
     */
    function tokenURI(uint256 tokenId) public view virtual override returns (string memory) {
        require(_exists(tokenId), "ERC721Metadata: URI query for nonexistent token");
        return string(abi.encodePacked(_baseTokenURI, tokenId.toString(), ".json"));
    }

    /**
     * @dev Set baseTokenURI.
     * @param newBaseTokenURI The value being set to baseTokenURI.
     */
    function setBaseTokenURI(string calldata newBaseTokenURI) external onlyOwner {
        _baseTokenURI = newBaseTokenURI;
    }

    // Copied from ForgottenRunesWarriorsGuild. Thank you dotta ;)
    /**
     * @dev ERC20s should not be sent to this contract, but if someone
     * does, it's nice to be able to recover them
     * @param token IERC20 the token address
     * @param amount uint256 the amount to send
     */
    function forwardERC20s(IERC20 token, uint256 amount) public onlyOwner {
        require(address(msg.sender) != address(0));
        token.transfer(msg.sender, amount);
    }

    // Royality management
    /**
     * @dev Set the royalty recipient.
     * @param _defaultRoyaltiesReceipientAddress The address of the new royalty receipient.
     */
    function setDefaultRoyaltiesReceipientAddress(address payable _defaultRoyaltiesReceipientAddress) public onlyOwner {
        defaultRoyaltiesReceipientAddress = _defaultRoyaltiesReceipientAddress;
    }

    /**
     * @dev Set the percentage basis points of the loyalty.
     * @param _defaultPercentageBasisPoints The new percentagy basis points of the loyalty.
     */
    function setDefaultPercentageBasisPoints(uint96 _defaultPercentageBasisPoints) public onlyOwner {
        defaultPercentageBasisPoints = _defaultPercentageBasisPoints;
    }

    /**
     * @dev Return royality information for Rarible.
     */
    function getRaribleV2Royalties(uint256) external view override returns (LibPart.Part[] memory) {
        LibPart.Part[] memory _royalties = new LibPart.Part[](1);
        _royalties[0].value = defaultPercentageBasisPoints;
        _royalties[0].account = defaultRoyaltiesReceipientAddress;
        return _royalties;
    }

    /**
     * @dev Return royality information in EIP-2981 standard.
     * @param _salePrice The sale price of the token that royality is being calculated.
     */
    function royaltyInfo(uint256, uint256 _salePrice) external view returns (address receiver, uint256 royaltyAmount) {
        return (defaultRoyaltiesReceipientAddress, (_salePrice * defaultPercentageBasisPoints) / 10000);
    }

    /**
     * @dev 
     */
    function supportsInterface(bytes4 interfaceId) 
        public 
        view 
        virtual 
        override(IERC165, ERC721) 
        returns (bool) 
    {
        if (interfaceId == LibRoyaltiesV2._INTERFACE_ID_ROYALTIES) {
            return true;
        }
        if (interfaceId == type(IERC2981).interfaceId) {
            return true;
        }
        return super.supportsInterface(interfaceId);
    }
    
    /**
     * @dev Do nothing for disable renouncing ownership.
     */ 
    function renounceOwnership() public override onlyOwner {}     

    // Fund Management
    /**
     * @dev For receiving fund in case someone try to send it.
     */
    receive() external payable {}
    
    /**
     * @dev Set the address of the fund manager contract.
     * @param contractAddr Address of the contract managing funds.
     */
    function setFundManagerContract(address contractAddr)
        external
        onlyOwner
    {
        _fundManager = payable(contractAddr);
    } 

    /**
     * @dev Allow owner to send funds directly to recipient. This is for emergency purpose and use moveFundToManager for regular withdraw.
     * @param recipient The address of the recipinet.
     */
    function emergencyWithdraw(address recipient) external onlyOwner {
        require(recipient != address(0), "recipient shouldn't be 0");
        require(payable(recipient).send(address(this).balance), "failed to withdraw");
    }

    /**
     * @dev Move all of funds to the fund manager contract.
     */
    function moveFundToManager() external onlyOwner {
        (bool sent, ) = address(_fundManager).call{value: address(this).balance}("");
        require(sent, "failed to move fund to FundManager contract");
    }
}
