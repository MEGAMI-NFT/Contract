// SPDX-License-Identifier: MIT
pragma solidity ^0.8.7;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import '@openzeppelin/contracts/security/ReentrancyGuard.sol';
import "./Extension/Royalty.sol";

contract MEGAMI is ERC721, HasSecondarySaleFees, Ownable, ReentrancyGuard {
    using Strings for uint256;

    uint256 private _maxSupply = 10000;
    uint256 private _royalty = 1000;
    address private _saleContractAddr;

    uint256 public totalSupply = 0;

    string private constant _baseTokenURI = "ipfs://xxxxx/";

    constructor ()
    ERC721("MEGAMI", "MEGAMI")
    HasSecondarySaleFees(new address payable[](0), new uint256[](0))
    {
        address payable[] memory thisAddressInArray = new address payable[](1);
        thisAddressInArray[0] = payable(address(this));
        uint256[] memory royaltyWithTwoDecimals = new uint256[](1);
        royaltyWithTwoDecimals[0] = _royalty;
        _setCommonRoyalties(thisAddressInArray, royaltyWithTwoDecimals);
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

    function supportsInterface(bytes4 interfaceId)
        public
        view
        virtual
        override(ERC721, HasSecondarySaleFees)
        returns (bool)
    {
        return interfaceId == type(IHasSecondarySaleFees).interfaceId || super.supportsInterface(interfaceId);
    }

    receive() external payable {}
}
