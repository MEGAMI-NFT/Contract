// SPDX-License-Identifier: MIT

// xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxddxxxxddxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
// xxxxxxxxxxxxxxxxxxxxdol:;,''....'',;:lodxxxxxxxxxxxxxxxxxxxxxdlc;,''....'',;:codxxxxxxxxxxxxxxxxxxxx
// xxxxxxxxxxxxxxxxxdc;'.                .';ldxxxxxxxxxxxxxxdl;'.                ..;cdxxxxxxxxxxxxxxxxx
// xxxxxxxxxxxxxxdl;.                        .;ldxxxxxxxxxo;.                        .;ldxxxxxxxxxxxxxx
// xxxxxxxxxxxxxl,.                            .,lxxxxxxo;.                            .'ldxxxxxxxxxxxx
// xxxxxxxxxxxo;.                                .,lddo;.                                .;oxxxxxxxxxxx
// xxxxxxxxxxo'                                    ....                                    'lxxxxxxxxxx
// xxxxxxxxxl'                             .                   .                            .lxxxxxxxxx
// xxxxxxxxo,                             'c,.              .,c'                             'oxxxxxxxx
// xxxxxxxxc.                             .lxl,.          .,ldo.                             .:xxxxxxxx
// xxxxxxxd,                              .:xxxl,.      .,ldxxc.                              'oxxxxxxx
// xxxxxxxo'                               ,dxxxxl,.  .,ldxxxd;                               .lxxxxxxx
// xxxxxxxo.                               .oxxxxxxl::ldxxxxxo'                               .lxxxxxxx
// xxxxxxxd,                               .cxxxxxxxxxxxxxxxxl.                               'oxxxxxxx
// xxxxxxxx:.           ..                  ;xxxxxxxxxxxxxxxx:                  ..            ;dxxxxxxx
// xxxxxxxxo'           ''                  'oxxxxxxxxxxxxxxd,                  .'           .lxxxxxxxx
// xxxxxxxxxc.          ;,                  .lxxxxxxxxxxxxxxo.                  ';.         .cxxxxxxxxx
// xxxxxxxxxxc.        .c,                  .:xxxxxxxxxxxxxxc.                  'c.        .cdxxxxxxxxx
// xxxxxxxxxxxl'       'l,       ..          ,dxxxxxxxxxxxxd;          ..       'l,       'lxxxxxxxxxxx
// xxxxxxxxxxxxd:.     ;o,       .'          .oxxxxxxxxxxxxo'          ..       'o:.    .:dxxxxxxxxxxxx
// xxxxxxxxxxxxxxd:.  .cd,       .;.         .cxxxxxxxxxxxxl.         .,'       'ol.  .:oxxxxxxxxxxxxxx
// xxxxxxxxxxxxxxxxo:.,od,       .:.          ;xxxxxxxxxxxx:          .:'       'oo,.:oxxxxxxxxxxxxxxxx
// xxxxxxxxxxxxxxxxxxdodd,       .l,          'dxxxxxxxxxxd,          'l'       'oxodxxxxxxxxxxxxxxxxxx
// xxxxxxxxxxxxxxxxxxxxxd;       .l:.         .lxxxxxxxxxxo.          :o'       ,dxxxxxxxxxxxxxxxxxxxxx
// xxxxxxxxxxxxxxxxxxxxxxd:.     .ol.         .:xxxxxxxxxxc.         .co'     .:oxxxxxxxxxxxxxxxxxxxxxx
// xxxxxxxxxxxxxxxxxxxxxxxxd:.   .oo'          ;dxxxxxxxxd;          .oo'   .:oxxxxxxxxxxxxxxxxxxxxxxxx
// xxxxxxxxxxxxxxxxxxxxxxxxxxo:. .od;          'oxxxxxxxxo'          ,do' .:oxxxxxxxxxxxxxxxxxxxxxxxxxx
// xxxxxxxxxxxxxxxxxxxxxxxxxxxxd::oxc.         .cxxxxxxxxl.         .:xd::oxxxxxxxxxxxxxxxxxxxxxxxxxxxx
// xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxl.          ;xxxxxxxx:.         .lxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
// xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxd;          'dxxxxxxd,          ,dxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
// xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxd:.        .lxxxxxxo.        .:oxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
// xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxd:.      .cxxxxxxc.      .:oxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
// xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxo:.     ;dxxxxd;     .:oxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
// xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxd:.   'oxxxxo'   .:oxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
// xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxo:. .cxxxxl. .:oxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
// xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxo:'cxxxxc,:oxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
// xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxddxxxxddxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
//
// MEGAMI https://www.megami.io/

pragma solidity ^0.8.7;

import "./interfaces/IERC5192.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";

