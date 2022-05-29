const { parseEther } = require('@ethersproject/units');
const { expect } = require("chai");
const { waffle } = require("hardhat");
const provider = waffle.provider;

async function setupMegami() {
    const contractFactory = await ethers.getContractFactory('MEGAMI');
    return await contractFactory.deploy();
}

describe("MEGAMI_Sale", function () {
    let auction;
    let megamiContract;

    beforeEach(async function () {
        [owner, seller, other] = await ethers.getSigners();

        // Setup Megami
        const MegamiFactory = await ethers.getContractFactory('MEGAMI');
        megamiContract = await MegamiFactory.deploy();

        const MegamiSaleFactory = await hre.ethers.getContractFactory("MEGAMI_Sale");
        auction = await MegamiSaleFactory.deploy(megamiContract.address);
    });

    it("default DA_ACTIVE should be false", async function () {
        expect(await auction.DA_ACTIVE()).to.equal(false);
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

        // DA started 1 sec 
        await auction.setStart(now - 1);
        
        // Start Price
        expect((await auction.currentPrice(0))).to.equal(parseEther("0.2")); 
    });  

    it("can get decreased price after price drops", async function () {
        now = (await provider.getBlock(await provider.getBlockNumber())).timestamp;

        cases = [
            // tokenId, past minutes, expected current price
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
            await auction.setStart(now - 1 - (60 * cases[i][0])); 

            // Start Price - 0.05 * i
            expect((await auction.currentPrice(0))).to.equal(parseEther(cases[i][1])); 
        };
    });

    it("can get the lowest price after last price drop", async function () {
        now = (await provider.getBlock(await provider.getBlockNumber())).timestamp;

        // After 25 hours and 1 sec
        await auction.setStart(now - 1 - (60 * 60 * 25)); 

        // Price shouldn't be lower than the ending price
        expect((await auction.currentPrice(0))).to.equal(parseEther("0.08")); 
    }); 

    it("price can be managed independently in each wave", async function () {
        now = (await provider.getBlock(await provider.getBlockNumber())).timestamp;

        cases = [
            // tokenId, past minutes, expected current price
            [0,       0, "0.2"], 
            [0,      60, "0.195"],
            [1000,   60, "0.2"], 
            [0,     120, "0.19"],
            [1000,  120, "0.195"], 
            [2000,  120, "0.2"],
            [0,     540, "0.155"],
            [1000,  540, "0.16"], 
            [2000,  540, "0.165"],            
            [8000,  540, "0.195"],
            [9000,  540, "0.2"],
            [8000, 1950, "0.08"],   // 24.5 hours after releasing wave 9
            [9000, 1950, "0.0825"], // 23.5 hours after releasing wave 10
            [8000, 2010, "0.08"],   // 25.5 hours after releasing wave 9
            [9000, 2010, "0.08"], // 24.5 hours after releasing wave 10            
        ];
        for(i = 0; i < cases.length; i++ ) {
            await auction.setStart(now - 1 - (60 * cases[i][1])); 
            expect((await auction.currentPrice(cases[i][0]))).to.equal(parseEther(cases[i][2])); 
        };
    }); 

    it("price shouldn't be returned before DA starts", async function () {
        now = (await provider.getBlock(await provider.getBlockNumber())).timestamp;

        // 10 sec before DA starts
        await auction.setStart(now + 10); 

        // Start Price
        await expect(auction.currentPrice(0)).to.be.revertedWith("DA has not started!");
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
            await auction.setStart(now - 1 - (60 * cases[i][1])); 
            if(cases[i][2]) {
                await expect(auction.currentPrice(cases[i][0])).to.be.not.reverted; 
            } else{
                await expect(auction.currentPrice(cases[i][0])).to.be.revertedWith("DA has not started!");
            }
        };
    });  
});