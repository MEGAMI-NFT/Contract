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
    it("can get current wave based on tokenId", async function () {
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
    it("can get current price right after the DA starts", async function () {
        now = (await provider.getBlock(await provider.getBlockNumber())).timestamp;

        // DA started 1 sec 
        await auction.setStart(now - 1, 1);
        
        // Start Price
        expect((await auction.currentPrice())).to.equal(parseEther("0.5")); 
    });  

    it("can get current price after price drops", async function () {
        now = (await provider.getBlock(await provider.getBlockNumber())).timestamp;

        cases = [
            // past minutes, expected current price
            [5, "0.45"], 
            [10, "0.4"], 
            [15, "0.35"], 
            [20, "0.3"], 
            [25, "0.25"], 
            [30, "0.20"],
            [35, "0.15"], 
            [40, "0.1"]
        ];
        for(i = 0; i < cases.length; i++ ) {
            // After 5 * i min and 1 sec
            await auction.setStart(now - 1 - (60 * cases[i][0]), 1); 

            // Start Price - 0.05 * i
            expect((await auction.currentPrice())).to.equal(parseEther(cases[i][1])); 
        };
    }); 

    it("can get current price after last price drop", async function () {
        now = (await provider.getBlock(await provider.getBlockNumber())).timestamp;

        // After 45 min and 1 sec
        await auction.setStart(now - 1 - (60 * 45), 1); 

        // Price shouldn't be lower than the ending price
        expect((await auction.currentPrice())).to.equal(parseEther("0.1")); 
    }); 

    it("price shouldn't be returned before DA starts", async function () {
        now = (await provider.getBlock(await provider.getBlockNumber())).timestamp;

        // 10 sec before DA starts
        await auction.setStart(now+10, 1); 

        // Start Price
        await expect(auction.currentPrice()).to.be.revertedWith("DA has not started!");
    });  
});