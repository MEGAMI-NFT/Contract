const { AddressZero } = require('@ethersproject/constants');
const { expect, assert } = require("chai");
const { parseEther } = require('ethers/lib/utils');
const { waffle } = require("hardhat");

const provider = waffle.provider;

describe("MEGAMI", function () {
beforeEach(async function () {
    [owner, seller, minter, other] = await ethers.getSigners();
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

    // --- mint tests ---
    it("Should be able to mint by owner", async function () {
        expect(await megami.connect(owner).mint(10, minter.address)).to.emit(megami, 'Transfer').withArgs(AddressZero, minter.address, 10);
    });

    it("Should not be able to mint the same token twice", async function () {
      expect(await megami.connect(owner).mint(10, minter.address)).to.emit(megami, 'Transfer').withArgs(AddressZero, minter.address, 10);

      await expect(megami.connect(owner).mint(10, minter.address)).to.be.revertedWith("ERC721: token already minted");
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

    // --- getUnmintedTokenIds tests ---
    it("Should return unmintedTokenIds", async function() {
      // Initial remaining tokenIds sould be 10,000
      expect((await megami.getUnmintedTokenIds())).to.have.lengthOf(10000);

      // Mint token ID 10
      expect(await megami.connect(owner).mint(10, minter.address)).to.emit(megami, 'Transfer').withArgs(AddressZero, minter.address, 10);

      // Initial remaining tokenIds sould be 9,999
      const unmintedIds = await megami.getUnmintedTokenIds();
      expect(unmintedIds).to.have.lengthOf(9999);

      for(i = 0; i < unmintedIds.length; i++ ){
        if(unmintedIds[i] == 10) {
          assert.fail();
        }
      }
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
  
    it("Should support EIP-2981", async function () {
      // get check supported interface
      expect(await megami.supportsInterface(0x2a55205a)).to.equal(true);  // EIP-2981
    });   
    
    it("Should call upportsInterface of super classes", async function () {
      // get check supported interface
      expect(await megami.supportsInterface(0xffffffff)).to.equal(false);  // 
    });        
    
    // --- test tokenURI ---
    it("token URI must be returned for minted token Id", async function() {
      // mint by owner
      expect(await megami.connect(owner).mint(10, other.address));

      expect((await megami.tokenURI(10))).to.equal("ipfs://xxxxx/10.json")
    });

    it("token URI must be return error for unminted token Id", async function() {
      await expect(megami.tokenURI(10)).to.be.revertedWith("ERC721Metadata: URI query for nonexistent token");
    });      

    // --- test ownership ---
    it("renounceOwnership should be NOP", async function () {
      expect((await megami.owner()).toString()).to.equal(owner.address);

      // try to discard ownership
      await megami.renounceOwnership();

      // owner shound't be changed
      expect((await megami.owner()).toString()).to.equal(owner.address);
    });   

    // --- test setFeeReceivers ---
    it("Should be able to set feeReceivers", async function() {
      await (expect(megami.setFeeReceivers([[owner.address, 5000], [seller.address, 3000], [other.address, 2000]]))).to.be.not.reverted;
    })

    it("Should fail to set feeReceivers if receivers are empty ", async function() {
      await (expect(megami.setFeeReceivers([]))).to.be.revertedWith("at least one receiver is necessary");
    })    

    it("Should fail to set feeReceivers if receivers contain a zero address ", async function() {
      await (expect(megami.setFeeReceivers([[owner.address, 5000], [seller.address, 3000], [AddressZero, 2000]]))).to.be.revertedWith("receiver address can't be null");
    })  

    it("Should fail to set feeReceivers if share percentage basis point is 0", async function() {
      await (expect(megami.setFeeReceivers([[owner.address, 5000], [seller.address, 0], [other.address, 2000]]))).to.be.revertedWith("share percentage basis points can't be 0");
    })  

    it("Should fail to set feeReceivers if total share percentage basis point isn't 10000 ", async function() {
      await (expect(megami.setFeeReceivers([[owner.address, 2000], [seller.address, 2000], [other.address, 2000]]))).to.be.revertedWith("total share percentage basis point isn't 10000");
    })

    // --- test withdraw ---
    it("Should distribute fee to feeReceivers", async function() {
      // Give 100 ETH to the contract
      await minter.sendTransaction({to: megami.address, value: parseEther("100")});

      // Set feeReceivers
      await (expect(megami.setFeeReceivers([[owner.address, 5000], [seller.address, 3000], [other.address, 2000]]))).to.be.not.reverted;

      const tx = megami.withdraw();
      await expect(tx).to.be.not.reverted;
      await expect(await tx).to.changeEtherBalance(owner, parseEther("50"));
      await expect(await tx).to.changeEtherBalance(seller, parseEther("30"));
      await expect(await tx).to.changeEtherBalance(other, parseEther("20"));

      // contract's wallet balance should be 0
      expect((await provider.getBalance(megami.address)).toString()).to.equal("0");
    })

    it("Should distribute fee to a single feeReceiver", async function() {
      // Give 100 ETH to the contract
      await minter.sendTransaction({to: megami.address, value: parseEther("100")});

      // Set feeReceivers
      await (expect(megami.setFeeReceivers([[other.address, 10000]]))).to.be.not.reverted;

      const tx = megami.withdraw();
      await expect(tx).to.be.not.reverted;
      await expect(await tx).to.changeEtherBalance(other, parseEther("100"));

      // contract's wallet balance should be 0
      expect((await provider.getBalance(megami.address)).toString()).to.equal("0");
    })

    it("Should distribute fee to feeReceivers with remainder", async function() {
      // Give 5 wei to the contract
      await minter.sendTransaction({to: megami.address, value: 5});

      // Set feeReceivers
      await (expect(megami.setFeeReceivers([[owner.address, 5000], [seller.address, 3000], [other.address, 2000]]))).to.be.not.reverted;

      const tx = megami.withdraw();
      await expect(tx).to.be.not.reverted;
      await expect(await tx).to.changeEtherBalance(owner, 3); // 2 + leftover 1
      await expect(await tx).to.changeEtherBalance(seller, 1);
      await expect(await tx).to.changeEtherBalance(other, 1);

      // contract's wallet balance should be 0
      expect((await provider.getBalance(megami.address)).toString()).to.equal("0");
    })

    it("withdraw should fail if feeReceivers is empty", async function() {
      await expect(megami.withdraw()).to.be.revertedWith("receivers haven't been specified yet");
    })    
    
    it("emergencyWithdraw should send fund to owner", async function() {
      // Give 100 ETH to the contract
      await minter.sendTransaction({to: megami.address, value: parseEther("100")});

      const tx = megami.emergencyWithdraw();
      await expect(tx).to.be.not.reverted;
      await expect(await tx).to.changeEtherBalance(owner, parseEther("100"));

      // contract's wallet balance should be 0
      expect((await provider.getBalance(megami.address)).toString()).to.equal("0");
    })         
});