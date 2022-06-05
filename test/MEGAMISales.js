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

        const MegamiSaleFactory = await hre.ethers.getContractFactory("MEGAMISales");
        auction = await MegamiSaleFactory.deploy(megamiContract.address, fundManagerContract.address);

        // Setup Megami Sale as a SalesContract
        await megamiContract.setSalesContract(auction.address);
    });
    
    // --- getWave ---
    it("can get corresponding wave based on tokenId", async function () {
        cases = [
            // tokenId, expected wave
            [0, 0],
            [999, 0],
            [1000, 1],
            [1999, 1],
            [9000, 9],
            [9999, 9]
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
            [0, 0,       "10"], // Origin start
            [0, 2,       "10"], // Origin end
            [0, 3,        "5"], // Alter start
            [0, 4,        "5"], // Alter end
            [0, 5,      "0.2"], // Genearted start
            [0, 999,    "0.2"], // Generated end
            // Wave 3
            [3, 3000,    "10"], // Origin start
            [3, 3002,    "10"], // Origin end
            [3, 3003,     "5"], // Alter start
            [3, 3004,     "5"], // Alter end
            [3, 3005,   "0.2"], // Genearted start
            [3, 3999,   "0.2"], // Generated end            
            // Wave 4
            [4, 4000,    "10"], // Origin start
            [4, 4002,    "10"], // Origin end
            [4, 4003,     "5"], // Alter start
            [4, 4005,     "5"], // Alter end
            [4, 4006,   "0.2"], // Genearted start
            [4, 4999,   "0.2"], // Generated end
            // Wave 7
            [7, 7000,    "10"], // Origin start
            [7, 7002,    "10"], // Origin end
            [7, 7003,     "5"], // Alter start
            [7, 7005,     "5"], // Alter end
            [7, 7006,   "0.2"], // Genearted start
            [7, 7999,   "0.2"], // Generated end
            // Wave 8
            [8, 8000,    "10"], // Origin start
            [8, 8002,    "10"], // Origin end
            [8, 8003,     "5"], // Alter start
            [8, 8004,     "5"], // Alter end
            [8, 8006,   "0.2"], // Genearted start
            [8, 8999,   "0.2"], // Generated end                 
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
            // tokenId, past minutes, expected current price
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
            expect((await auction.currentPrice(0))).to.equal(parseEther(cases[i][1])); 
        };
    });

    it("can get decreased price after price drops - alter", async function () {
        now = (await provider.getBlock(await provider.getBlockNumber())).timestamp;

        cases = [
            // tokenId, past minutes, expected current price
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
            expect((await auction.currentPrice(3))).to.equal(parseEther(cases[i][1])); 
        };
    });

    it("can get decreased price after price drops - generated", async function () {
        now = (await provider.getBlock(await provider.getBlockNumber())).timestamp;

        cases = [
            // tokenId, past minutes, expected current price
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
            expect((await auction.currentPrice(10))).to.equal(parseEther(cases[i][1])); 
        };
    });

    it("can get the lowest price after last price drop", async function () {
        now = (await provider.getBlock(await provider.getBlockNumber())).timestamp;

        // After 25 hours and 1 sec
        await auction.setAuctionStartTime(now - 1 - (60 * 60 * 25)); 

        // Price shouldn't be lower than the ending price
        expect((await auction.currentPrice(10))).to.equal(parseEther("0.08")); 
    }); 

    it("price can be managed independently in each wave", async function () {
        now = (await provider.getBlock(await provider.getBlockNumber())).timestamp;

        cases = [
            // tokenId, past minutes, expected current price
            [10,      0, "0.2"], 
            [10,     60, "0.195"],
            [1010,   60, "0.2"], 
            [10,    120, "0.19"],
            [1010,  120, "0.195"], 
            [2010,  120, "0.2"],
            [10,    540, "0.155"],
            [1010,  540, "0.16"], 
            [2010,  540, "0.165"],            
            [8010,  540, "0.195"],
            [9010,  540, "0.2"],
            [8010, 1950, "0.08"],   // 24.5 hours after releasing wave 9
            [9010, 1950, "0.0825"], // 23.5 hours after releasing wave 10
            [8010, 2010, "0.08"],   // 25.5 hours after releasing wave 9
            [9010, 2010, "0.08"], // 24.5 hours after releasing wave 10            
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
        await expect(auction.currentPrice(10)).to.be.revertedWith("wave mint yet");
    });  

    it("DA start time should be managed independently", async function () {
        now = (await provider.getBlock(await provider.getBlockNumber())).timestamp;

        cases = [
            // tokenId, past minutes, price returned
            [0,          0, true], 
            [1000,       0, false],
            [2000,       0, false], 
            [9000,       0, false],
            [0,         60, true], 
            [1000,      60, true],
            [2000,      60, false], 
            [9000,      60, false],
            [0,        120, true], 
            [1000,     120, true],
            [2000,     120, true], 
            [9000,     120, false],
            [0,        540, true], 
            [1000,     540, true],
            [2000,     540, true], 
            [9000,     540, true],                        
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

    // --- mintDA ---
    it("auction is deactivated by default", async function () {
        expect(await auction.auctionActive()).to.equal(false);
    });

    it("auction can't be activated without signer", async function () {
        await expect(auction.setDutchActionActive(true)).to.be.revertedWith("Mintlist signer must be set before starting auction");
    });    

    it("should be able to mint", async function () {
        now = (await provider.getBlock(await provider.getBlockNumber())).timestamp;

        // Set signer 
        await auction.setSigner(SIGNER_ADDRESS);

        // DA started 1 sec 
        await auction.setAuctionStartTime(now - 1);

        // Set DA active
        await auction.setDutchActionActive(true);
        
        // Mint token ID 10 with 1 mintlist spot
        const signature = await generateSignature(minter.address, 1);
        const tx = auction.connect(minter).mintDA(signature, 1, 10, {value: parseEther('0.2')});
        await expect(tx).to.emit(megamiContract, 'Transfer').withArgs(AddressZero, minter.address, 10);
    });

    it("DA mint should fail because of wrong address", async function () {
        now = (await provider.getBlock(await provider.getBlockNumber())).timestamp;

        // Set signer 
        await auction.setSigner(SIGNER_ADDRESS);

        // DA started 1 sec 
        await auction.setAuctionStartTime(now - 1);

        // Set DA active
        await auction.setDutchActionActive(true);
        
        // Mint token ID 10 with 1 mintlist spot
        const signature = await generateSignature(minter.address, 1);
        await expect(auction.connect(other).mintDA(signature, 1, 10, {value: parseEther('0.2')})).to.be.revertedWith("Signer address mismatch.");
    });

    it("DA mint should fail because of wrong ml spots", async function () {
        now = (await provider.getBlock(await provider.getBlockNumber())).timestamp;

        // Set signer 
        await auction.setSigner(SIGNER_ADDRESS);

        // DA started 1 sec ago
        await auction.setAuctionStartTime(now - 1);

        // Set DA active
        await auction.setDutchActionActive(true);
        
        // Mint token ID 10 with 1 mintlist spot
        const signature = await generateSignature(minter.address, 1);
        await expect(auction.connect(minter).mintDA(signature, 2, 10, {value: parseEther('0.2')})).to.be.revertedWith("Signer address mismatch.");
    });

    it("should not be able to mint more than ml spots", async function () {
        now = (await provider.getBlock(await provider.getBlockNumber())).timestamp;

        // Set signer 
        await auction.setSigner(SIGNER_ADDRESS);

        // DA started 1 sec ago
        await auction.setAuctionStartTime(now - 1);

        // Set DA active
        await auction.setDutchActionActive(true);
        
        // Mint token ID 10 with 1 mintlist spot
        const signature = await generateSignature(minter.address, 1);
        const tx = auction.connect(minter).mintDA(signature, 1, 10, {value: parseEther('0.2')});
        await expect(tx).to.emit(megamiContract, 'Transfer').withArgs(AddressZero, minter.address, 10);

        // Try to mint one more
        await expect(auction.connect(minter).mintDA(signature, 1, 11, {value: parseEther('0.2')})).to.be.revertedWith("All ML spots have been consumed");
    });

    it("DA mint should fail if auction isn't active", async function () {     
        // Set signer 
        await auction.setSigner(SIGNER_ADDRESS);

        const signature = await generateSignature(minter.address, 1);
        await expect(auction.connect(minter).mintDA(signature, 1, 11, {value: parseEther('0.2')})).to.be.revertedWith("DA isnt active");
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
        await expect(auction.connect(minter).mintDA(signature, 1, 11, {value: parseEther('0.2')})).to.be.revertedWith("DA has not started!");
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
        await expect(auction.connect(minter).mintDA(signature, 1, 11, {value: parseEther('0.2')})).to.be.revertedWith("DA is finished");
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
        await expect(auction.connect(minter).mintDA(signature, 1, 10000, {value: parseEther('0.2')})).to.be.revertedWith("total mint limit");
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
        await expect(auction.connect(minter).mintDA(signature, 1, 10, {value: parseEther('0.1')})).to.be.revertedWith("Did not send enough eth.");
    });    

    // --- teamMint ---
    it("should be able to mint multiple tokens though mintTeam", async function () {     
        // Mint token ID 10, 11, and 15
        const tx = auction.connect(owner).mintTeam(minter.address, [10, 11, 15]);
        await expect(tx).to.emit(megamiContract, 'Transfer').withArgs(AddressZero, minter.address, 10);
        await expect(tx).to.emit(megamiContract, 'Transfer').withArgs(AddressZero, minter.address, 11);
        await expect(tx).to.emit(megamiContract, 'Transfer').withArgs(AddressZero, minter.address, 15);
    });    

    it("teamMint should fail if the receiver is zero", async function () {     
        await expect(auction.connect(owner).mintTeam(AddressZero, [10, 11, 15])).to.be.revertedWith("recipient address is necessary");
    }); 

    it("non owner should not be able to mint through mintTeam", async function () {     
        await expect(auction.connect(minter).mintTeam(minter.address, [10, 11, 15])).to.be.revertedWith("Ownable: caller is not the owner");
    }); 

    // --- publicMint ---
    it("public mint shouldn't be possible until it becomes active", async function () {     
        await expect(auction.connect(minter).mintPublic(10)).to.be.revertedWith("Public sale isn't active");
    }); 

    it("public mint should fail if enough value isn't provided", async function () { 
        // Make the public sale active 
        await auction.setPublicSaleActive(true);

        await expect(auction.connect(minter).mintPublic(10, {value: parseEther('0.05')})).to.be.revertedWith("Did not send enough eth.");
    }); 

    it("public mint should success", async function () { 
        // Make the public sale active 
        await auction.setPublicSaleActive(true);

        const tx = auction.connect(minter).mintPublic(10, {value: parseEther('0.1')});
        await expect(tx).to.emit(megamiContract, 'Transfer').withArgs(AddressZero, minter.address, 10);
    }); 

    // --- test withdraw ---
    it("Should be able to update FundManager", async function() {
        await expect(auction.setFundManagerContract(other.address)).to.be.not.reverted;
    })
    
    it("Should move fund to FundManager", async function() {
        // Give 100 ETH to the contract through public mint
        await auction.setPublicSaleActive(true);
        await auction.connect(minter).mintPublic(10, {value: parseEther('100')});
  
        const tx = auction.moveFundToManager();
        await expect(tx).to.be.not.reverted;
        await expect(await tx).to.changeEtherBalance(fundManagerContract, parseEther("100"));

        // contract's wallet balance should be 0
        expect((await provider.getBalance(auction.address)).toString()).to.equal("0");
    })

    it("emergencyWithdraw should send fund to owner", async function() {
        // Give 100 ETH to the contract through public mint
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
        await auction.setPublicSaleActive(true);
        await auction.connect(minter).mintPublic(10, {value: parseEther('100')});
    
        await expect(auction.emergencyWithdraw(AddressZero)).to.be.revertedWith("recipient shouldn't be 0");
    
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