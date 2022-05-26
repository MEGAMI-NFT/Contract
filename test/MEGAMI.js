const { expect } = require("chai");

describe("MEGAMI", function () {
beforeEach(async function () {
    [owner, seller, other] = await ethers.getSigners();
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
        expect(await megami.mint(10, other.address));
        
        expect((await megami.totalSupply()).toString()).to.equal("1");
      });  

      it("Seller should be able to mint a new token", async function () {
        expect((await megami.totalSupply()).toString()).to.equal("0");
        
        // set a new seller
        expect(await megami.setSaleContract(seller.address));

        // mint by seller
        expect(await megami.connect(seller).mint(10, other.address));
        
        expect((await megami.totalSupply()).toString()).to.equal("1");
      });        

      it("Other should NOT be able to mint a new token", async function () {
        expect((await megami.totalSupply()).toString()).to.equal("0");
        
        // mint by other
        await expect(megami.connect(other).mint(10, other.address)).to.be.revertedWith("Ownable: caller is not the Owner or SaleContract");
        
        expect((await megami.totalSupply()).toString()).to.equal("0");
      });     
});