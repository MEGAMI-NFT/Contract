const { AddressZero } = require('@ethersproject/constants');
const { expect, assert } = require("chai");
const { parseEther } = require('ethers/lib/utils');
const { waffle } = require("hardhat");

const provider = waffle.provider;

describe.only("MEGAMIMovieSBT", function () {
  beforeEach(async function () {
        [owner, seller, minter, other] = await ethers.getSigners();

        // Setup FundManager
        const FundManagerFactory = await ethers.getContractFactory('FundManager');
        fundManagerContract = await FundManagerFactory.deploy();

        const MegamiMoviewSbt = await hre.ethers.getContractFactory("MEGAMIMovieSBT");
        mmsbt = await MegamiMoviewSbt.deploy(fundManagerContract.address);

        // To deploy our contract, we just have to call Token.deploy() and await
        // for it to be deployed(), which happens once its transaction has been
        // mined.
        await mmsbt.deployed();
  });
  
  // --- mint ---
  it("Should be able to mint a new token", async function () {
    expect((await mmsbt.totalSupply()).toString()).to.equal("0");
    expect((await mmsbt.nextTokenId()).toString()).to.equal("0");
    
    // mint
    await expect(mmsbt.connect(minter).mint("ipfs://xxxxx/", {value: parseEther('0.05')})).to.emit(mmsbt, 'Transfer').withArgs(AddressZero, minter.address, 0);
    
    expect((await mmsbt.totalSupply()).toString()).to.equal("1");
    expect((await mmsbt.nextTokenId()).toString()).to.equal("1");
  });

  it("Should fail to mint a new token with wrong price", async function () {
    expect((await mmsbt.totalSupply()).toString()).to.equal("0");
    expect((await mmsbt.nextTokenId()).toString()).to.equal("0");
    
    // mint
    await expect(mmsbt.mint("ipfs://xxxxx/"), {value: parseEther('0.1')}).to.revertedWith("Invalid amount of eth.");
    
    expect((await mmsbt.totalSupply()).toString()).to.equal("0");
    expect((await mmsbt.nextTokenId()).toString()).to.equal("0");
  });

  it("Should fail to mint a new token without payment", async function () {
    expect((await mmsbt.totalSupply()).toString()).to.equal("0");
    expect((await mmsbt.nextTokenId()).toString()).to.equal("0");
    
    // mint
    await expect(mmsbt.mint("ipfs://xxxxx/")).to.revertedWith("Invalid amount of eth.");
    
    expect((await mmsbt.totalSupply()).toString()).to.equal("0");
    expect((await mmsbt.nextTokenId()).toString()).to.equal("0");
  });

  // --- burn ---
  it("Should be able to burn a token by its owner", async function () {
    expect((await mmsbt.totalSupply()).toString()).to.equal("0");
    expect((await mmsbt.nextTokenId()).toString()).to.equal("0");
    
    // mint
    await expect(mmsbt.connect(minter).mint("ipfs://xxxxx/", {value: parseEther('0.05')})).to.emit(mmsbt, 'Transfer').withArgs(AddressZero, minter.address, 0);
    
    expect((await mmsbt.totalSupply()).toString()).to.equal("1");
    expect((await mmsbt.nextTokenId()).toString()).to.equal("1");

    // burn
    await expect(mmsbt.connect(minter).burn(0)).to.emit(mmsbt, 'Transfer').withArgs(minter.address, AddressZero, 0);

    expect((await mmsbt.totalSupply()).toString()).to.equal("0");
    expect((await mmsbt.nextTokenId()).toString()).to.equal("1");    
  });

  it("Should fail to burn a token by non token owner", async function () {
    expect((await mmsbt.totalSupply()).toString()).to.equal("0");
    expect((await mmsbt.nextTokenId()).toString()).to.equal("0");
    
    // mint
    await expect(mmsbt.connect(minter).mint("ipfs://xxxxx/", {value: parseEther('0.05')})).to.emit(mmsbt, 'Transfer').withArgs(AddressZero, minter.address, 0);
    
    expect((await mmsbt.totalSupply()).toString()).to.equal("1");
    expect((await mmsbt.nextTokenId()).toString()).to.equal("1");

    // burn should fail even with contract owner
    await expect(mmsbt.connect(owner).burn(0)).to.revertedWith("Only owner of the token can burn");

    expect((await mmsbt.totalSupply()).toString()).to.equal("1");
    expect((await mmsbt.nextTokenId()).toString()).to.equal("1");    
  });

  // --- test tokenURI ---
  it("token URI must be returned for minted token Id", async function() {
    // mint
    await expect(mmsbt.connect(minter).mint("ipfs://xxxxx/", {value: parseEther('0.05')})).to.emit(mmsbt, 'Transfer').withArgs(AddressZero, minter.address, 0);
    
    expect((await mmsbt.tokenURI(0))).to.equal("ipfs://xxxxx/");
  });

  it("token URI must be return error for unminted token Id", async function() {
    await expect(mmsbt.tokenURI(10)).to.be.revertedWith("URI query for nonexistent token");
  });

  // --- test setTokenPrice ---
  it("token price can be changed by owner", async function() {
    expect((await mmsbt.tokenPrice())).to.equal(parseEther('0.05')); 

    // mint
    await expect(mmsbt.connect(minter).mint("ipfs://xxxxx/", {value: parseEther('0.05')})).to.emit(mmsbt, 'Transfer').withArgs(AddressZero, minter.address, 0);


    // change price
    await expect(mmsbt.setTokenPrice(parseEther('0.1'))).to.not.reverted;
    
    expect((await mmsbt.tokenPrice())).to.equal(parseEther('0.1')); 

    // mint
    await expect(mmsbt.connect(minter).mint("ipfs://xxxxx/", {value: parseEther('0.1')})).to.emit(mmsbt, 'Transfer').withArgs(AddressZero, minter.address, 1);
  });

  it("token price must not be changed by non owner", async function() {
    expect((await mmsbt.tokenPrice())).to.equal(parseEther('0.05')); 

    // change price
    await expect(mmsbt.connect(other).setTokenPrice(parseEther('0.1'))).to.revertedWith("Ownable: caller is not the owner");
    
    expect((await mmsbt.tokenPrice())).to.equal(parseEther('0.05')); 
  });

  // --- test approve ---
  it("approve must fail regardless", async function() {
    // mint
    await expect(mmsbt.connect(minter).mint("ipfs://xxxxx/", {value: parseEther('0.05')})).to.emit(mmsbt, 'Transfer').withArgs(AddressZero, minter.address, 0);

    // approve
    await expect(mmsbt.connect(minter).approve(other.address, 0)).to.revertedWith("SBT isn't transferable");
  });

  // --- test setApprovalForAll ---
  it("setApprovalForAll must fail regardless", async function() {
    // mint
    await expect(mmsbt.connect(minter).mint("ipfs://xxxxx/", {value: parseEther('0.05')})).to.emit(mmsbt, 'Transfer').withArgs(AddressZero, minter.address, 0);

    // setApprovalForAll
    await expect(mmsbt.connect(minter).setApprovalForAll(other.address, true)).to.revertedWith("SBT isn't transferable");
  });

  // --- test transferFrom ---
  it("transferFrom must fail", async function() {
    // mint
    await expect(mmsbt.connect(minter).mint("ipfs://xxxxx/", {value: parseEther('0.05')})).to.emit(mmsbt, 'Transfer').withArgs(AddressZero, minter.address, 0);

    expect((await mmsbt.totalSupply()).toString()).to.equal("1");

    // transferFrom
    await expect(mmsbt.connect(minter).transferFrom(minter.address, other.address, 0)).to.revertedWith("SBT isn't transferable");

    expect((await mmsbt.totalSupply()).toString()).to.equal("1");
  });  

  // --- test withdraw ---
  it("Should fail to set invalid address to FundManager", async function() {
    await expect(mmsbt.setFundManagerContract(AddressZero)).to.be.revertedWith("invalid address");

    expect(await mmsbt.getFundManagerContract()).to.equal(fundManagerContract.address);
  })

  it("Should fail to update FundManager if transaction is initiated by non owner", async function() {
    await expect(mmsbt.connect(other).setFundManagerContract(other.address)).to.be.revertedWith("Ownable: caller is not the owner");

    expect(await mmsbt.getFundManagerContract()).to.equal(fundManagerContract.address);
  })
  
  it("Should be able to update FundManager", async function() {
    await expect(mmsbt.setFundManagerContract(other.address)).to.be.not.reverted;

    expect(await mmsbt.getFundManagerContract()).to.equal(other.address);
  })

  it("Should move fund to FundManager", async function() {
    // Give 100 ETH to the contract through public mint
    await minter.sendTransaction({to: mmsbt.address, value: parseEther("100")});      

    const tx = mmsbt.moveFundToManager();
    await expect(tx).to.be.not.reverted;
    await expect(await tx).to.changeEtherBalance(fundManagerContract, parseEther("100"));

    // contract's wallet balance should be 0
    expect((await provider.getBalance(mmsbt.address)).toString()).to.equal("0");
  })

  it("Should fail to move fund to FundManager if it's not set", async function() {
      // Deploy new contract for this test
      const TestMegamiMoviewSbt = await hre.ethers.getContractFactory("MEGAMIMovieSBT");
      testMmsbt = await TestMegamiMoviewSbt.deploy(AddressZero);  // Wrong fund manager
      await testMmsbt.deployed();
      
      await expect(testMmsbt.moveFundToManager()).to.be.revertedWith("fundManager shouldn't be 0");
  })

  it("emergencyWithdraw should send fund to owner", async function() {
      // Give 100 ETH to the contract through public mint
      await minter.sendTransaction({to: mmsbt.address, value: parseEther("100")});

      const tx = mmsbt.emergencyWithdraw(other.address);
      await expect(tx).to.be.not.reverted;
      await expect(await tx).to.changeEtherBalance(other, parseEther("100"));

      // contract's wallet balance should be 0
      expect((await provider.getBalance(mmsbt.address)).toString()).to.equal("0");
  })    

  it("emergencyWithdraw should faild if recipient is 0", async function() {
    // Give 100 ETH to the contract through public mint
    await minter.sendTransaction({to: mmsbt.address, value: parseEther("100")});

    await expect(mmsbt.emergencyWithdraw(AddressZero)).to.be.revertedWith("recipient shouldn't be 0");

    // contract's wallet balance shouldn't be changed
    expect((await provider.getBalance(mmsbt.address)).toString()).to.equal(parseEther("100"));
  })    

  it("emergencyWithdraw should faild if transaction is initiated by non-owner", async function() {
    // Give 100 ETH to the contract through public mint
    await minter.sendTransaction({to: mmsbt.address, value: parseEther("100")});

    await expect(mmsbt.connect(other).emergencyWithdraw(other.address)).to.be.revertedWith("Ownable: caller is not the owner");

    // contract's wallet balance shouldn't be changed
    expect((await provider.getBalance(mmsbt.address)).toString()).to.equal(parseEther("100"));
  })

});