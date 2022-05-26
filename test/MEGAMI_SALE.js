const { expect } = require("chai");

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
});