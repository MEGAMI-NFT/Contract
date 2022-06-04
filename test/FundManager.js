const { AddressZero } = require('@ethersproject/constants');
const { expect, assert } = require("chai");
const { parseEther } = require('ethers/lib/utils');
const { waffle } = require("hardhat");

const provider = waffle.provider;

describe("FundManager", function () {
beforeEach(async function () {
        [owner, seller, minter, other] = await ethers.getSigners();
        const FundManager = await hre.ethers.getContractFactory("FundManager");
        fundManager = await FundManager.deploy();

        // To deploy our contract, we just have to call Token.deploy() and await
        // for it to be deployed(), which happens once its transaction has been
        // mined.
        await fundManager.deployed();
    });

    // --- test setFeeReceivers ---
    it("Should be able to set feeReceivers", async function() {
        await (expect(fundManager.setFeeReceivers([[owner.address, 5000], [seller.address, 3000], [other.address, 2000]]))).to.be.not.reverted;
      })
  
      it("Should fail to set feeReceivers if receivers are empty ", async function() {
        await (expect(fundManager.setFeeReceivers([]))).to.be.revertedWith("at least one receiver is necessary");
      })    
  
      it("Should fail to set feeReceivers if receivers contain a zero address ", async function() {
        await (expect(fundManager.setFeeReceivers([[owner.address, 5000], [seller.address, 3000], [AddressZero, 2000]]))).to.be.revertedWith("receiver address can't be null");
      })  
  
      it("Should fail to set feeReceivers if share percentage basis point is 0", async function() {
        await (expect(fundManager.setFeeReceivers([[owner.address, 5000], [seller.address, 0], [other.address, 2000]]))).to.be.revertedWith("share percentage basis points can't be 0");
      })  
  
      it("Should fail to set feeReceivers if total share percentage basis point isn't 10000 ", async function() {
        await (expect(fundManager.setFeeReceivers([[owner.address, 2000], [seller.address, 2000], [other.address, 2000]]))).to.be.revertedWith("total share percentage basis point isn't 10000");
      })

    // --- test withdraw ---
    it("Should distribute fee to feeReceivers", async function() {
      // Give 100 ETH to the contract
      await minter.sendTransaction({to: fundManager.address, value: parseEther("100")});

      // Set feeReceivers
      await (expect(fundManager.setFeeReceivers([[owner.address, 5000], [seller.address, 3000], [other.address, 2000]]))).to.be.not.reverted;

      const tx = fundManager.withdraw();
      await expect(tx).to.be.not.reverted;
      await expect(await tx).to.changeEtherBalance(owner, parseEther("50"));
      await expect(await tx).to.changeEtherBalance(seller, parseEther("30"));
      await expect(await tx).to.changeEtherBalance(other, parseEther("20"));

      // contract's wallet balance should be 0
      expect((await provider.getBalance(fundManager.address)).toString()).to.equal("0");
    })

    it("Should distribute fee to a single feeReceiver", async function() {
      // Give 100 ETH to the contract
      await minter.sendTransaction({to: fundManager.address, value: parseEther("100")});

      // Set feeReceivers
      await (expect(fundManager.setFeeReceivers([[other.address, 10000]]))).to.be.not.reverted;

      const tx = fundManager.withdraw();
      await expect(tx).to.be.not.reverted;
      await expect(await tx).to.changeEtherBalance(other, parseEther("100"));

      // contract's wallet balance should be 0
      expect((await provider.getBalance(fundManager.address)).toString()).to.equal("0");
    })

    it("Should distribute fee to feeReceivers with remainder", async function() {
      // Give 5 wei to the contract
      await minter.sendTransaction({to: fundManager.address, value: 5});

      // Set feeReceivers
      await (expect(fundManager.setFeeReceivers([[owner.address, 5000], [seller.address, 3000], [other.address, 2000]]))).to.be.not.reverted;

      const tx = fundManager.withdraw();
      await expect(tx).to.be.not.reverted;
      await expect(await tx).to.changeEtherBalance(owner, 3); // 2 + leftover 1
      await expect(await tx).to.changeEtherBalance(seller, 1);
      await expect(await tx).to.changeEtherBalance(other, 1);

      // contract's wallet balance should be 0
      expect((await provider.getBalance(fundManager.address)).toString()).to.equal("0");
    })

    it("withdraw should fail if feeReceivers is empty", async function() {
      await expect(fundManager.withdraw()).to.be.revertedWith("receivers haven't been specified yet");
    })    
    
    it("emergencyWithdraw should send fund to owner", async function() {
      // Give 100 ETH to the contract
      await minter.sendTransaction({to: fundManager.address, value: parseEther("100")});

      const tx = fundManager.emergencyWithdraw();
      await expect(tx).to.be.not.reverted;
      await expect(await tx).to.changeEtherBalance(owner, parseEther("100"));

      // contract's wallet balance should be 0
      expect((await provider.getBalance(fundManager.address)).toString()).to.equal("0");
    })         
});