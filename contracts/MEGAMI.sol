// SPDX-License-Identifier: MIT
pragma solidity ^0.8.7;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/cryptography/MerkleProof.sol";
import "./StellarUtils/StellarUtils.sol";
import "./Extension/Royalty.sol";

contract MEGAMI is ERC721, ERC721Enumerable, ReentrancyGuard, HasSecondarySaleFees, StellarUtils {
    using Strings for uint256;
    
    uint256 public mintPrice;
    uint256 private _maxSupply = 10000;
    
    string private _baseTokenURI = "ipfs://xxxxx/";

    bytes32 private _merkleProofRoot;

    bool public preSaleFlag = false;
    bool public publicSaleFlag = false;
    uint256 private _royalty = 1000;

    mapping(address => uint256) public pvMintMap;
    mapping(address => uint256) public pubMintMap;

    constructor ()
    ERC721("MEGAMI", "MGM")
    HasSecondarySaleFees(new address payable[](0), new uint256[](0))
    {
        address payable[] memory thisAddressInArray = new address payable[](1);
        thisAddressInArray[0] = payable(address(this));
        uint256[] memory royaltyWithTwoDecimals = new uint256[](1);
        royaltyWithTwoDecimals[0] = _royalty;
        _setCommonRoyalties(thisAddressInArray, royaltyWithTwoDecimals);

        mintPrice = 0.05 ether;
    }

    function _beforeTokenTransfer(address from, address to, uint256 tokenId)
        internal
        virtual
        override(ERC721, ERC721Enumerable)
    {
        super._beforeTokenTransfer(from, to, tokenId);
    }

    function ownerMint(uint256 _tokenId, address _address) public onlyOwner { 
        require(totalSupply() <= _maxSupply, "minting limit");

        _safeMint(_address, _tokenId);
    }

    function setMerkleProofRoot(bytes32 MerkleProofRoot_) external onlyAdmin {
        _merkleProofRoot = MerkleProofRoot_;
    }

    function _isWhitelisted(bytes32[] memory proof_) internal view returns(bool) {
        return MerkleProof.verify(proof_, _merkleProofRoot, keccak256(abi.encodePacked(msg.sender)));
    }

    function privateSaleMint(bytes32[] memory proof_, uint256 _tokenId) external payable nonReentrant {
        require(preSaleFlag, "whitelistMint: Paused");
        require(_isWhitelisted(proof_), "Not whitelisted");
        require(msg.value == mintPrice, "Value sent is not correct");
        require(totalSupply() <= _maxSupply, "minting limit");

        pvMintMap[msg.sender]++;
        _safeMint(msg.sender, _tokenId);
    }

    function publicSaleMint(uint256 _tokenId) public payable nonReentrant {
        require(publicSaleFlag, "publicMint: Paused");
        require(msg.value == mintPrice, "Value sent is not correct");
        require(totalSupply() <= _maxSupply, "minting limit");
         
        pubMintMap[msg.sender]++;
        _safeMint(msg.sender, _tokenId);
    }

    function setPrice(uint256 newPrice) external onlyAdmin {
        mintPrice = newPrice;
    }
    
    function setWhitelistSale(bool bool_) external onlyAdmin {
        preSaleFlag = bool_;
    }

    function setPublicSale(bool bool_) external onlyAdmin {
        publicSaleFlag = bool_;
    }

    function tokenURI(uint256 tokenId) public view virtual override returns (string memory) {
        require(_exists(tokenId), "ERC721Metadata: URI query for nonexistent token");
        return string(abi.encodePacked(_baseTokenURI, tokenId.toString(), ".json"));
    }

    function withdraw() public onlyAdmin {
        uint256 sendAmount = address(this).balance;

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
        override(ERC721, ERC721Enumerable, HasSecondarySaleFees)
        returns (bool)
    {
        return interfaceId == type(IHasSecondarySaleFees).interfaceId || super.supportsInterface(interfaceId);
    }

    receive() external payable {}
}
