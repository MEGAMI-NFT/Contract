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

    //Starting DA time (seconds). To convert into readable time https://www.unixtimestamp.com/
    uint256 public DA_STARTING_TIMESTAMP;
    uint256 public DA_ENDING_TIMESTAMP;

    //The final auction price.
    uint256 public DA_FINAL_PRICE;

    //Starting at 2 ether
    uint256 public DA_STARTING_PRICE = 0.5 ether;

    //Ending at 0.1 ether
    uint256 public DA_ENDING_PRICE = 0.1 ether;

    //Decrease by 0.05 every frequency.
    uint256 public DA_DECREMENT = 0.05 ether;

    //decrement price every 300 seconds (5 minutes).
    uint256 public DA_DECREMENT_FREQUENCY = 300;

    //Wave
    uint256 public WAVE_TIME_INTERVAL = 60 * 60 * 2; // 2 hour interval
    uint256 public DA_TIME_RANGE = 60 * 60 * 24; // 1 day
    uint256 public TOTAL_WAVE = 10;
    uint256 public WAVE_TOTAL_MINT_RANGE = 10000;
    uint256 private WAVE_MINT_RANGE = WAVE_TOTAL_MINT_RANGE / TOTAL_WAVE;

    MEGAMI public MEGAMI_TOKEN;

    //ML signer for verification
    address private mlSigner;

    mapping(address => bool) public userToHasMintedPublicML;

    //Token to token price data
    mapping(address => uint128[]) public userToTokenBatchPriceData;

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

        if (DA_FINAL_PRICE > 0) return DA_FINAL_PRICE;
        //Seconds since we started
        uint256 timeSinceStart = currentTimestamp - waveDAStartedTimestamp;

        //How many decrements should've happened since that time
        uint256 decrementsSinceStart = timeSinceStart / DA_DECREMENT_FREQUENCY;

        //How much eth to remove
        uint256 totalDecrement = decrementsSinceStart * DA_DECREMENT;

        //If how much we want to reduce is greater or equal to the range, return the lowest value
        if (totalDecrement >= DA_STARTING_PRICE - DA_ENDING_PRICE) {
            return DA_ENDING_PRICE;
        }

        //If not, return the starting price minus the decrement.
        return DA_STARTING_PRICE - totalDecrement;
    }

    function getWave(uint256 tokenId) public view returns (uint256) {
        return tokenId / (WAVE_TOTAL_MINT_RANGE / TOTAL_WAVE);
    }

    function getLatestWave() public view returns (uint256) {
        return (block.timestamp - DA_STARTING_TIMESTAMP) / WAVE_TIME_INTERVAL;
    }

    function mintDA(bytes calldata signature, uint256 tokenId) public payable callerIsUser {
        require(DA_ACTIVE == true, "DA isnt active");
        
        //Require DA started
        require(
            block.timestamp >= DA_STARTING_TIMESTAMP,
            "DA has not started!"
        );

        require(block.timestamp <= DA_ENDING_TIMESTAMP, "DA is finished");

        uint256 _currentPrice = currentPrice(tokenId);

        require(msg.value >= _currentPrice, "Did not send enough eth.");

        require(
            !userToHasMintedPublicML[msg.sender],
            "Can only mint once during public ML!"
        );

        
        require(
            mlSigner ==
                keccak256(
                    abi.encodePacked(
                        "\x19Ethereum Signed Message:\n32",
                        bytes32(uint256(uint160(msg.sender)))
                    )
                ).recover(signature),
            "Signer address mismatch."
        );

        // WAVE Requires
        require(tokenId <= WAVE_TOTAL_MINT_RANGE, "total mint limit");
        //require(tokenId > WAVE_MINT_RANGE * (WAVE - 1), "wave mint yet");
        //require(tokenId <= WAVE_MINT_RANGE * WAVE, "wave mint limit");

        userToTokenBatchPriceData[msg.sender].push(uint128(msg.value));
        userToHasMintedPublicML[msg.sender] = true;

        MEGAMI_TOKEN.mint(tokenId, msg.sender);
    }

    function setStart(uint256 startTime) public onlyOwner {
        DA_STARTING_TIMESTAMP = startTime;
        DA_ENDING_TIMESTAMP = DA_STARTING_TIMESTAMP + DA_TIME_RANGE;
    }

    //VARIABLES THAT NEED TO BE SET BEFORE MINT(pls remove comment when uploading to mainet)
    function setSigners(address signer) external onlyOwner {
        mlSigner = signer;
    }

    function setDutchActionActive(bool daActive) public onlyOwner {
        DA_ACTIVE = daActive;
    }
}
