const { AddressZero } = require('@ethersproject/constants');
const { expect, assert } = require("chai");
const { parseEther } = require('ethers/lib/utils');
const { waffle } = require("hardhat");

describe.only("TeamMEGAMI", function () {
  beforeEach(async function () {
        [owner, minter, other] = await ethers.getSigners();

        const TeamMEGAMI = await hre.ethers.getContractFactory("TeamMEGAMI");
        teamMegami = await TeamMEGAMI.deploy();

        // To deploy our contract, we just have to call Token.deploy() and await
        // for it to be deployed(), which happens once its transaction has been
        // mined.
        await teamMegami.deployed();
  });
  
  // --- mint ---
  it("Should be able to mint a new token by owner", async function () {
    expect((await teamMegami.totalSupply()).toString()).to.equal("0");

    // mint
    await expect(teamMegami.connect(owner).mint(0, minter.address)).to.emit(teamMegami, 'Transfer').withArgs(AddressZero, minter.address, 0);
    
    expect((await teamMegami.totalSupply()).toString()).to.equal("1");
  });

  it("Should fail to mint a new token by non owner", async function () {
    expect((await teamMegami.totalSupply()).toString()).to.equal("0");

    // mint
    await expect(teamMegami.connect(minter).mint(0, minter.address)).to.revertedWith("Ownable: caller is not the owner");
    
    expect((await teamMegami.totalSupply()).toString()).to.equal("0");
  });

  // --- batch mint ---
  it("Should be able to mint new tokens by owner", async function () {
    expect((await teamMegami.totalSupply()).toString()).to.equal("0");

    // batrch mint
    const tx = expect(teamMegami.connect(owner).batchMint([0, 1], [minter.address, other.address]));
    await tx.to.emit(teamMegami, 'Transfer').withArgs(AddressZero, minter.address, 0);
    await tx.to.emit(teamMegami, 'Transfer').withArgs(AddressZero, other.address, 1);
    
    expect((await teamMegami.totalSupply()).toString()).to.equal("2");
  });

  it("Should fail to mint new tokens by non owner", async function () {
    expect((await teamMegami.totalSupply()).toString()).to.equal("0");

    // batch mint
    await expect(teamMegami.connect(minter).batchMint([0, 1], [minter.address, other.address])).to.revertedWith("Ownable: caller is not the owner");
    
    expect((await teamMegami.totalSupply()).toString()).to.equal("0");
  });

  it("Should fail to mint new tokens with too many token ids", async function () {
    expect((await teamMegami.totalSupply()).toString()).to.equal("0");

    // batch mint
    await expect(teamMegami.connect(owner).batchMint([0, 1, 2], [minter.address, other.address])).to.revertedWith("invalid parameters");
    
    expect((await teamMegami.totalSupply()).toString()).to.equal("0");
  });  

  it("Should fail to mint new tokens with too few token ids", async function () {
    expect((await teamMegami.totalSupply()).toString()).to.equal("0");

    // batch mint
    await expect(teamMegami.connect(owner).batchMint([0], [minter.address, other.address])).to.revertedWith("invalid parameters");
    
    expect((await teamMegami.totalSupply()).toString()).to.equal("0");
  });    

  // --- burn ---
  it("Should be able to burn a token by token owner", async function () {
    expect((await teamMegami.totalSupply()).toString()).to.equal("0");

    // mint
    await expect(teamMegami.connect(owner).mint(0, minter.address)).to.emit(teamMegami, 'Transfer').withArgs(AddressZero, minter.address, 0);

    expect((await teamMegami.totalSupply()).toString()).to.equal("1");

    // burn
    await expect(teamMegami.connect(minter).burn(0)).to.emit(teamMegami, 'Transfer').withArgs(minter.address, AddressZero, 0);

    expect((await teamMegami.totalSupply()).toString()).to.equal("0");
  });

  it("Should be able to burn a token by contract owner", async function () {
    expect((await teamMegami.totalSupply()).toString()).to.equal("0");

    // mint
    await expect(teamMegami.connect(owner).mint(0, minter.address)).to.emit(teamMegami, 'Transfer').withArgs(AddressZero, minter.address, 0);

    expect((await teamMegami.totalSupply()).toString()).to.equal("1");

    // burn
    await expect(teamMegami.connect(owner).burn(0)).to.emit(teamMegami, 'Transfer').withArgs(minter.address, AddressZero, 0);

    expect((await teamMegami.totalSupply()).toString()).to.equal("0");
  });  

  it("Should fail to burn a token by non token owner", async function () {
    expect((await teamMegami.totalSupply()).toString()).to.equal("0");

    // mint
    await expect(teamMegami.connect(owner).mint(0, minter.address)).to.emit(teamMegami, 'Transfer').withArgs(AddressZero, minter.address, 0);

    expect((await teamMegami.totalSupply()).toString()).to.equal("1");

    // burn should fail even with contract owner
    await expect(teamMegami.connect(other).burn(0)).to.revertedWith("Only owners can burn");

    expect((await teamMegami.totalSupply()).toString()).to.equal("1"); 
  });

  // --- test tokenURI ---
  it("token URI must be returned for minted token Id", async function() {
    // mint
    await expect(teamMegami.connect(owner).mint(0, minter.address)).to.emit(teamMegami, 'Transfer').withArgs(AddressZero, minter.address, 0);

    expect((await teamMegami.tokenURI(0))).to.equal("ipfs://xxxxx/0.json");
  });

  it("token URI must be return error for unminted token Id", async function() {
    await expect(teamMegami.tokenURI(10)).to.be.revertedWith("URI query for nonexistent token");
  });

  it("base token URI should be updatable", async function() {
    await teamMegami.setBaseTokenURI("ipfs://yyyyy/");
    
    // mint
    await expect(teamMegami.connect(owner).mint(0, minter.address)).to.emit(teamMegami, 'Transfer').withArgs(AddressZero, minter.address, 0);

    expect((await teamMegami.tokenURI(0))).to.equal("ipfs://yyyyy/0.json");
  });

  // --- test approve ---
  it("approve must fail regardless", async function() {
    // mint
    await expect(teamMegami.connect(owner).mint(0, minter.address)).to.emit(teamMegami, 'Transfer').withArgs(AddressZero, minter.address, 0);

    // approve
    await expect(teamMegami.connect(minter).approve(other.address, 0)).to.revertedWith("SBT isn't transferable");
  });

  // --- test setApprovalForAll ---
  it("setApprovalForAll must fail regardless", async function() {
    // mint
    await expect(teamMegami.connect(owner).mint(0, minter.address)).to.emit(teamMegami, 'Transfer').withArgs(AddressZero, minter.address, 0);

    // setApprovalForAll
    await expect(teamMegami.connect(minter).setApprovalForAll(other.address, true)).to.revertedWith("SBT isn't transferable");
  });

  // --- test transferFrom ---
  it("transferFrom must fail", async function() {
      // mint
    await expect(teamMegami.connect(owner).mint(0, minter.address)).to.emit(teamMegami, 'Transfer').withArgs(AddressZero, minter.address, 0);

    // transferFrom
    await expect(teamMegami.connect(minter).transferFrom(minter.address, other.address, 0)).to.revertedWith("SBT isn't transferable");
  });    
});