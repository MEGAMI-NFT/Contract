const { AddressZero } = require('@ethersproject/constants');
const { expect, assert } = require("chai");
const { parseEther } = require('ethers/lib/utils');
const { waffle } = require("hardhat");

const provider = waffle.provider;

describe("FundManager", function () {
beforeEach(async function () {
        [r1, r2, r3, r4, r5, r6, r7, r8, r9, r10] = await ethers.getSigners();
        const FundManager = await hre.ethers.getContractFactory("FundManager");
        fundManager = await FundManager.deploy();

        // To deploy our contract, we just have to call Token.deploy() and await
        // for it to be deployed(), which happens once its transaction has been
        // mined.
        await fundManager.deployed();
    });

    // --- test setFeeReceivers ---
    it("Should be able to set feeReceivers", async function() {
        await (expect(fundManager.setFeeReceivers([[r1.address, 5000], [r2.address, 3000], [r3.address, 2000]]))).to.be.not.reverted;
      })
  
      it("Should fail to set feeReceivers if receivers are empty ", async function() {
        await (expect(fundManager.setFeeReceivers([]))).to.be.revertedWith("at least one receiver is necessary");
      })    
  
      it("Should fail to set feeReceivers if receivers contain a zero address ", async function() {
        await (expect(fundManager.setFeeReceivers([[r1.address, 5000], [r2.address, 3000], [AddressZero, 2000]]))).to.be.revertedWith("receiver address can't be null");
      })  
  
      it("Should fail to set feeReceivers if share percentage basis point is 0", async function() {
        await (expect(fundManager.setFeeReceivers([[r1.address, 5000], [r2.address, 0], [r3.address, 2000]]))).to.be.revertedWith("share percentage basis points can't be 0");
      })  
  
      it("Should fail to set feeReceivers if total share percentage basis point isn't 10000 ", async function() {
        await (expect(fundManager.setFeeReceivers([[r1.address, 2000], [r2.address, 2000], [r3.address, 2000]]))).to.be.revertedWith("total share percentage basis point isn't 10000");
      })

    // --- test withdraw ---
    it("Should distribute fee to feeReceivers", async function() {
      // Give 100 ETH to the contract
      await r1.sendTransaction({to: fundManager.address, value: parseEther("100")});

      // Set feeReceivers
      await (expect(fundManager.setFeeReceivers([
        [r1.address, 5000], 
        [r2.address, 3000], 
        [r3.address,  800],
        [r4.address,  500], 
        [r5.address,  300], 
        [r6.address,  200],
        [r7.address,  100], 
        [r8.address,   50], 
        [r9.address,   30],
        [r10.address,  20],
      ]))).to.be.not.reverted;

      const tx = fundManager.withdraw();
      await expect(tx).to.be.not.reverted;
      await expect(await tx).to.changeEtherBalance(r1, parseEther("50"));
      await expect(await tx).to.changeEtherBalance(r2, parseEther("30"));
      await expect(await tx).to.changeEtherBalance(r3, parseEther("8"));
      await expect(await tx).to.changeEtherBalance(r4, parseEther("5"));
      await expect(await tx).to.changeEtherBalance(r5, parseEther("3"));
      await expect(await tx).to.changeEtherBalance(r6, parseEther("2"));
      await expect(await tx).to.changeEtherBalance(r7, parseEther("1"));
      await expect(await tx).to.changeEtherBalance(r8, parseEther("0.5"));
      await expect(await tx).to.changeEtherBalance(r9, parseEther("0.3"));            
      await expect(await tx).to.changeEtherBalance(r10, parseEther("0.2"));            

      // contract's wallet balance should be 0
      expect((await provider.getBalance(fundManager.address)).toString()).to.equal("0");
    })

    it("Should distribute fee to a single feeReceiver", async function() {
      // Give 100 ETH to the contract
      await r1.sendTransaction({to: fundManager.address, value: parseEther("100")});

      // Set feeReceivers
      await (expect(fundManager.setFeeReceivers([[r3.address, 10000]]))).to.be.not.reverted;

      const tx = fundManager.withdraw();
      await expect(tx).to.be.not.reverted;
      await expect(await tx).to.changeEtherBalance(r3, parseEther("100"));

      // contract's wallet balance should be 0
      expect((await provider.getBalance(fundManager.address)).toString()).to.equal("0");
    })

    it("Should distribute fee to feeReceivers with remainder", async function() {
      // Give 5 wei to the contract
      await r1.sendTransaction({to: fundManager.address, value: 5});

      // Set feeReceivers
      await (expect(fundManager.setFeeReceivers([[r1.address, 5000], [r2.address, 3000], [r3.address, 2000]]))).to.be.not.reverted;

      const tx = fundManager.withdraw();
      await expect(tx).to.be.not.reverted;
      await expect(await tx).to.changeEtherBalance(r1, 3); // 2 + leftover 1
      await expect(await tx).to.changeEtherBalance(r2, 1);
      await expect(await tx).to.changeEtherBalance(r3, 1);

      // contract's wallet balance should be 0
      expect((await provider.getBalance(fundManager.address)).toString()).to.equal("0");
    })

    it("withdraw should fail if feeReceivers is empty", async function() {
      await expect(fundManager.withdraw()).to.be.revertedWith("receivers haven't been specified yet");
    })    
    
    it("emergencyWithdraw should send fund to owner", async function() {
      // Give 100 ETH to the contract through public mint
      await r1.sendTransaction({to: fundManager.address, value: parseEther("100")});

      const tx = fundManager.emergencyWithdraw(r2.address);
      await expect(tx).to.be.not.reverted;
      await expect(await tx).to.changeEtherBalance(r2, parseEther("100"));

      // contract's wallet balance should be 0
      expect((await provider.getBalance(fundManager.address)).toString()).to.equal("0");
    })    

    it("emergencyWithdraw should faild if recipient is 0", async function() {
      // Give 100 ETH to the contract through public mint
      await r1.sendTransaction({to: fundManager.address, value: parseEther("100")});

      await expect(fundManager.emergencyWithdraw(AddressZero)).to.be.revertedWith("recipient shouldn't be 0");

      // contract's wallet balance shouldn't be changed
      expect((await provider.getBalance(fundManager.address)).toString()).to.equal(parseEther("100"));
    }) 

    // --- test ownership ---
    it("renounceOwnership should be NOP", async function () {
      expect((await fundManager.owner()).toString()).to.equal(r1.address);

      // try to discard ownership
      await fundManager.renounceOwnership();

      // owner shound't be changed
      expect((await fundManager.owner()).toString()).to.equal(r1.address);
  });  
});