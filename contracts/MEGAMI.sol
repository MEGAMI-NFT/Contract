// SPDX-License-Identifier: MIT
pragma solidity ^0.8.7;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import '@openzeppelin/contracts/token/ERC20/IERC20.sol';
import "@openzeppelin/contracts/access/Ownable.sol";
import '@openzeppelin/contracts/security/ReentrancyGuard.sol';
import "./rarible/royalties/contracts/LibPart.sol";
import "./rarible/royalties/contracts/LibRoyaltiesV2.sol";
import "./rarible/royalties/contracts/RoyaltiesV2.sol";

contract MEGAMI is ERC721, Ownable, ReentrancyGuard, RoyaltiesV2 {
    using Strings for uint256;

    uint256 private _maxSupply = 10000;
    uint256 private _royalty = 1000;
    address private _saleContractAddr;

    uint256 public totalSupply = 0;

    string private constant _baseTokenURI = "ipfs://xxxxx/";

    // Royality management
    bytes4 public constant _INTERFACE_ID_ERC2981 = 0x2a55205a;
    address payable public defaultRoyaltiesReceipientAddress;  // This will be set in the constructor
    uint96 public defaultPercentageBasisPoints = 300;  // 3%    

    constructor ()
    ERC721("MEGAMI", "MEGAMI")
    {
        defaultRoyaltiesReceipientAddress = payable(address(this));
    }

    function setSaleContract(address contractAddr)
        external
        onlyOwner
    {
        _saleContractAddr = contractAddr;
    }

    modifier onlyOwnerORSaleContract()
    {
        require(_saleContractAddr == _msgSender() || owner() == _msgSender(), "Ownable: caller is not the Owner or SaleContract");
        _;
    }

    function _beforeTokenTransfer(address from, address to, uint256 tokenId)
        internal
        virtual
        override(ERC721)
    {
        super._beforeTokenTransfer(from, to, tokenId);
    }

    function mint(uint256 _tokenId, address _address) public onlyOwnerORSaleContract nonReentrant { 
        require(totalSupply <= _maxSupply, "minting limit");

        _safeMint(_address, _tokenId);

        totalSupply += 1;
    }

    function tokenURI(uint256 tokenId) public view virtual override returns (string memory) {
        require(_exists(tokenId), "ERC721Metadata: URI query for nonexistent token");
        return string(abi.encodePacked(_baseTokenURI, tokenId.toString(), ".json"));
    }

    function withdraw() public onlyOwnerORSaleContract {
        uint256 sendAmount = address(this).balance;

        // 分配については本番までに設定
        address payer_1 = payable(0x0);
        address payer_2 = payable(0x0);

        bool success;

        (success, ) = payer_1.call{value: (sendAmount * 1/10)}("");
        require(success, "Failed to withdraw");

        (success, ) = payer_2.call{value: (sendAmount * 1/10)}("");
        require(success, "Failed to withdraw");
    }

    receive() external payable {}

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
     * @dev set defaultRoyaltiesReceipientAddress
     * @param _defaultRoyaltiesReceipientAddress address New royality receipient address
     */
    function setDefaultRoyaltiesReceipientAddress(address payable _defaultRoyaltiesReceipientAddress) public onlyOwner {
        defaultRoyaltiesReceipientAddress = _defaultRoyaltiesReceipientAddress;
    }

    /**
     * @dev set defaultPercentageBasisPoints
     * @param _defaultPercentageBasisPoints uint96 New royality percentagy basis points
     */
    function setDefaultPercentageBasisPoints(uint96 _defaultPercentageBasisPoints) public onlyOwner {
        defaultPercentageBasisPoints = _defaultPercentageBasisPoints;
    }

    /**
     * @dev return royality for Rarible
     */
    function getRaribleV2Royalties(uint256) external view override returns (LibPart.Part[] memory) {
        LibPart.Part[] memory _royalties = new LibPart.Part[](1);
        _royalties[0].value = defaultPercentageBasisPoints;
        _royalties[0].account = defaultRoyaltiesReceipientAddress;
        return _royalties;
    }

    /**
     * @dev return royality in EIP-2981 standard
     * @param _salePrice uint256 sales price of the token royality is calculated
     */
    function royaltyInfo(uint256, uint256 _salePrice) external view returns (address receiver, uint256 royaltyAmount) {
        return (defaultRoyaltiesReceipientAddress, (_salePrice * defaultPercentageBasisPoints) / 10000);
    }

    function supportsInterface(bytes4 interfaceId) public view virtual override(ERC721) returns (bool) {
        if (interfaceId == LibRoyaltiesV2._INTERFACE_ID_ROYALTIES) {
            return true;
        }
        if (interfaceId == _INTERFACE_ID_ERC2981) {
            return true;
        }
        return super.supportsInterface(interfaceId);
    }
    
    // Disable renouncing ownership
    function renounceOwnership() public override onlyOwner {}      
}
