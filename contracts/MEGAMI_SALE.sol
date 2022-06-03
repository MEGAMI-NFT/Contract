//SPDX-License-Identifier: MIT
pragma solidity ^0.8.7;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/utils/Strings.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "./MEGAMI.sol";

contract MEGAMI_Sale is Ownable {
    using ECDSA for bytes32;

    //DA active variable
    bool public DA_ACTIVE = false; 
    
    //Public sale flag
    bool public PUBLIC_SALE = false;
    uint256 public PUBLIC_SALE_PRICE = 0.1 ether;

    //Starting DA time (seconds). To convert into readable time https://www.unixtimestamp.com/
    uint256 public DA_STARTING_TIMESTAMP;
    uint256 public DA_LENGTH = 48 * 60 * 60; // DA finishes after 48 hours
    uint256 public DA_ENDING_TIMESTAMP;

    // Starting price of DA
    uint256 public DA_STARTING_PRICE_ORIGIN    = 10 ether;
    uint256 public DA_STARTING_PRICE_ALTER     = 5 ether;
    uint256 public DA_STARTING_PRICE_GENERATED = 0.2 ether;

    // Lowest price of DA
    uint256 public DA_LOWEST_PRICE = 0.08 ether;

    // Decrease amount every frequency. (Reaches the lowest price after 24 hours)
    uint256 public DA_DECREMENT_ORIGIN    = 0.21 ether; 
    uint256 public DA_DECREMENT_ALTER     = 0.1025 ether;
    uint256 public DA_DECREMENT_GENERATED = 0.0025 ether;

    // Decrement price every 1800 seconds (30 minutes).
    uint256 public DA_DECREMENT_FREQUENCY = 30 * 60;

    // Wave management
    uint256 public TOTAL_WAVE = 10;
    uint256 public TOTAL_SUPPLY = 10000;
    uint256 public WAVE_TIME_INTERVAL = 60 * 60 * 1; // Relese new wave every 1 hour
    uint256 private SUPPLY_PER_WAVE = TOTAL_SUPPLY / TOTAL_WAVE;

    MEGAMI public MEGAMI_TOKEN;

    //ML signer for verification
    address private mlSigner;

    mapping(address => uint256) public userToUsedMLs;

    modifier callerIsUser() {
        require(tx.origin == msg.sender, "The caller is another contract");
        _;
    }

    constructor(address MEGAMIContractAddress){
        MEGAMI_TOKEN = MEGAMI(payable(MEGAMIContractAddress));
    }

    function currentPrice(uint256 tokenId) public view returns (uint256) {
        uint256 currentTimestamp = block.timestamp;
        uint256 wave = getWave(tokenId);
        uint256 waveDAStartedTimestamp = DA_STARTING_TIMESTAMP + (WAVE_TIME_INTERVAL * wave);

        require(
            currentTimestamp >= waveDAStartedTimestamp,
            "DA has not started!"
        );

        //Seconds since we started
        uint256 timeSinceStart = currentTimestamp - waveDAStartedTimestamp;

        //How many decrements should've happened since that time
        uint256 decrementsSinceStart = timeSinceStart / DA_DECREMENT_FREQUENCY;

        // Check the type of Megami and setting staring price and price drop
        uint256 startingPrice = DA_STARTING_PRICE_GENERATED;
        uint256 priceDecrement = DA_DECREMENT_GENERATED;
        if(tokenId % SUPPLY_PER_WAVE <= 2 + getNumberOfAlters(wave)) { // Origin is always 3 (0,1,2)
            if(tokenId % SUPPLY_PER_WAVE <= 2) {
                // Origin
                startingPrice = DA_STARTING_PRICE_ORIGIN;
                priceDecrement = DA_DECREMENT_ORIGIN;
            } else {
                // Alter
                startingPrice = DA_STARTING_PRICE_ALTER;
                priceDecrement = DA_DECREMENT_ALTER;
            }
        }

        // How much eth to remove
        uint256 totalDecrement = decrementsSinceStart * priceDecrement;

        //If how much we want to reduce is greater or equal to the range, return the lowest value
        if (totalDecrement >= startingPrice - DA_LOWEST_PRICE) {
            return DA_LOWEST_PRICE;
        }

        //If not, return the starting price minus the decrement.
        return startingPrice - totalDecrement;
    }

    function getWave(uint256 tokenId) public view returns (uint256) {
        return tokenId / SUPPLY_PER_WAVE;
    }

    function mintDA(bytes calldata signature, uint8 mlSpots, uint256 tokenId) public payable callerIsUser {
        require(DA_ACTIVE == true, "DA isnt active");
        
        //Require DA started
        require(
            block.timestamp >= DA_STARTING_TIMESTAMP,
            "DA has not started!"
        );

        require(block.timestamp <= DA_ENDING_TIMESTAMP, "DA is finished");

        uint256 _currentPrice = currentPrice(tokenId);

        require(msg.value >= _currentPrice, "Did not send enough eth.");

        // 1 byte shifted address + number of MLs
        uint256 message = uint256(uint160(msg.sender)) * 2 ** 8 + mlSpots;
        
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

        // WAVE Requires
        require(tokenId <= TOTAL_SUPPLY, "total mint limit");
        require(getWave(tokenId) <= (block.timestamp - DA_STARTING_TIMESTAMP) / WAVE_TIME_INTERVAL, "wave mint yet");

        // Increment used ML spots
        userToUsedMLs[msg.sender] += 1;

        MEGAMI_TOKEN.mint(tokenId, msg.sender);
    }

    function public_mint(uint256 tokenId) public payable callerIsUser {
        require(PUBLIC_SALE, "Public sale isnt active");
        require(msg.value >= PUBLIC_SALE_PRICE, "Did not send enough eth.");

        MEGAMI_TOKEN.mint(tokenId, msg.sender);
    }

    function mintTeam(address recipient, uint256[] calldata tokenIds) external onlyOwner {
        require(address(recipient) != address(0), 'recipient address is necessary');
        uint256 count = tokenIds.length;
        for (uint256 i = 0; i < count;) {
            MEGAMI_TOKEN.mint(tokenIds[i], recipient);
            unchecked { ++i; }
        }
    }

    function setStart(uint256 startTime) public onlyOwner {
        DA_STARTING_TIMESTAMP = startTime;
        DA_ENDING_TIMESTAMP = DA_STARTING_TIMESTAMP + DA_LENGTH;
    }

    function getUnmintedTokenIds() external view returns (uint256[] memory) {
        return MEGAMI_TOKEN.getUnmintedTokenIds();
    }

    //VARIABLES THAT NEED TO BE SET BEFORE MINT(pls remove comment when uploading to mainet)
    function setSigner(address signer) external onlyOwner {
        mlSigner = signer;
    }

    function setDutchActionActive(bool daActive) public onlyOwner {
        DA_ACTIVE = daActive;
    }

    function setPublicSaleActive(bool publicActive) public onlyOwner {
        PUBLIC_SALE = publicActive;
    }
    
    function getNumberOfAlters(uint256 wave) private pure returns (uint256) {
        // Since there are 24 alters, we need to release an extra in 4 waves
        if(wave >= 4 && wave <= 7) {
            return 3;
        }
        return 2;
    }
}
