//SPDX-License-Identifier: MIT
pragma solidity ^0.8.7;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/utils/Strings.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "./interfaces/IMEGAMI.sol";

/**
 * @dev Implementation of the MEGAMI's sales contract.
 */
contract MEGAMISales is ReentrancyGuard, Ownable {
    using ECDSA for bytes32;

    /**
     * @notice Total supply of MEGAMI tokens.
     */
    uint256 public constant TOTAL_SUPPLY = 10000;

    /**
     * @notice Length of the auction (seconds)
     */
    uint256 public constant AUCTION_LENGTH = 48 * 60 * 60; // DA finishes after 48 hours

    /**
     * @notice Start price of Origins in the auction.
     */ 
    uint256 public constant AUCTION_STARTING_PRICE_ORIGIN    = 10 ether;

    /**
     * @notice Start price of Alters in the auction.
     */ 
    uint256 public constant AUCTION_STARTING_PRICE_ALTER     = 5 ether;

    /**
     * @notice Start price of Generateds in the auction.
     */ 
    uint256 public constant AUCTION_STARTING_PRICE_GENERATED = 0.2 ether;

    /**
     * @notice Lowest price of MEGAMI tokens in the auction.
     */
    uint256 public constant AUCTION_LOWEST_PRICE = 0.08 ether;

    /**
     * @notice Price drop unit of Origins in the auction. Price reaches the lowest price after 24 hours.
     */
    uint256 public constant AUCTION_PRICE_DROP_UNIT_ORIGIN    = 0.21 ether; 

    /**
     * @notice Price drop unit of Alters in the auction. Price reaches the lowest price after 24 hours.
     */
    uint256 public constant AUCTION_PRICE_DROP_UNIT_ALTER     = 0.1025 ether;

    /**
     * @notice Price drop unit of Generateds in the auction. Price reaches the lowest price after 24 hours.
     */
    uint256 public constant AUCTION_PRICE_DROP_UNIT_GENERATED = 0.0025 ether;

    /**
     * @notice Price drop frequency (seconds).
     */
    uint256 public constant AUCTION_PRICE_DROP_FREQUENCY = 30 * 60;

    /**
     * @notice Total release waves. 
     */
    uint256 public constant TOTAL_RELEASE_WAVES = 5;

    /**
     * @notice Number of Origins in a wave.
     */
    uint256 public constant NUMBER_OF_ORIGINS_IN_WAVE = 6;  // 30 origins divided by 5 waves

    /**
     * @notice Release interval (seconds.)
     */
    uint256 public constant RELEASE_WAVE_TIME_INTERVAL = 60 * 60 * 1; // Relese new wave every 1 hour

    /**
     * @notice The status of the acution. 
     */
    bool public auctionActive = false; 

    /**
     * @notice Starting time (seconds) of the auction.
     * @dev To convert into readable time https://www.unixtimestamp.com/
     */
    uint256 public auctionStartingTimestamp;

    /**
     * @notice The status of the public sale. 
     */
    bool public publicSaleActive = false;

    /**
     * @notice The price of MEGAMI tokens in the public sale. 
     */
    uint256 public publicSalePrice = 0.1 ether;

    /**
     * @dev Address of the fund manager contract.
     */
    address private fundManager;

    /**
     * @dev Address of the MEGAMI token contract.
     */
    IMEGAMI private megamiToken;
    
    /**
     * @dev Signer of the ML management signature.
     */
    address private mlSigner;

    /**
     * @dev Map to manage consumed ML spots per minter.
     */
    mapping(address => uint256) private userToUsedMLs;

    /**
     * @dev Constractor of MEGAMI's sales contract. Setting the MEGAMI token and fund manager.
     * @param megamiContractAddress Address of the MEGAMI token contract.
     * @param fundManagerContractAddress Address of the contract managing funds.
     */
    constructor(address megamiContractAddress, address fundManagerContractAddress){
        megamiToken = IMEGAMI(payable(megamiContractAddress));
        fundManager = payable(fundManagerContractAddress);
    }

    /**
     * @dev The modifier allowing the function access only for real humans.
     */
    modifier callerIsUser() {
        require(tx.origin == msg.sender, "The caller is another contract");
        _;
    }

    /**
     * @dev For receiving fund in case someone try to send it.
     */
    receive() external payable {}
    
    /**
     * @dev Set the address of the signer being used for validating Mintlist signatures.
     */
    function setSigner(address signer) external onlyOwner {
        mlSigner = signer;
    }

    /**
     * @dev Mint the specified MEGAMI token with auction price. 
     * @param signature Signature being used for validating the Mintlist spots of the minter.
     * @param mlSpots Total number of mintlist spots allocated to the minter.
     * @param tokenId Token ID being minted.
     */
    function mintDA(bytes calldata signature, uint8 mlSpots, uint256 tokenId) external payable callerIsUser nonReentrant {
        require(auctionActive, "DA isnt active");
        
        //Require DA started
        require(
            block.timestamp >= auctionStartingTimestamp,
            "DA has not started!"
        );        

        require(block.timestamp <= getAuctionEndTime(), "DA is finished");

        // Validate Mintlist
        // Message format is 1 byte shifted address + number of MLs (1 byte)
        uint256 message = (uint256(uint160(msg.sender)) << 8) + mlSpots;
        
        require(
            mlSigner ==
                keccak256(
                    abi.encodePacked(
                        "\x19Ethereum Signed Message:\n32",
                        bytes32(message)
                    )
                ).recover(signature),
            "Signer address mismatch."
        );

        // Check number of ML spots
        require(
            userToUsedMLs[msg.sender] < mlSpots,
            "All ML spots have been consumed"
        );

        // Validate token ID
        require(tokenId < TOTAL_SUPPLY, "total mint limit");

        // Get current mint price
        uint256 _currentPrice = currentPrice(tokenId);

        // Validate the paid amount
        require(msg.value >= _currentPrice, "Did not send enough eth.");

        // Send back overpaid amount if minter sent more than _currentPrice
        if (msg.value > _currentPrice) {
            (bool sent, ) = msg.sender.call{value: msg.value - _currentPrice}("");
            require(sent, "failed to send back fund");
        }

        // Increment used ML spots
        userToUsedMLs[msg.sender] += 1;

        megamiToken.mint(tokenId, msg.sender);
    }

    /**
     * @dev Set the price of the public sale.
     * @param newPrice The new price of the public sale.
     */
    function setPublicSalePrice(uint256 newPrice) external onlyOwner {
        publicSalePrice = newPrice;
    }

    /**
     * @dev Mint the specified MEGAMI token with public price.  
     * @param tokenId Token ID being minted.
     */
    function mintPublic(uint256 tokenId) external payable callerIsUser nonReentrant {
        require(publicSaleActive, "Public sale isn't active");
        require(msg.value == publicSalePrice, "Incorrect amount of eth.");

        megamiToken.mint(tokenId, msg.sender);
    }

    /**
     * @dev Mint the specified MEGAMI tokens and send to the specified recipient. Mainly used for giving Free MEGAMIs.
     * @param recipient Recipient whom minted tokens are transfered to.
     * @param tokenIds Token IDs being minted.
     */
    function mintTeam(address recipient, uint256[] calldata tokenIds) external onlyOwner {
        require(address(recipient) != address(0), "recipient address is necessary");
        uint256 count = tokenIds.length;
        for (uint256 i = 0; i < count;) {
            megamiToken.mint(tokenIds[i], recipient);
            unchecked { ++i; }
        }
    }

    /**
     * @dev Set the active status of auction.
     */
    function setDutchActionActive(bool isActive) external onlyOwner {
        require(mlSigner != address(0), "Mintlist signer must be set before starting auction");
        auctionActive = isActive;
    }

    /**
     * @dev Set the active status of public sale.
     */
    function setPublicSaleActive(bool isActive) external onlyOwner {
        publicSaleActive = isActive;
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
     * @dev Allow owner to send funds directly to recipient. This is for emergency purpose and use moveFundToManager for regular withdraw.
     * @param recipient The address of the recipinet.
     */
    function emergencyWithdraw(address recipient) external onlyOwner {
        require(recipient != address(0), "recipient shouldn't be 0");

        (bool sent, ) = recipient.call{value: address(this).balance}("");
        require(sent, "failed to withdraw");
    }

    /**
     * @dev Move all of funds to the fund manager contract.
     */
    function moveFundToManager() external onlyOwner {
        (bool sent, ) = fundManager.call{value: address(this).balance}("");
        require(sent, "failed to move fund to FundManager contract");
    }

    /**
     * @dev Return the current price of the specified token.
     * @param tokenId Token ID the price is being returned for.
     */
    function currentPrice(uint256 tokenId) public view returns (uint256) {
        uint256 currentTimestamp = block.timestamp;
        uint256 wave = getWave(tokenId);
        uint256 waveDAStartedTimestamp = auctionStartingTimestamp + (RELEASE_WAVE_TIME_INTERVAL * wave);

        require(
            currentTimestamp >= waveDAStartedTimestamp,
            "wave mint yet"
        );

        //Seconds since we started
        uint256 timeSinceStart = currentTimestamp - waveDAStartedTimestamp;

        //How many decrements should've happened since that time
        uint256 decrementsSinceStart = timeSinceStart / AUCTION_PRICE_DROP_FREQUENCY;

        // Check the type of Megami and setting staring price and price drop
        uint256 startingPrice = AUCTION_STARTING_PRICE_GENERATED;
        uint256 priceDecrement = AUCTION_PRICE_DROP_UNIT_GENERATED;

        uint256 sequenceIdInWave = tokenId % getSupplyPerWave();
        if(sequenceIdInWave < NUMBER_OF_ORIGINS_IN_WAVE + getNumberOfAlters(wave)) {
            if(sequenceIdInWave < NUMBER_OF_ORIGINS_IN_WAVE) {
                // Origin
                startingPrice = AUCTION_STARTING_PRICE_ORIGIN;
                priceDecrement = AUCTION_PRICE_DROP_UNIT_ORIGIN;
            } else {
                // Alter
                startingPrice = AUCTION_STARTING_PRICE_ALTER;
                priceDecrement = AUCTION_PRICE_DROP_UNIT_ALTER;
            }
        }

        // How much eth to remove
        uint256 totalDecrement = decrementsSinceStart * priceDecrement;

        //If how much we want to reduce is greater or equal to the range, return the lowest value
        if (totalDecrement >= startingPrice - AUCTION_LOWEST_PRICE) {
            return AUCTION_LOWEST_PRICE;
        }

        //If not, return the starting price minus the decrement.
        return startingPrice - totalDecrement;
    }

    /**
     * @dev Return the wave the specified token is being released.
     * @param tokenId Token ID the release wave is being returned for.
     */
    function getWave(uint256 tokenId) public pure returns (uint256) {
        return tokenId / getSupplyPerWave();
    }

    /**
     * @dev Set the start time of the auction. 
     * @param startTime Start time in unix timestamp format.
     */
    function setAuctionStartTime(uint256 startTime) public onlyOwner {
        auctionStartingTimestamp = startTime;
    }

    /**
     * @dev Returns the end time of the auction in unix timestamp format.
     */
    function getAuctionEndTime() public view returns (uint256) {
        return auctionStartingTimestamp + AUCTION_LENGTH;
    }
    
    /**
     * @dev Do nothing for disable renouncing ownership.
     */ 
    function renounceOwnership() public override onlyOwner {}     

    /**
     * @dev Returns the release waves where extra Alter are released. 
     *      Since there are 24 Alters and we can't evenly release them in each release wave, we need to release extra Alter in some waves.
     * @param wave Relase wave that this function checks if extra Alter is relased or not.
     */
    function getNumberOfAlters(uint256 wave) private pure returns (uint256) {
        // Since there are only 24 alters, it runs short of them in the 5th wave.
        return wave == 4 ? 4 : 5;
    }

    /**
     * @dev Return the amount of tokens being released in each release wave.
     */
    function getSupplyPerWave() private pure returns (uint256) {
        return TOTAL_SUPPLY / TOTAL_RELEASE_WAVES;
    }
}
