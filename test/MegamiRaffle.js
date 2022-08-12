const { AddressZero } = require('@ethersproject/constants');
const { expect, assert } = require("chai");
const { parseEther } = require('ethers/lib/utils');
const { waffle, ethers } = require("hardhat");

const provider = waffle.provider;

describe.only("MegamiRaffle", function () {
    beforeEach(async function () {  
        [owner, seller, minter, other] = await ethers.getSigners();

        // Setup MockVRFCoordinator
        const MockVRFCoordinator = await ethers.getContractFactory("MockVRFCoordinator");
        mockVRFCoordinator = await MockVRFCoordinator.deploy();

        const MegamiRaffle = await hre.ethers.getContractFactory("MegamiRaffle");
        megamiRaffle = await MegamiRaffle.deploy(mockVRFCoordinator.address, 11111, "0x8af398995b04c28e9951adb9721ef74c74f93e6a478f39e7e0777be13527e7ef");

        // To deploy our contract, we just have to call Token.deploy() and await
        // for it to be deployed(), which happens once its transaction has been
        // mined.
        await megamiRaffle.deployed();
    });

    // --- setVrfRequestConfig tests ---
    it("Should be able to set the vrfRequestConfig", async function () {
        const currentConfig = await megamiRaffle.vrfRequestConfig();
        expect(currentConfig[0]).to.equal("0x8af398995b04c28e9951adb9721ef74c74f93e6a478f39e7e0777be13527e7ef");
        expect(currentConfig[1].toString()).to.equal("11111");
        expect(currentConfig[2].toString()).to.equal("100000");
        expect(currentConfig[3].toString()).to.equal("3");

        await expect(megamiRaffle.setVrfRequestConfig([
            "0xff8dedfbfa60af186cf3c830acbc32c05aae823045ae5ea7da1e45fbfaba4f92",
            22222,
            200000,
            5,
        ])).not.to.be.reverted;

        const newConfig = await megamiRaffle.vrfRequestConfig();
        expect(newConfig[0]).to.equal("0xff8dedfbfa60af186cf3c830acbc32c05aae823045ae5ea7da1e45fbfaba4f92");
        expect(newConfig[1].toString()).to.equal("22222");
        expect(newConfig[2].toString()).to.equal("200000");
        expect(newConfig[3].toString()).to.equal("5");
    });   

    it("Should fail to set the vrfRequestConfig if non owner tries", async function () {
        await expect(megamiRaffle.connect(other).setVrfRequestConfig([
            "0xff8dedfbfa60af186cf3c830acbc32c05aae823045ae5ea7da1e45fbfaba4f92",
            22222,
            200000,
            5,
        ])).to.be.revertedWith("Ownable: caller is not the owner");
    });

    // --- setRaffleScriptURI tests ---
    it("Should be able to set the raffleScriptURI", async function () {
        await expect(await megamiRaffle.raffleScriptURI()).to.equal("");

        await expect(megamiRaffle.setRaffleScriptURI("ipfs://yyyyy/")).not.to.be.reverted;

        await expect(await megamiRaffle.raffleScriptURI()).to.equal("ipfs://yyyyy/");
    });

    it("Should fail to set the raffleScriptURI if non owner tries", async function () {
        await expect(megamiRaffle.connect(other).setRaffleScriptURI("ipfs://yyyyy/")).to.be.revertedWith("Ownable: caller is not the owner");
    });

    // --- setRandomSeed tests ---
    it("Should fail to set the random seed if non owner tries", async function () {
        await expect(megamiRaffle.connect(other).setRandomSeed(1, "ipfs://xxxxx/")).to.be.revertedWith("Ownable: caller is not the owner");
    });

    it("Should fail to set the random seed if raffleId is zero", async function () {
        await expect(megamiRaffle.setRandomSeed(0, "ipfs://xxxxx/")).to.be.revertedWith("raffleId must be non zero");
    });    

    it("Should fail to set the random seed if raffle script URI is empty", async function () {
        await expect(megamiRaffle.setRandomSeed(1, "ipfs://xxxxx/")).to.be.revertedWith("raffle script is empty");
    });

    it("Should be able to set the random seed to the raffle ID", async function () {
        // Check the default
        expect(await megamiRaffle.randomSeeds(1)).to.equal(0);
        expect(await megamiRaffle.raffleDataURIs(1)).to.equal("");

        // Set raffle script URI first
        await expect(megamiRaffle.setRaffleScriptURI("ipfs://yyyyy/")).not.to.be.reverted;

        // Set the random seed to the raffle ID
        tx = megamiRaffle.setRandomSeed(1, "ipfs://xxxxx/");
        await expect(tx).not.to.be.reverted;
        await expect(tx).to.emit(megamiRaffle, 'RandomSeedDrawn').withArgs(23456, 1, 12345);

        // Check the random seed
        expect(await megamiRaffle.randomSeeds(1)).to.equal(12345);
        expect(await megamiRaffle.raffleDataURIs(1)).to.equal("ipfs://xxxxx/");
    });

    it("Should faild to set the random seed to the same raffle ID twice", async function () {
        // Set raffle script URI first
        await expect(megamiRaffle.setRaffleScriptURI("ipfs://yyyyy/")).not.to.be.reverted;

        // Set the random seed to the raffle ID
        await expect(megamiRaffle.setRandomSeed(1, "ipfs://xxxxx/")).not.to.be.reverted;
        
        // Try to set the random seed again
        await expect(megamiRaffle.setRandomSeed(1, "ipfs://yyyyy/")).to.be.revertedWith("seed is already requested");
    });
});