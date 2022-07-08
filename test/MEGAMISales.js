const { AddressZero } = require('@ethersproject/constants');
const { parseEther } = require('@ethersproject/units');
const { expect } = require("chai");
const { waffle } = require("hardhat");
const Web3 = require('web3');
const web3 = new Web3(Web3.givenProvider);

const provider = waffle.provider;

// Test only wallet
const SIGNER_ADDRESS = "0x9A1D4e1150759DB4B2d02aC3c08335a2Ac9418fe";
const SIGNER_SECRETKEY = "0cddb0e8ba05a84e45c5081775cee5eaff59aecf9e3f7c1e775d4419189d1590";
const signer = web3.eth.accounts.privateKeyToAccount(SIGNER_SECRETKEY);

async function generateSignature(address, num_of_ml) {
    // Construct message to sign.
    hex = num_of_ml.toString(16);
    if (hex.length < 2) {
        hex = "0" + hex;
    }
    let message = `0x0000000000000000000000${address.substring(2)}${hex}`;

    // Sign the message, update the `signedMessages` dict
    // storing only the `signature` value returned from .sign()
    let { signature } = signer.sign(message);
    return signature;
}

async function mintUntilNonTeamLimit(auction, owner) {
    // Mint until 9550 (max of non team mint)
    const mintUnit = 100;
    for(i = 0; i < 9500; i += mintUnit ) {
        const ids = [...Array(mintUnit).keys()].map(x => x + i + 1);
        await expect(auction.connect(owner).mintTeam(minter.address, ids)).to.be.not.reverted;
        expect(await auction.totalSold()).to.equal(i+mintUnit);
    }
    const ids = [...Array(50).keys()].map(x => x + 9501);
    await expect(auction.connect(owner).mintTeam(owner.address, ids)).to.be.not.reverted;
    expect(await auction.totalSold()).to.equal(9550);
}

