const { expect } = require("chai");

describe("MEGAMI", function () {
beforeEach(async function () {
    [owner, minter] = await ethers.getSigners();
    const Megami = await hre.ethers.getContractFactory("MEGAMI");
    megami = await Megami.deploy();

    // To deploy our contract, we just have to call Token.deploy() and await
    // for it to be deployed(), which happens once its transaction has been
    // mined.
    await megami.deployed();
    });

    it("Owner should be able to mint a new token", async function () {
        expect((await megami.totalSupply()).toString()).to.equal("0");
        
        // mint by owner
        expect(await megami.mint(10, owner.address));
        
        expect((await megami.totalSupply()).toString()).to.equal("1");
      });  
});