contract MEGAMIMovieSBT is ERC721, IERC5192, Ownable {
    using ECDSA for bytes32;
  
    /**
     * @dev Price of the MEGAMIMovieSBT token
     */
    uint256 public tokenPrice = 0.05 ether;

    /**
     * @dev Token ID used in the next mint.
     */ 
    uint256 public nextTokenId = 0;

    /**
     * @dev Total number of the available MEGAMIMoviewSBT tokens.
     */ 
    uint256 public totalSupply = 0;

    /**
     * @dev Map to manage the tokenUri for each token id.
     */
    mapping(uint256 => string) private tokenURIs;    

    /**
     * @dev Constractor of MEGAMIMovie contract.
     */
    constructor (address fundManagerContractAddress) ERC721("MEGAMIMovieSBT", "MMSBT") {
        fundManager = fundManagerContractAddress;
    }

    /**
     * @dev Address of the fund manager contract
     */
    address private fundManager;

    /**
     * @dev Address creating a signature used by mint
     */
    address public uriSigner;

    /**
     * @dev Mint MEGAMIMovieSBT token
     * @param _tokenURI The token URI used by the minted token
     */
    function mint(string calldata _tokenURI, bytes calldata signature) external payable {
        // Check if correct amount of eth is sent
        require(msg.value == tokenPrice, "Invalid amount of eth.");

        // verify tokenURL using a signature
        require(
            uriSigner ==
                keccak256(
                    abi.encodePacked(
                        "\x19Ethereum Signed Message:\n32",
                        keccak256(bytes(_tokenURI))
                    )
                ).recover(signature), "invalid signer");

        unchecked { ++totalSupply; }

        tokenURIs[nextTokenId] = _tokenURI;
        _mint(msg.sender, nextTokenId);

        // Notify this token is locked
        emit Locked(nextTokenId);

        unchecked { ++nextTokenId; }
    }

    /**
     * @dev Mint MEGAMIMovieSBT token
     * @param _tokenURI The token URI used by the minted token
     */
    function teamMint(string calldata _tokenURI, address _to) external onlyOwner {
        unchecked { ++totalSupply; }

        tokenURIs[nextTokenId] = _tokenURI;
        _mint(_to, nextTokenId);

        // Notify this token is locked
        emit Locked(nextTokenId);

        unchecked { ++nextTokenId; }
    }    

    /**
     * @dev Burn MEGAMIMovieSBT token. Only owner of the token can burn.
     * @param _tokenId The token Id being burned
     */
    function burn(uint256 _tokenId) external {
        require(msg.sender == ownerOf(_tokenId), "Only owner of the token can burn");

        unchecked { --totalSupply; }

        _burn(_tokenId);
    }


    /**
     * @dev Return if this token is locked or not. Since this token is SBT, it always returns true.
     * @param _tokenId The token Id being checked
     */
    function locked(uint256 _tokenId) external view returns (bool) {
        require(_exists(_tokenId), "token doesn't exist");

        return true;
    }

    /**
     * @dev Set a new price of MEGAMIMoviewSBT token
     * @param _newPrice New price of MEGAMIMoviewSBT token
     */
    function setTokenPrice(uint256 _newPrice) external onlyOwner {
        tokenPrice = _newPrice;
    }

    /**
     * @dev Set a new address creating a signature used by mint
     * @param _newAddress New address
     */
    function setUriSigner(address _newAddress) external onlyOwner {
        uriSigner = _newAddress;
    }

    /**
     * @dev Return TokenURI associated to the tokenId
     * @param _tokenId The token Id used for returning tokenURI
     */
    function tokenURI(uint256 _tokenId) public view override returns (string memory) {
        require(_exists(_tokenId), "URI query for nonexistent token");

        return tokenURIs[_tokenId];
    }

    /**
     * @dev Set a new tokenURI to the existing token
     * @param _tokenId The token Id of the token being updated
     * @param _tokenURI The token URI being set to the specified token
     */
    function setTokenURI(uint256 _tokenId, string calldata _tokenURI) external onlyOwner {
        require(_exists(_tokenId), "token doesn't exist");

        tokenURIs[_tokenId] = _tokenURI;
    }

    // Make the token soul bound by disabling the setApproval and transfer

    function approve(address, uint256) public virtual override {
        revert("SBT isn't transferable");
    }

    function setApprovalForAll(address, bool) public virtual override {
        revert("SBT isn't transferable");
    }

    function _beforeTokenTransfer(address from, address to, uint256, uint256) internal pure override {
        require(from == address(0) || to == address(0), "SBT isn't transferable.");
    }

    // Fund management
    /**
     * @dev Return the address of the fund manager contarct.
     */
    function getFundManagerContract() external view returns (address) {
        return fundManager;
    }

    /**
     * @dev Set the address of the fund manager contract.
     * @param contractAddr Address of the contract managing funds.
     */
    function setFundManagerContract(address contractAddr)
        external
        onlyOwner
    {
        require(contractAddr != address(0), "invalid address");
        fundManager = contractAddr;
    }     

    /**
     * @dev Move all of funds to the fund manager contract.
     */
    function moveFundToManager() external onlyOwner {
        require(fundManager != address(0), "fundManager shouldn't be 0");

        (bool sent, ) = fundManager.call{value: address(this).balance}("");
        require(sent, "failed to move fund to FundManager contract");
    }

    /**
     * @dev Allow owner to send funds directly to recipient. This is for emergency purpose and use moveFundToManager for regular withdraw.
     * @param recipient The address of the recipinet.
     */
    function emergencyWithdraw(address recipient) external onlyOwner {
        require(recipient != address(0), "recipient shouldn't be 0");

        (bool sent, ) = recipient.call{value: address(this).balance}("");
        require(sent, "failed to withdraw");
    }

    /**
     * @dev ERC20s should not be sent to this contract, but if someone does, it's nice to be able to recover them.
     *      Copied from ForgottenRunesWarriorsGuild. Thank you dotta ;)
     * @param token IERC20 the token address
     * @param amount uint256 the amount to send
     */
    function forwardERC20s(IERC20 token, uint256 amount) external onlyOwner {
        token.transfer(msg.sender, amount);
    }

    /**
     * @dev For receiving fund in case someone try to send it.
     */
    receive() external payable {}

    /**
     * @dev See {IERC165-supportsInterface}.
     */
    function supportsInterface(bytes4 interfaceId) 
        public 
        view 
        virtual 
        override(ERC721) 
        returns (bool) 
    {
        return 
            interfaceId == type(IERC5192).interfaceId ||
            super.supportsInterface(interfaceId);
    }    
}