describe("MEGAMISales", function () {
    let auction;
    let megamiContract;

    beforeEach(async function () {
        [owner, minter, other] = await ethers.getSigners();

        // Setup FundManager
        const FundManagerFactory = await ethers.getContractFactory('FundManager');
        fundManagerContract = await FundManagerFactory.deploy();

        // Setup Megami
        const MegamiFactory = await ethers.getContractFactory('MEGAMI');
        megamiContract = await MegamiFactory.deploy(fundManagerContract.address);

        const MegamiSalesFactory = await hre.ethers.getContractFactory("MEGAMISales");
        auction = await MegamiSalesFactory.deploy(megamiContract.address, fundManagerContract.address);

        // Setup Megami Sale as a SalesContract
        await megamiContract.setSalesContract(auction.address);
    });
    
    // --- getWave ---
    it("can get corresponding wave based on tokenId", async function () {
        cases = [
            // tokenId, expected wave
            [1, 0],
            [2000, 0],
            [2001, 1],
            [4000, 1],
            [4001, 2],
            [6000, 2],
            [6001, 3],
            [8000, 3],
            [8001, 4],
            [10000, 4]
        ]

        for(i = 0; i < cases.length; i++ ) {
            expect((await auction.getWave(cases[i][0]))).to.equal(cases[i][1]); 
        }
    });

    // --- Current price ---
    it("can get starting price right after the DA starts", async function () {
        now = (await provider.getBlock(await provider.getBlockNumber())).timestamp;

        cases = [
            // wave, tokenId, expected starting price
            // Wave 0
            [0, 1,        "10"], // Origin start
            [0, 6,        "10"], // Origin end
            [0, 7,         "5"], // Alter start   
            [0, 11,        "5"], // Alter end
            [0, 12,      "0.2"], // Genearted start
            [0, 2000,    "0.2"], // Generated end
            // Wave 1
            [1, 2001,    "10"], // Origin start
            [1, 2006,    "10"], // Origin end
            [1, 2007,     "5"], // Alter start
            [1, 2011,     "5"], // Alter end
            [1, 2012,   "0.2"], // Genearted start
            [1, 4000,   "0.2"], // Generated end            
            // Wave 2
            [2, 4001,    "10"], // Origin start
            [2, 4006,    "10"], // Origin end
            [2, 4007,     "5"], // Alter start
            [2, 4011,     "5"], // Alter end
            [2, 4012,   "0.2"], // Genearted start
            [2, 6000,   "0.2"], // Generated end
            // Wave 3
            [3, 6001,    "10"], // Origin start
            [3, 6006,    "10"], // Origin end
            [3, 6007,     "5"], // Alter start
            [3, 6011,     "5"], // Alter end
            [3, 6012,   "0.2"], // Genearted start
            [3, 8000,   "0.2"], // Generated end
            // Wave 4
            [4, 8001,    "10"], // Origin start
            [4, 8006,    "10"], // Origin end
            [4, 8007,     "5"], // Alter start
            [4, 8010,     "5"], // Alter end
            [4, 8011,   "0.2"], // Genearted start
            [4, 10000,  "0.2"], // Generated end    
        ]

        for(i = 0; i < cases.length; i++ ) {
            // DA started 1 sec
            await auction.setAuctionStartTime(now - 1 - (60 * 60 * cases[i][0]));
            
            // Start Price
            expect((await auction.currentPrice(cases[i][1]))).to.equal(parseEther(cases[i][2])); 
        }
    });  

    it("can get decreased price after price drops - origin", async function () {
        now = (await provider.getBlock(await provider.getBlockNumber())).timestamp;

        cases = [
            // past minutes, expected current price
            [0,    "10"],
            [30,   "9.79"], 
            [60,   "9.58"], 
            [90,   "9.37"], 
            [120,  "9.16"], 
            [1380, "0.34"], 
            [1410, "0.13"],
            [1440, "0.08"], 
            [1470, "0.08"]
        ];
        for(i = 0; i < cases.length; i++ ) {
            // After 5 * i min and 1 sec
            await auction.setAuctionStartTime(now - 1 - (60 * cases[i][0])); 

            // Start Price - 0.05 * i
            expect((await auction.currentPrice(1))).to.equal(parseEther(cases[i][1])); 
        };
    });

    it("can get decreased price after price drops - alter", async function () {
        now = (await provider.getBlock(await provider.getBlockNumber())).timestamp;

        cases = [
            // past minutes, expected current price
            [0,    "5"],
            [30,   "4.8975"], 
            [60,   "4.795"], 
            [90,   "4.6925"], 
            [120,  "4.59"], 
            [1380, "0.285"], 
            [1410, "0.1825"],
            [1440, "0.08"], 
            [1470, "0.08"]
        ];
        for(i = 0; i < cases.length; i++ ) {
            // After 5 * i min and 1 sec
            await auction.setAuctionStartTime(now - 1 - (60 * cases[i][0])); 

            // Start Price - 0.05 * i
            expect((await auction.currentPrice(7))).to.equal(parseEther(cases[i][1])); 
        };
    });

    it("can get decreased price after price drops - generated", async function () {
        now = (await provider.getBlock(await provider.getBlockNumber())).timestamp;

        cases = [
            // past minutes, expected current price
            [0,    "0.2"],
            [30,   "0.1975"], 
            [60,   "0.195"], 
            [90,   "0.1925"], 
            [120,  "0.19"], 
            [1380, "0.085"], 
            [1410, "0.0825"],
            [1440, "0.08"], 
            [1470, "0.08"]
        ];
        for(i = 0; i < cases.length; i++ ) {
            // After 5 * i min and 1 sec
            await auction.setAuctionStartTime(now - 1 - (60 * cases[i][0])); 

            // Start Price - 0.05 * i
            expect((await auction.currentPrice(12))).to.equal(parseEther(cases[i][1])); 
        };
    });

    it("can get the lowest price after last price drop", async function () {
        now = (await provider.getBlock(await provider.getBlockNumber())).timestamp;

        // After 25 hours and 1 sec
        await auction.setAuctionStartTime(now - 1 - (60 * 60 * 25)); 

        // Price shouldn't be lower than the ending price
        expect((await auction.currentPrice(100))).to.equal(parseEther("0.08")); 
    }); 

    it("price can be managed independently in each wave", async function () {
        now = (await provider.getBlock(await provider.getBlockNumber())).timestamp;

        cases = [
            // tokenId, past minutes, expected current price
            [100,     0, "0.2"],    // wave 0 release
            [100,    60, "0.195"],  // wave 1 release
            [2100,   60, "0.2"],   
            [100,   120, "0.19"],   // wave 2 release
            [2100,  120, "0.195"], 
            [4100,  120, "0.2"],
            [100,   180, "0.185"],  // wave 3 release
            [2100,  180, "0.19"], 
            [4100,  180, "0.195"],
            [6100,  180, "0.2"],  
            [100,   240, "0.18"],   // wave 4 release
            [2100,  240, "0.185"], 
            [4100,  240, "0.19"],
            [6100,  240, "0.195"],            
            [8100,  240, "0.2"],
            [6100, 1650, "0.08"],   // 24.5 hours after releasing wave 3
            [9100, 1650, "0.0825"], // 23.5 hours after releasing wave 4
            [6100, 1710, "0.08"],   // 25.5 hours after releasing wave 3
            [9100, 1710, "0.08"],   // 24.5 hours after releasing wave 4           
        ];
        for(i = 0; i < cases.length; i++ ) {
            await auction.setAuctionStartTime(now - 1 - (60 * cases[i][1])); 
            expect((await auction.currentPrice(cases[i][0]))).to.equal(parseEther(cases[i][2])); 
        };
    }); 

    it("price shouldn't be returned before DA starts", async function () {
        now = (await provider.getBlock(await provider.getBlockNumber())).timestamp;

        // 10 sec before DA starts
        await auction.setAuctionStartTime(now + 10); 

        // Start Price
        await expect(auction.currentPrice(100)).to.be.revertedWith("wave mint yet");
    });  

    it("DA start time should be managed independently", async function () {
        now = (await provider.getBlock(await provider.getBlockNumber())).timestamp;

        cases = [
            // tokenId, past minutes, price returned
            [1,          0, true], 
            [2001,       0, false],
            [4001,       0, false], 
            [6001,       0, false], 
            [8001,       0, false],
            [1,          60, true], 
            [2001,       60, true],
            [4001,       60, false], 
            [6001,       60, false], 
            [8001,       60, false],
            [1,          120, true], 
            [2001,       120, true],
            [4001,       120, true], 
            [6001,       120, false], 
            [8001,       120, false],
            [1,          180, true], 
            [2001,       180, true],
            [4001,       180, true], 
            [6001,       180, true], 
            [8001,       180, false],    
            [1,          240, true], 
            [2001,       240, true],
            [4001,       240, true], 
            [6001,       240, true], 
            [8001,       240, true],                         
        ];
        for(i = 0; i < cases.length; i++ ) {
            // adjust the start time
            await auction.setAuctionStartTime(now - 1 - (60 * cases[i][1])); 
            if(cases[i][2]) {
                await expect(auction.currentPrice(cases[i][0])).to.be.not.reverted; 
            } else{
                await expect(auction.currentPrice(cases[i][0])).to.be.revertedWith("wave mint yet");
            }
        };
    });

    it("price shouldn't be returned if token id is invalid", async function () {
        now = (await provider.getBlock(await provider.getBlockNumber())).timestamp;

        // 10 sec before DA starts
        await auction.setAuctionStartTime(now - 240); // after wave 4 release

        // Token id should start from 1
        await expect(auction.currentPrice(0)).to.be.revertedWith("invalid token id");

        // token id should end at 10000
        await expect(auction.currentPrice(10001)).to.be.revertedWith("invalid token id");
    });  

    // --- mintDA ---
    it("auction is deactivated by default", async function () {
        expect(await auction.getDutchAuctionActive()).to.equal(false);
    });

    it("auction can't be activated without signer", async function () {
        await expect(auction.setDutchActionActive(true)).to.be.revertedWith("Mintlist signer must be set before starting auction");
    });    

    it("should be able to mint", async function () {
        expect(await auction.totalSold()).to.equal(0);

        now = (await provider.getBlock(await provider.getBlockNumber())).timestamp;

        // Set signer 
        await auction.setSigner(SIGNER_ADDRESS);

        // DA started 1 sec 
        await auction.setAuctionStartTime(now - 1);

        // Set DA active
        await auction.setDutchActionActive(true);
        
        // Mint token ID 100 with 1 mintlist spot
        const signature = await generateSignature(minter.address, 1);
        const tx = auction.connect(minter).mintDA(signature, 1, 100, {value: parseEther('0.2')});
        await expect(tx).to.emit(megamiContract, 'Transfer').withArgs(AddressZero, minter.address, 100);

        expect(await auction.totalSold()).to.equal(1);
    });

    it("DA mint should return overpaid amount if provided eth is more than current price", async function () {     
        now = (await provider.getBlock(await provider.getBlockNumber())).timestamp;

        // Set signer 
        await auction.setSigner(SIGNER_ADDRESS);

        // DA started 24 hours ago
        await auction.setAuctionStartTime(now - (24 * 60 * 60));

        // Set DA active
        await auction.setDutchActionActive(true);
        
        // Mint token ID 100 with 1 mintlist spot
        const signature = await generateSignature(minter.address, 1);
        const tx = auction.connect(minter).mintDA(signature, 1, 100, {value: parseEther('0.2')});
        await expect(tx).to.emit(megamiContract, 'Transfer').withArgs(AddressZero, minter.address, 100);

        // Minter should get charged only current price and get refunded the overpaid amount
        await expect(await tx).to.changeEtherBalance(minter, parseEther('-0.08'));
    }); 

    it("DA mint should fail because of wrong address", async function () {
        now = (await provider.getBlock(await provider.getBlockNumber())).timestamp;

        // Set signer 
        await auction.setSigner(SIGNER_ADDRESS);

        // DA started 1 sec 
        await auction.setAuctionStartTime(now - 1);

        // Set DA active
        await auction.setDutchActionActive(true);
        
        // Mint token ID 100 with 1 mintlist spot
        const signature = await generateSignature(minter.address, 1);
        await expect(auction.connect(other).mintDA(signature, 1, 100, {value: parseEther('0.2')})).to.be.revertedWith("Signer address mismatch.");
    });

    it("DA mint should fail because of wrong ml spots", async function () {
        now = (await provider.getBlock(await provider.getBlockNumber())).timestamp;

        // Set signer 
        await auction.setSigner(SIGNER_ADDRESS);

        // DA started 1 sec ago
        await auction.setAuctionStartTime(now - 1);

        // Set DA active
        await auction.setDutchActionActive(true);
        
        // Mint token ID 100 with 1 mintlist spot
        const signature = await generateSignature(minter.address, 1);
        await expect(auction.connect(minter).mintDA(signature, 2, 100, {value: parseEther('0.2')})).to.be.revertedWith("Signer address mismatch.");
    });

    it("DA mint should fail if waitlister try to mint", async function () {
        now = (await provider.getBlock(await provider.getBlockNumber())).timestamp;

        // Set signer 
        await auction.setSigner(SIGNER_ADDRESS);

        // DA started 1 sec ago
        await auction.setAuctionStartTime(now - 1);

        // Set DA active
        await auction.setDutchActionActive(true);
        
        // Mint token ID 100 with 0 mintlist spot
        const signature = await generateSignature(minter.address, 0);  // 0 mintlist spot == waitlister
        await expect(auction.connect(minter).mintDA(signature, 0, 100, {value: parseEther('0.2')})).to.be.revertedWith("All ML spots have been consumed");
    });
    
    it("DA mint should faild if minter tries to mint more than ml spots", async function () {
        now = (await provider.getBlock(await provider.getBlockNumber())).timestamp;

        // Set signer 
        await auction.setSigner(SIGNER_ADDRESS);

        // DA started 1 sec ago
        await auction.setAuctionStartTime(now - 1);

        // Set DA active
        await auction.setDutchActionActive(true);
        
        // Mint token ID 100 with 1 mintlist spot
        const signature = await generateSignature(minter.address, 1);
        const tx = auction.connect(minter).mintDA(signature, 1, 100, {value: parseEther('0.2')});
        await expect(tx).to.emit(megamiContract, 'Transfer').withArgs(AddressZero, minter.address, 100);

        // Try to mint one more
        await expect(auction.connect(minter).mintDA(signature, 1, 101, {value: parseEther('0.2')})).to.be.revertedWith("All ML spots have been consumed");
    });

    it("DA mint should fail if auction isn't active", async function () {     
        // Set signer 
        await auction.setSigner(SIGNER_ADDRESS);

        const signature = await generateSignature(minter.address, 1);
        await expect(auction.connect(minter).mintDA(signature, 1, 100, {value: parseEther('0.2')})).to.be.revertedWith("DA isnt active");
    }); 

    it("DA mint should fail if auction start time is future", async function () {     
        // Set signer 
        await auction.setSigner(SIGNER_ADDRESS);
                
        now = (await provider.getBlock(await provider.getBlockNumber())).timestamp;

        // DA started 60 sec later
        await auction.setAuctionStartTime(now + 60);

        // Set DA active
        await auction.setDutchActionActive(true);

        const signature = await generateSignature(minter.address, 1);
        await expect(auction.connect(minter).mintDA(signature, 1, 100, {value: parseEther('0.2')})).to.be.revertedWith("DA has not started!");
    });     

    it("DA mint should fail if dutch auction is over", async function () {     
        // Set signer 
        await auction.setSigner(SIGNER_ADDRESS);

        now = (await provider.getBlock(await provider.getBlockNumber())).timestamp;

        // DA ends after 48 hours
        await auction.setAuctionStartTime(now - (48 * 60 * 60));

        // Set DA active
        await auction.setDutchActionActive(true);

        const signature = await generateSignature(minter.address, 1);
        await expect(auction.connect(minter).mintDA(signature, 1, 100, {value: parseEther('0.2')})).to.be.revertedWith("DA is finished");
    });        

    it("DA mint should fail if speficied tokenId is invalid", async function () {     
        now = (await provider.getBlock(await provider.getBlockNumber())).timestamp;

        // Set signer 
        await auction.setSigner(SIGNER_ADDRESS);

        // DA started 1 sec 
        await auction.setAuctionStartTime(now - 1);

        // Set DA active
        await auction.setDutchActionActive(true);
        
        const signature = await generateSignature(minter.address, 1);
        await expect(auction.connect(minter).mintDA(signature, 1, 10000, {value: parseEther('0.2')})).to.be.revertedWith("invalid token id");
    });    
    
    it("DA mint should fail if provided eth is insufficient", async function () {     
        now = (await provider.getBlock(await provider.getBlockNumber())).timestamp;

        // Set signer 
        await auction.setSigner(SIGNER_ADDRESS);

        // DA started 1 sec 
        await auction.setAuctionStartTime(now - 1);

        // Set DA active
        await auction.setDutchActionActive(true);
        
        const signature = await generateSignature(minter.address, 1);
        await expect(auction.connect(minter).mintDA(signature, 1, 100, {value: parseEther('0.1')})).to.be.revertedWith("Did not send enough eth.");
    });    
    
    it("DM mint should fail if it's already sold out", async function () {
        await mintUntilNonTeamLimit(auction, owner);

        // Prepare DA
        now = (await provider.getBlock(await provider.getBlockNumber())).timestamp;

        // Set signer 
        await auction.setSigner(SIGNER_ADDRESS);

        // DA started 1 sec 
        await auction.setAuctionStartTime(now - 1);

        // Set DA active
        await auction.setDutchActionActive(true);
        
        const signature = await generateSignature(minter.address, 1);
        await expect(auction.connect(minter).mintDA(signature, 1, 9550, {value: parseEther('0.2')})).to.be.revertedWith("sold out");
    });

    it("DA mint should fail if provided token id is invalid", async function () {     
        now = (await provider.getBlock(await provider.getBlockNumber())).timestamp;

        // Set signer 
        await auction.setSigner(SIGNER_ADDRESS);

        // DA started 1 sec 
        await auction.setAuctionStartTime(now - 1);

        // Set DA active
        await auction.setDutchActionActive(true);
        
        const signature = await generateSignature(minter.address, 1);
        await expect(auction.connect(minter).mintDA(signature, 1, 0, {value: parseEther('0.2')})).to.be.revertedWith("invalid token id");
        await expect(auction.connect(minter).mintDA(signature, 1, 10001, {value: parseEther('0.2')})).to.be.revertedWith("invalid token id");
    });    

    // --- teamMint ---
    it("should be able to mint multiple tokens though mintTeam", async function () {   
        expect(await auction.totalSold()).to.equal(0);  
        
        // Mint token ID 1, 10, 11, 15, and 10000
        const tx = auction.connect(owner).mintTeam(minter.address, [1, 10, 11, 15, 10000]);
        await expect(tx).to.emit(megamiContract, 'Transfer').withArgs(AddressZero, minter.address, 10);
        await expect(tx).to.emit(megamiContract, 'Transfer').withArgs(AddressZero, minter.address, 11);
        await expect(tx).to.emit(megamiContract, 'Transfer').withArgs(AddressZero, minter.address, 15);

        expect(await auction.totalSold()).to.equal(5);
    });    

    it("should be able to mint until max supply even after sold out", async function () {
        await mintUntilNonTeamLimit(auction, owner);

        const mintUnit = 50;
        for(i = 9550; i < 10000; i += mintUnit) {
            const ids = [...Array(mintUnit).keys()].map(x => x + i + 1);
            await expect(auction.connect(owner).mintTeam(minter.address, ids)).to.be.not.reverted;
            expect(await auction.totalSold()).to.equal(i+mintUnit);
        }

        expect(await auction.totalSold()).to.equal(10000);
    })

    it("teamMint should fail if the receiver is zero", async function () {     
        await expect(auction.connect(owner).mintTeam(AddressZero, [10, 11, 15])).to.be.revertedWith("recipient address is necessary");
    }); 

    it("non owner should not be able to mint through mintTeam", async function () {     
        await expect(auction.connect(minter).mintTeam(minter.address, [10, 11, 15])).to.be.revertedWith("Ownable: caller is not the owner");
    }); 

    it("teamMint should fail if the provided token id is invalid", async function () {     
        await expect(auction.connect(owner).mintTeam(minter.address, [0])).to.be.revertedWith("invalid token id");
        await expect(auction.connect(owner).mintTeam(minter.address, [10001])).to.be.revertedWith("invalid token id");
    }); 

    // --- privateMint ---
    it("private mint shouldn't be possible until it becomes active", async function () {  
        // Generate a signature for a waitlist minter
        const signature = await generateSignature(minter.address, 0);
        
        await expect(auction.connect(minter).mintPrivate(signature, 0, 100)).to.be.revertedWith("Private sale isn't active");
    }); 

    it("private mint status can be changed", async function () {     
        expect(await auction.getPrivateSaleActive()).to.be.equal(false);

        // Make the public sale active 
        await auction.setPrivateSaleActive(true);

        expect(await auction.getPrivateSaleActive()).to.be.equal(true);
    }); 

    it("private mint should fail if enough value isn't provided", async function () { 
        // Set signer 
        await auction.setSigner(SIGNER_ADDRESS);
        
        // Make the private sale active 
        await auction.setPrivateSaleActive(true);

        // Generate a signature for a waitlist minter
        const signature = await generateSignature(minter.address, 0);

        await expect(auction.connect(minter).mintPrivate(signature, 0, 100, {value: parseEther('0.05')})).to.be.revertedWith("Incorrect amount of eth.");
    }); 

    it("private mint should fail if too much value is provided", async function () { 
        // Set signer 
        await auction.setSigner(SIGNER_ADDRESS);
        
        // Make the private sale active 
        await auction.setPrivateSaleActive(true);

        // Generate a signature for a waitlist minter
        const signature = await generateSignature(minter.address, 0);

        await expect(auction.connect(minter).mintPrivate(signature, 0, 100, {value: parseEther('0.15')})).to.be.revertedWith("Incorrect amount of eth.");
    }); 

    it("private mint should fail because of wrong address", async function () {
        // Set signer 
        await auction.setSigner(SIGNER_ADDRESS);

        // Make the private sale active 
        await auction.setPrivateSaleActive(true);

        // Generate a signature for a waitlist minter
        const signature = await generateSignature(minter.address, 0);
        
        // Mint token ID 100
        await expect(auction.connect(other).mintPrivate(signature, 0, 100, {value: parseEther('0.08')})).to.be.revertedWith("Signer address mismatch.");
    });

    it("private mint should fail because of wrong ml spots", async function () {
        // Set signer 
        await auction.setSigner(SIGNER_ADDRESS);

        // Make the private sale active 
        await auction.setPrivateSaleActive(true);

        // Generate a signature for a waitlist minter
        const signature = await generateSignature(minter.address, 0);
        
        // Mint token ID 100
        await expect(auction.connect(minter).mintPrivate(signature, 1, 100, {value: parseEther('0.08')})).to.be.revertedWith("Signer address mismatch.");
    });

    it("private mint should success", async function () { 
        // Set signer 
        await auction.setSigner(SIGNER_ADDRESS);

        // Make the private sale active 
        await auction.setPrivateSaleActive(true);

        // Generate a signature for a waitlist minter
        const signature = await generateSignature(minter.address, 0);

        // mint one
        const tx = auction.connect(minter).mintPrivate(signature, 0, 100, {value: parseEther('0.08')});
        await expect(tx).to.emit(megamiContract, 'Transfer').withArgs(AddressZero, minter.address, 100);

        expect(await auction.totalSold()).to.equal(1);

        // mint another
        const tx2 = auction.connect(minter).mintPrivate(signature, 0, 101, {value: parseEther('0.08')});
        await expect(tx2).to.emit(megamiContract, 'Transfer').withArgs(AddressZero, minter.address, 101);

        expect(await auction.totalSold()).to.equal(2);
    }); 

    it("private mint should fail if the provided token id is invalid", async function () {
        // Set signer 
        await auction.setSigner(SIGNER_ADDRESS);

        // Make the private sale active 
        await auction.setPrivateSaleActive(true);

        // Generate a signature for a waitlist minter
        const signature = await generateSignature(minter.address, 0);
        
        // Mint token ID 0
        await expect(auction.connect(minter).mintPrivate(signature, 0, 0, {value: parseEther('0.08')})).to.be.revertedWith("invalid token id");

        // Mint token ID 10001
        await expect(auction.connect(minter).mintPrivate(signature, 0, 10001, {value: parseEther('0.08')})).to.be.revertedWith("invalid token id");
    });
    
    // --- publicMint ---
    it("public mint shouldn't be possible until it becomes active", async function () {     
        await expect(auction.connect(minter).mintPublic(10)).to.be.revertedWith("Public sale isn't active");
    }); 

    it("public mint status can be changed", async function () {     
        expect(await auction.getPublicSaleActive()).to.be.equal(false);

        // Make the public sale active 
        await auction.setPublicSaleActive(true);

        expect(await auction.getPublicSaleActive()).to.be.equal(true);
    }); 

    it("public mint should fail if enough value isn't provided", async function () { 
        // Make the public sale active 
        await auction.setPublicSaleActive(true);

        await expect(auction.connect(minter).mintPublic(10, {value: parseEther('0.05')})).to.be.revertedWith("Incorrect amount of eth.");
    }); 

    it("public mint should fail if too much value is provided", async function () { 
        // Make the public sale active 
        await auction.setPublicSaleActive(true);

        await expect(auction.connect(minter).mintPublic(10, {value: parseEther('0.15')})).to.be.revertedWith("Incorrect amount of eth.");
    });     

    it("public mint should faild if it's already sold out", async function () {
        await mintUntilNonTeamLimit(auction, owner);

        // Make the public sale active 
        await auction.setPublicSaleActive(true);

        await expect(auction.connect(minter).mintPublic(9550, {value: parseEther('0.08')})).to.be.revertedWith("sold out");
    })

    it("public mint should success", async function () { 
        expect(await auction.totalSold()).to.equal(0);
        
        // Make the public sale active 
        await auction.setPublicSaleActive(true);

        const tx = auction.connect(minter).mintPublic(10, {value: parseEther('0.08')});
        await expect(tx).to.emit(megamiContract, 'Transfer').withArgs(AddressZero, minter.address, 10);

        expect(await auction.totalSold()).to.equal(1);
    }); 

    it("fixed sale price can be changed", async function () {
        expect(await auction.fixedSalePrice()).to.equal(parseEther("0.08"));

        // Update the public sale price
        await expect(auction.setFixedSalePrice(parseEther("0.2"))).to.be.not.reverted;

        // Confirm the sale price
        expect(await auction.fixedSalePrice()).to.equal(parseEther("0.2"));
    });

    // --- test withdraw ---
    it("Should fail to set invalid address to FundManager", async function() {
        await expect(auction.setFundManagerContract(AddressZero)).to.be.revertedWith("invalid address");
    })

    it("Should fail to update FundManager if transaction is initiated by non owner", async function() {
        await expect(auction.connect(other).setFundManagerContract(other.address)).to.be.revertedWith("Ownable: caller is not the owner");
    })
      
    it("Should be able to update FundManager", async function() {
        await expect(auction.setFundManagerContract(other.address)).to.be.not.reverted;
    })
    
    it("Should move fund to FundManager", async function() {
        // Give 100 ETH to the contract through public mint
        await expect(auction.setFixedSalePrice(parseEther("100"))).to.be.not.reverted;
        await auction.setPublicSaleActive(true);
        await auction.connect(minter).mintPublic(10, {value: parseEther('100')});
  
        const tx = auction.moveFundToManager();
        await expect(tx).to.be.not.reverted;
        await expect(await tx).to.changeEtherBalance(fundManagerContract, parseEther("100"));

        // contract's wallet balance should be 0
        expect((await provider.getBalance(auction.address)).toString()).to.equal("0");
    })

    it("Should fail to move fund to FundManager if it's not set", async function() {
        // Deploy new contract for this test
        const TestMegamiSalesFactory = await hre.ethers.getContractFactory("MEGAMISales");
        testAuction = await TestMegamiSalesFactory.deploy(megamiContract.address, AddressZero);  // Wrong fund manager
        await testAuction.deployed();
        
        await expect(testAuction.moveFundToManager()).to.be.revertedWith("fundManager shouldn't be 0");
    })

    it("emergencyWithdraw should send fund to owner", async function() {
        // Give 100 ETH to the contract through public mint
        await expect(auction.setFixedSalePrice(parseEther("100"))).to.be.not.reverted;
        await auction.setPublicSaleActive(true);
        await auction.connect(minter).mintPublic(10, {value: parseEther('100')});
  
        const tx = auction.emergencyWithdraw(other.address);
        await expect(tx).to.be.not.reverted;
        await expect(await tx).to.changeEtherBalance(other, parseEther("100"));

        // contract's wallet balance should be 0
        expect((await provider.getBalance(auction.address)).toString()).to.equal("0");
    })    

    it("emergencyWithdraw should faild if recipient is 0", async function() {
        // Give 100 ETH to the contract through public mint
        await expect(auction.setFixedSalePrice(parseEther("100"))).to.be.not.reverted;
        await auction.setPublicSaleActive(true);
        await auction.connect(minter).mintPublic(10, {value: parseEther('100')});
    
        await expect(auction.emergencyWithdraw(AddressZero)).to.be.revertedWith("recipient shouldn't be 0");
    
        // contract's wallet balance shouldn't be changed
        expect((await provider.getBalance(auction.address)).toString()).to.equal(parseEther("100"));
    })    

    it("emergencyWithdraw should faild if transaction is initiated by non-owner", async function() {
        // Give 100 ETH to the contract through public mint
        await expect(auction.setFixedSalePrice(parseEther("100"))).to.be.not.reverted;
        await auction.setPublicSaleActive(true);
        await auction.connect(minter).mintPublic(10, {value: parseEther('100')});

        await expect(auction.connect(other).emergencyWithdraw(other.address)).to.be.revertedWith("Ownable: caller is not the owner");

        // contract's wallet balance shouldn't be changed
        expect((await provider.getBalance(auction.address)).toString()).to.equal(parseEther("100"));
    })

    // --- test ownership ---
    it("renounceOwnership should be NOP", async function () {
        expect((await auction.owner()).toString()).to.equal(owner.address);

        // try to discard ownership
        await auction.renounceOwnership();

        // owner shound't be changed
        expect((await auction.owner()).toString()).to.equal(owner.address);
    });   
});