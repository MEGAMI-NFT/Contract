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

    // --- Royalty tests ---
    it("Should change the defaultRoyaltiesReceipientAddress", async function () {
        expect(await megami.defaultRoyaltiesReceipientAddress()).to.equal(megami.address);
        
        // set new defaultPercentageBasisPoints
        await megami.setDefaultRoyaltiesReceipientAddress(owner.address);
    
        expect(await megami.defaultRoyaltiesReceipientAddress()).to.equal(owner.address);
      });   

    it("Should change the defaultPercentageBasisPoints", async function () {
        expect(await megami.defaultPercentageBasisPoints()).to.equal(300);
        
        // set new defaultPercentageBasisPoints
        await megami.setDefaultPercentageBasisPoints(1000);
    
        expect(await megami.defaultPercentageBasisPoints()).to.equal(1000);
      });   
      
      it("Should return correct royalty through getRaribleV2Royalties", async function () {
        // get royalty through Rarible's interface
        royalty = await megami.getRaribleV2Royalties(1);
    
        expect(royalty[0].value).to.equal(300);
        expect(royalty[0].account).to.equal(megami.address);
      });   
    
      it("Should return correct royalty through royaltyInfo", async function () {
        expect(await megami.defaultPercentageBasisPoints()).to.equal(300);

        // get royalty
        royalty = await megami.royaltyInfo(1, 100000);
    
        expect(royalty[0]).to.equal(megami.address);
        expect(royalty[1]).to.equal(3000);
      });  
    
      it("Should support LibRoyaltiesV2", async function () {
        // get check supported interface
        expect(await megami.supportsInterface(0xcad96cca)).to.equal(true);  // LibRoyaltiesV2
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
    
      it("Should support EIP-2981", async function () {
        // get check supported interface
        expect(await megami.supportsInterface(0x2a55205a)).to.equal(true);  // EIP-2981
      });
      
      // Ownership
      it("renounceOwnership should be NOP", async function () {
        expect((await megami.owner()).toString()).to.equal(owner.address);

        // try to discard ownership
        await megami.renounceOwnership();

        // owner shound't be changed
        expect((await megami.owner()).toString()).to.equal(owner.address);
      });     
});