const { AddressZero } = require('@ethersproject/constants');
const { expect, assert } = require("chai");
const { parseEther } = require('ethers/lib/utils');
const { waffle } = require("hardhat");

const provider = waffle.provider;

// Test only wallet
const SIGNER_ADDRESS = "0x9A1D4e1150759DB4B2d02aC3c08335a2Ac9418fe";
const SIGNER_SECRETKEY = "0cddb0e8ba05a84e45c5081775cee5eaff59aecf9e3f7c1e775d4419189d1590";
const signer = new ethers.Wallet(SIGNER_SECRETKEY);

async function generateSignature(uri) {
  const hashedUri = ethers.utils.keccak256(ethers.utils.toUtf8Bytes(uri));
  const signature = await signer.signMessage(ethers.utils.arrayify(hashedUri));
  return signature;
}

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
    
    await expect(mmsbt.connect(owner).setUriSigner(SIGNER_ADDRESS)).to.not.reverted;

    const uri = "ipfs://xxxxx/";
    const signature = await generateSignature(uri);

    // mint
    const tx = mmsbt.connect(minter).mint(uri, signature, {value: parseEther('0.005')});
    await expect(tx).to.emit(mmsbt, 'Transfer').withArgs(AddressZero, minter.address, 0);
    await expect(tx).to.emit(mmsbt, 'Locked').withArgs(0);
    
    expect((await mmsbt.totalSupply()).toString()).to.equal("1");
    expect((await mmsbt.nextTokenId()).toString()).to.equal("1");
  });

  it("Should fail to mint a new token with wrong price", async function () {
    expect((await mmsbt.totalSupply()).toString()).to.equal("0");
    expect((await mmsbt.nextTokenId()).toString()).to.equal("0");

    await expect(mmsbt.connect(owner).setUriSigner(SIGNER_ADDRESS)).to.not.reverted;

    const uri = "ipfs://xxxxx/";
    const signature = await generateSignature(uri);

    // mint
    await expect(mmsbt.mint(uri, signature, {value: parseEther('0.1')})).to.revertedWith("Invalid amount of eth.");
    
    expect((await mmsbt.totalSupply()).toString()).to.equal("0");
    expect((await mmsbt.nextTokenId()).toString()).to.equal("0");
  });

  it("Should fail to mint a new token without payment", async function () {
    expect((await mmsbt.totalSupply()).toString()).to.equal("0");
    expect((await mmsbt.nextTokenId()).toString()).to.equal("0");

    await expect(mmsbt.connect(owner).setUriSigner(SIGNER_ADDRESS)).to.not.reverted;

    const uri = "ipfs://xxxxx/";
    const signature = await generateSignature(uri);

    // mint
    await expect(mmsbt.mint(uri, signature)).to.revertedWith("Invalid amount of eth.");
    
    expect((await mmsbt.totalSupply()).toString()).to.equal("0");
    expect((await mmsbt.nextTokenId()).toString()).to.equal("0");
  });

  it("Should fail to mint a new token with wrong signature", async function () {
    expect((await mmsbt.totalSupply()).toString()).to.equal("0");
    expect((await mmsbt.nextTokenId()).toString()).to.equal("0");

    // Set other signer address
    await expect(mmsbt.connect(owner).setUriSigner(other.address)).to.not.reverted;

    const uri = "ipfs://xxxxx/";
    const signature = await generateSignature(uri);

    // mint
    await expect(mmsbt.mint(uri, signature, {value: parseEther('0.005')})).to.revertedWith("invalid signer");
    
    expect((await mmsbt.totalSupply()).toString()).to.equal("0");
    expect((await mmsbt.nextTokenId()).toString()).to.equal("0");
  });

  // --- team mint ---
  it("Should be able to mint a new token without signature and payment by owner", async function () {
    expect((await mmsbt.totalSupply()).toString()).to.equal("0");
    expect((await mmsbt.nextTokenId()).toString()).to.equal("0");
    
    // mint
    const tx = mmsbt.connect(owner).teamMint("ipfs://xxxxx/", other.address);
    await expect(tx).to.emit(mmsbt, 'Transfer').withArgs(AddressZero, other.address, 0);
    await expect(tx).to.emit(mmsbt, 'Locked').withArgs(0);
    
    expect((await mmsbt.totalSupply()).toString()).to.equal("1");
    expect((await mmsbt.nextTokenId()).toString()).to.equal("1");
  });

  it("Should fail to mint a new token without signature and payment by non owner", async function () {
    expect((await mmsbt.totalSupply()).toString()).to.equal("0");
    expect((await mmsbt.nextTokenId()).toString()).to.equal("0");
    
    // mint
    await expect(mmsbt.connect(minter).teamMint("ipfs://xxxxx/", other.address)).to.revertedWith("Ownable: caller is not the owner");
    
    expect((await mmsbt.totalSupply()).toString()).to.equal("0");
    expect((await mmsbt.nextTokenId()).toString()).to.equal("0");
  });

  // --- burn ---
  it("Should be able to burn a token by its owner", async function () {
    expect((await mmsbt.totalSupply()).toString()).to.equal("0");
    expect((await mmsbt.nextTokenId()).toString()).to.equal("0");

    await expect(mmsbt.connect(owner).setUriSigner(SIGNER_ADDRESS)).to.not.reverted;

    const uri = "ipfs://xxxxx/";
    const signature = await generateSignature(uri);    

    // mint
    await expect(mmsbt.connect(minter).mint(uri, signature, {value: parseEther('0.005')})).to.emit(mmsbt, 'Transfer').withArgs(AddressZero, minter.address, 0);
    
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

    await expect(mmsbt.connect(owner).setUriSigner(SIGNER_ADDRESS)).to.not.reverted;

    const uri = "ipfs://xxxxx/";
    const signature = await generateSignature(uri);

    // mint
    await expect(mmsbt.connect(minter).mint(uri, signature, {value: parseEther('0.005')})).to.emit(mmsbt, 'Transfer').withArgs(AddressZero, minter.address, 0);
    
    expect((await mmsbt.totalSupply()).toString()).to.equal("1");
    expect((await mmsbt.nextTokenId()).toString()).to.equal("1");

    // burn should fail even with contract owner
    await expect(mmsbt.connect(owner).burn(0)).to.revertedWith("Only owner of the token can burn");

    expect((await mmsbt.totalSupply()).toString()).to.equal("1");
    expect((await mmsbt.nextTokenId()).toString()).to.equal("1");    
  });

  // --- test locked ---
  it("Minted token should be locked", async function () {
    expect((await mmsbt.totalSupply()).toString()).to.equal("0");
    expect((await mmsbt.nextTokenId()).toString()).to.equal("0");

    await expect(mmsbt.connect(owner).setUriSigner(SIGNER_ADDRESS)).to.not.reverted;

    const uri = "ipfs://xxxxx/";
    const signature = await generateSignature(uri);    

    // mint
    await expect(mmsbt.connect(minter).mint(uri, signature, {value: parseEther('0.005')})).to.emit(mmsbt, 'Transfer').withArgs(AddressZero, minter.address, 0);
    
    expect((await mmsbt.totalSupply()).toString()).to.equal("1");
    expect((await mmsbt.nextTokenId()).toString()).to.equal("1");

    // check if it's locked
    expect((await mmsbt.locked(0))).to.equal(true);
  });

  it("Non-existing token shouldn't return lock state", async function () {
    // check if it's locked
    await expect(mmsbt.locked(0)).to.be.revertedWith("token doesn't exist");
  })

  // --- test tokenURI ---
  it("token URI must be returned for minted token Id", async function() {
    await expect(mmsbt.connect(owner).setUriSigner(SIGNER_ADDRESS)).to.not.reverted;

    const uri = "ipfs://xxxxx/";
    const signature = await generateSignature(uri);

    // mint
    await expect(mmsbt.connect(minter).mint(uri, signature, {value: parseEther('0.005')})).to.emit(mmsbt, 'Transfer').withArgs(AddressZero, minter.address, 0);
    
    expect((await mmsbt.tokenURI(0))).to.equal(uri);
  });

  it("token URI must be return error for unminted token Id", async function() {
    await expect(mmsbt.tokenURI(10)).to.be.revertedWith("URI query for nonexistent token");
  });

  // --- test setTokenURI ---
  it("token URI should be able to be changed by owner", async function() {
    await expect(mmsbt.connect(owner).setUriSigner(SIGNER_ADDRESS)).to.not.reverted;

    const uri = "ipfs://xxxxx/";
    const signature = await generateSignature(uri);

    // mint
    await expect(mmsbt.connect(minter).mint(uri, signature, {value: parseEther('0.005')})).to.emit(mmsbt, 'Transfer').withArgs(AddressZero, minter.address, 0);
    
    expect((await mmsbt.tokenURI(0))).to.equal(uri);

    // Change URI
    const newUri = "ipfs://yyyyy/";
    await expect(mmsbt.connect(owner).setTokenURI(0, newUri)).to.not.reverted;

    expect((await mmsbt.tokenURI(0))).to.equal(newUri);
  });

  it("token URI should not be able to be changed by non-owner", async function() {
    await expect(mmsbt.connect(owner).setUriSigner(SIGNER_ADDRESS)).to.not.reverted;

    const uri = "ipfs://xxxxx/";
    const signature = await generateSignature(uri);

    // mint
    await expect(mmsbt.connect(minter).mint(uri, signature, {value: parseEther('0.005')})).to.emit(mmsbt, 'Transfer').withArgs(AddressZero, minter.address, 0);
    
    expect((await mmsbt.tokenURI(0))).to.equal(uri);

    // Change URI
    await expect(mmsbt.connect(other).setTokenURI(0, "ipfs://yyyyy/")).to.be.revertedWith("Ownable: caller is not the owner");

    expect((await mmsbt.tokenURI(0))).to.equal(uri);
  });

  it("setTokenURI must return error for unminted token Id", async function() {
    await expect(mmsbt.connect(owner).setTokenURI(0, "ipfs://yyyyy/")).to.be.revertedWith("token doesn't exist");
  });  

  // --- test setTokenPrice ---
  it("token price can be changed by owner", async function() {
    expect((await mmsbt.tokenPrice())).to.equal(parseEther('0.005')); 

    await expect(mmsbt.connect(owner).setUriSigner(SIGNER_ADDRESS)).to.not.reverted;

    const uri = "ipfs://xxxxx/";
    const signature = await generateSignature(uri);    

    // mint
    await expect(mmsbt.connect(minter).mint(uri, signature, {value: parseEther('0.005')})).to.emit(mmsbt, 'Transfer').withArgs(AddressZero, minter.address, 0);

    // change price
    await expect(mmsbt.setTokenPrice(parseEther('0.1'))).to.not.reverted;
    
    expect((await mmsbt.tokenPrice())).to.equal(parseEther('0.1')); 

    // mint
    await expect(mmsbt.connect(minter).mint(uri, signature, {value: parseEther('0.1')})).to.emit(mmsbt, 'Transfer').withArgs(AddressZero, minter.address, 1);
  });

  it("token price must not be changed by non owner", async function() {
    expect((await mmsbt.tokenPrice())).to.equal(parseEther('0.005')); 

    // change price
    await expect(mmsbt.connect(other).setTokenPrice(parseEther('0.1'))).to.revertedWith("Ownable: caller is not the owner");
    
    expect((await mmsbt.tokenPrice())).to.equal(parseEther('0.005')); 
  });  

  // --- test setUriSigner ---
  it("uriSigner can be change by owner", async function() {
    // change usigner
    await expect(mmsbt.connect(owner).setUriSigner(other.address)).to.not.reverted;
  });

  it("uriSigner must not be changed by non owner", async function() {
    // change price
    await expect(mmsbt.connect(other).setUriSigner(other.address)).to.revertedWith("Ownable: caller is not the owner");
  });    

  // --- test approve ---
  it("approve must fail regardless", async function() {
    await expect(mmsbt.connect(owner).setUriSigner(SIGNER_ADDRESS)).to.not.reverted;

    const uri = "ipfs://xxxxx/";
    const signature = await generateSignature(uri);

    // mint
    await expect(mmsbt.connect(minter).mint(uri, signature, {value: parseEther('0.005')})).to.emit(mmsbt, 'Transfer').withArgs(AddressZero, minter.address, 0);

    // approve
    await expect(mmsbt.connect(minter).approve(other.address, 0)).to.revertedWith("SBT isn't transferable");
  });

  // --- test setApprovalForAll ---
  it("setApprovalForAll must fail regardless", async function() {
    await expect(mmsbt.connect(owner).setUriSigner(SIGNER_ADDRESS)).to.not.reverted;

    const uri = "ipfs://xxxxx/";
    const signature = await generateSignature(uri);

    // mint
    await expect(mmsbt.connect(minter).mint(uri, signature, {value: parseEther('0.005')})).to.emit(mmsbt, 'Transfer').withArgs(AddressZero, minter.address, 0);

    // setApprovalForAll
    await expect(mmsbt.connect(minter).setApprovalForAll(other.address, true)).to.revertedWith("SBT isn't transferable");
  });

  // --- test transferFrom ---
  it("transferFrom must fail", async function() {
    await expect(mmsbt.connect(owner).setUriSigner(SIGNER_ADDRESS)).to.not.reverted;

    const uri = "ipfs://xxxxx/";
    const signature = await generateSignature(uri);

    // mint
    await expect(mmsbt.connect(minter).mint(uri, signature, {value: parseEther('0.005')})).to.emit(mmsbt, 'Transfer').withArgs(AddressZero, minter.address, 0);

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

  // --- test supportsInterface
  it("IERC5192 should be supported", async function() {
    // IERC5192 
    expect(await mmsbt.supportsInterface("0xb45a3c0e")).to.equal(true);
  })  

  it("ERC721 should be supported", async function() {
    // ERC721 
    expect(await mmsbt.supportsInterface("0x80ac58cd")).to.equal(true);
  })    

});