const { AddressZero } = require('@ethersproject/constants');
const { expect, assert } = require("chai");
const { parseEther } = require('ethers/lib/utils');
const { waffle, ethers } = require("hardhat");

const provider = waffle.provider;

describe("MEGAMIFourSeasonsAndFlowers", function () {
    beforeEach(async function () {  
        [owner, seller, minter, other] = await ethers.getSigners();

        const FSAF = await hre.ethers.getContractFactory("MEGAMIFourSeasonsAndFlowers");
        fsaf = await FSAF.deploy();

        // To deploy our contract, we just have to call Token.deploy() and await
        // for it to be deployed(), which happens once its transaction has been
        // mined.
        await fsaf.deployed();
    });

    // --- set tokenURI tests ---
    it("Should be able to set the baseURI", async function () {
        await expect(fsaf.setBaseURI("ipfs://yyyyy/")).not.to.be.reverted;
    });

    it("Should fail to set the baseURI if non owner tries", async function () {
        await expect(fsaf.connect(other).setBaseURI("ipfs://yyyyy/")).to.be.revertedWith("Ownable: caller is not the owner");
    });    

    it("Should be able to set the tokenURI", async function () {
        await expect(fsaf.setTokenURI(1, "ipfs://xxxxx/")).not.to.be.reverted;

        expect(await fsaf.uri(1)).to.equal("ipfs://xxxxx/");
    });

    it("Should fail to set the tokenURI if non owner tries", async function () {
        await expect(fsaf.connect(other).setTokenURI(1, "ipfs://yyyyy/")).to.be.revertedWith("Ownable: caller is not the owner");
    });   

    it("Should be able to get uri based on baseURI and tokenURI", async function () {
        await expect(fsaf.setBaseURI("ipfs://xxxxx/")).not.to.be.reverted;
        await expect(fsaf.setTokenURI(1, "1.json")).not.to.be.reverted;

        expect(await fsaf.uri(1)).to.equal("ipfs://xxxxx/1.json");
    });

    // --- create tests ---
    it("Should be able to create a token", async function() {
        tx = fsaf.create(10, "ipfs://xxxxx/1.json");
        
        await expect(tx).not.to.be.reverted;
        await expect(tx).to.emit(fsaf, 'TransferSingle').withArgs(owner.address, AddressZero, owner.address, 10, 1);
    });

    it("Should fail to create a token if non owner tries", async function() {
        await expect(fsaf.connect(other).create(1, "ipfs://xxxxx/1.json")).to.be.revertedWith("Ownable: caller is not the owner");
    });

    it("Should not be able to create the same token twice", async function() {
        // create a token
        tx = fsaf.create(10, "ipfs://xxxxx/1.json");
        
        await expect(tx).not.to.be.reverted;
        await expect(tx).to.emit(fsaf, 'TransferSingle').withArgs(owner.address, AddressZero, owner.address, 10, 1);

        // try to create the token again
        await expect(fsaf.create(10, "ipfs://xxxxx/1.json")).to.be.revertedWith("token already exist");
    });    

    // --- mint tests ---
    it("Should be able to mint a token", async function() {
        // create a token first
        await expect(fsaf.create(10, "ipfs://xxxxx/1.json")).not.to.be.reverted;

        // mint the token
        tx = fsaf.mint(minter.address, 10, 1, "0x");
        await expect(tx).not.to.be.reverted;
        await expect(tx).to.emit(fsaf, 'TransferSingle').withArgs(owner.address, AddressZero, minter.address, 10, 1);
    });
  
    it("Should fail to mint a token if non owner tries", async function() {
        // create a token first
        await expect(fsaf.create(10, "ipfs://xxxxx/1.json")).not.to.be.reverted;

        // mint the token
        await expect(fsaf.connect(other).mint(minter.address, 10, 1, "0x")).to.be.revertedWith("Ownable: caller is not the owner");
    });

    // --- mint batch tests ---
    it("Should be able to mint multipe tokens at once", async function() {
        // create tokens first
        await expect(fsaf.create(10, "ipfs://xxxxx/1.json")).not.to.be.reverted;
        await expect(fsaf.create(20, "ipfs://xxxxx/2.json")).not.to.be.reverted;

        // mint the tokens
        tx = fsaf.mintBatch(minter.address, [10, 20], [1, 2], "0x");
        await expect(tx).not.to.be.reverted;
        await expect(tx).to.emit(fsaf, 'TransferBatch').withArgs(owner.address, AddressZero, minter.address, [10, 20], [1, 2]);
    });

    it("Should fail to mint multiple tokens if non owner tries", async function() {
        // create tokens first
        await expect(fsaf.create(10, "ipfs://xxxxx/1.json")).not.to.be.reverted;
        await expect(fsaf.create(20, "ipfs://xxxxx/2.json")).not.to.be.reverted;

        await expect(fsaf.connect(other).mintBatch(minter.address, [10, 20], [1, 2], "0x")).to.be.revertedWith("Ownable: caller is not the owner");
    });

    // --- airdrop tests ---
    it("Should be able to send a token to multiple recipients", async function() {
        // create tokens first
        await expect(fsaf.create(10, "ipfs://xxxxx/1.json")).not.to.be.reverted;

        tx = fsaf.airdrop(10, [[seller.address,1], [minter.address,2], [other.address,3]]);
        await expect(tx).not.to.be.reverted;
        await expect(tx).to.emit(fsaf, 'TransferSingle').withArgs(owner.address, AddressZero, seller.address, 10, 1);
        await expect(tx).to.emit(fsaf, 'TransferSingle').withArgs(owner.address, AddressZero, minter.address, 10, 2);
        await expect(tx).to.emit(fsaf, 'TransferSingle').withArgs(owner.address, AddressZero, other.address, 10, 3);
    })

    it("Should fail to send a token to multiple recipients if token doesn't exist", async function() {
        await expect(fsaf.airdrop(10, [[seller.address,1], [minter.address,2], [other.address,3]])).to.be.revertedWith("token doesn't exist");
    })    

    it("Should fail to send a token to multiple recipients if recipient is 0", async function() {
        // create tokens first
        await expect(fsaf.create(10, "ipfs://xxxxx/1.json")).not.to.be.reverted;
                
        await expect(fsaf.airdrop(10, [])).to.be.revertedWith("no recipients");
    })        

    it("Should fail to send a token to multiple recipients if non owner tries it", async function() {
        // create tokens first
        await expect(fsaf.create(10, "ipfs://xxxxx/1.json")).not.to.be.reverted;
                
        await expect(fsaf.connect(other).airdrop(10, [[seller.address, 1], [minter.address, 2], [other.address, 3]])).to.be.revertedWith("Ownable: caller is not the owner");
    })       

    // --- burn tests ---
    it("Should be able to burn a token", async function() {
        // create tokens first
        await expect(fsaf.create(10, "ipfs://xxxxx/1.json")).not.to.be.reverted;
        
        // mint the token
        tx = fsaf.mint(minter.address, 10, 1, "0x");
        await expect(tx).not.to.be.reverted;
        await expect(tx).to.emit(fsaf, 'TransferSingle').withArgs(owner.address, AddressZero, minter.address, 10, 1);

        // burn the token
        tx2 = fsaf.burn(minter.address, 10, 1);
        await expect(tx2).not.to.be.reverted;
        await expect(tx2).to.emit(fsaf, 'TransferSingle').withArgs(owner.address, minter.address, AddressZero, 10, 1);
    });

    it("Should fail to burn a token if non owner tries", async function() {
        // create tokens first
        await expect(fsaf.create(10, "ipfs://xxxxx/1.json")).not.to.be.reverted;
        
        // mint the token
        tx = fsaf.mint(minter.address, 10, 1, "0x");
        await expect(tx).not.to.be.reverted;
        await expect(tx).to.emit(fsaf, 'TransferSingle').withArgs(owner.address, AddressZero, minter.address, 10, 1);

        // burn the token
        await expect(fsaf.connect(other).burn(minter.address, 10, 1)).to.be.revertedWith("Ownable: caller is not the owner");
    });

    it("Should fail to burn a token more than the total supply", async function() {
        // create tokens first
        await expect(fsaf.create(10, "ipfs://xxxxx/1.json")).not.to.be.reverted;
        
        // mint the token
        tx = fsaf.mint(minter.address, 10, 1, "0x");
        await expect(tx).not.to.be.reverted;
        await expect(tx).to.emit(fsaf, 'TransferSingle').withArgs(owner.address, AddressZero, minter.address, 10, 1);

        // burn the token
        await expect(fsaf.burn(minter.address, 10, 5)).to.be.revertedWith("ERC1155: burn amount exceeds totalSupply");
    });    

    // --- burnBatch tests ---
    it("Should be able to burn multiple tokens at once", async function() {
        // create tokens first
        await expect(fsaf.create(10, "ipfs://xxxxx/1.json")).not.to.be.reverted;
        await expect(fsaf.create(20, "ipfs://xxxxx/2.json")).not.to.be.reverted;

        // mint the tokens
        tx = fsaf.mintBatch(minter.address, [10, 20], [1, 2], "0x");
        await expect(tx).not.to.be.reverted;
        await expect(tx).to.emit(fsaf, 'TransferBatch').withArgs(owner.address, AddressZero, minter.address, [10, 20], [1, 2]);

        // burn the tokens
        tx2 = fsaf.burnBatch(minter.address, [10, 20], [1, 2]);
        await expect(tx2).not.to.be.reverted;
        await expect(tx2).to.emit(fsaf, 'TransferBatch').withArgs(owner.address, minter.address, AddressZero, [10, 20], [1, 2]);
    });    

    it("Should fail to burn multiple tokens if non owner tries", async function() {
        // create tokens first
        await expect(fsaf.create(10, "ipfs://xxxxx/1.json")).not.to.be.reverted;
        await expect(fsaf.create(20, "ipfs://xxxxx/2.json")).not.to.be.reverted;

        // mint the tokens
        tx = fsaf.mintBatch(minter.address, [10, 20], [1, 2], "0x");
        await expect(tx).not.to.be.reverted;
        await expect(tx).to.emit(fsaf, 'TransferBatch').withArgs(owner.address, AddressZero, minter.address, [10, 20], [1, 2]);

        // burn the tokens
        await expect(fsaf.connect(other).burnBatch(minter.address, [10, 20], [1, 2])).to.be.revertedWith("Ownable: caller is not the owner");
    });        

    // --- safeTransferFrom tests ---
    it("Should be able to transfer to others", async function() {
        // create a token first
        await expect(fsaf.create(10, "ipfs://xxxxx/1.json")).not.to.be.reverted;

        // mint the token
        await expect(fsaf.mint(minter.address, 10, 1, "0x")).not.to.be.reverted;

        // transfer to another wallet
        tx = fsaf.connect(minter).safeTransferFrom(minter.address, other.address, 10, 1, "0x");
        await expect(tx).not.to.be.reverted;
        await expect(tx).to.emit(fsaf, 'TransferSingle').withArgs(minter.address, minter.address, other.address, 10, 1);
    });
    
    it("Should fail to transfer to others if the token doesn't exist", async function() {
        // transfer to another wallet
        await expect(fsaf.connect(minter).safeTransferFrom(minter.address, other.address, 10, 1, "0x")).to.be.revertedWith("ERC1155: insufficient balance for transfer");
    });

    // --- safeBatchTransferFrom tests ---
    it("Should be able to transfer to others", async function() {
        // create tokens first
        await expect(fsaf.create(10, "ipfs://xxxxx/1.json")).not.to.be.reverted;
        await expect(fsaf.create(20, "ipfs://xxxxx/2.json")).not.to.be.reverted;

        // mint the tokens
        tx = fsaf.mintBatch(minter.address, [10, 20], [1, 2], "0x");
        await expect(tx).not.to.be.reverted;
        await expect(tx).to.emit(fsaf, 'TransferBatch').withArgs(owner.address, AddressZero, minter.address, [10, 20], [1, 2]);

        // transfer to another wallet
        tx2 = fsaf.connect(minter).safeBatchTransferFrom(minter.address, other.address, [10, 20], [1, 2], "0x");
        await expect(tx2).not.to.be.reverted;
        await expect(tx2).to.emit(fsaf, 'TransferBatch').withArgs(minter.address, minter.address, other.address, [10, 20], [1, 2]);
    });
    
    // --- Royalty tests ---   
    it("Should fail to set invalid address to the defaultRoyaltyInfo", async function () {
        // set new defaultRoyaltyInfo with invalid address
        await expect(fsaf.setDefaultRoyaltyInfo(AddressZero, 500)).to.revertedWith("invalid address");
    });   
    
    it("Should be able to set the new default royalty info with up-to 15%", async function () {
        // set new defaultRoyaltyInfo
        await expect(fsaf.setDefaultRoyaltyInfo(owner.address, 1500)).not.to.be.reverted;

        // get royalty
        royalty = await fsaf.royaltyInfo(1, 100000);
    
        expect(royalty[0]).to.equal(owner.address);
        expect(royalty[1]).to.equal(15000);
    }); 

    it("Should be able to set the new custom royalty info", async function () {
        // set new setCustomRoyaltyInfo
        await expect(fsaf.setCustomRoyaltyInfo(1, owner.address, 3000)).not.to.be.reverted;

        // get custom royalty
        royalty = await fsaf.royaltyInfo(1, 100000);
    
        expect(royalty[0]).to.equal(owner.address);
        expect(royalty[1]).to.equal(30000);

        // default royalty shouldn't be changed
        royalty = await fsaf.royaltyInfo(2, 100000);
    
        expect(royalty[0]).to.equal(fsaf.address);
        expect(royalty[1]).to.equal(10000);        
    });     

    it("Should be able to reset custom royalty by setting zero addrss", async function () {
        // set new setCustomRoyaltyInfo
        await expect(fsaf.setCustomRoyaltyInfo(1, owner.address, 1500)).not.to.be.reverted;

        // get custom royalty
        royalty = await fsaf.royaltyInfo(1, 100000);
    
        expect(royalty[0]).to.equal(owner.address);
        expect(royalty[1]).to.equal(15000);        
        
        // set new defaultRoyaltyInfo with zero address
        await expect(fsaf.setCustomRoyaltyInfo(1, AddressZero, 500)).not.to.be.reverted;

        // get default royalty again
        royalty = await fsaf.royaltyInfo(1, 100000);
    
        expect(royalty[0]).to.equal(fsaf.address);
        expect(royalty[1]).to.equal(10000);            
    });   
    
    it("Should return default royalty through getRaribleV2Royalties", async function () {
        // get royalty through Rarible's interface
        royalty = await fsaf.getRaribleV2Royalties(1);
    
        expect(royalty[0].value).to.equal(1000);
        expect(royalty[0].account).to.equal(fsaf.address);
    });   

    it("Should return custom royalty through getRaribleV2Royalties if it's set", async function () {
        // set new setCustomRoyaltyInfo
        await expect(fsaf.setCustomRoyaltyInfo(1, owner.address, 500)).not.to.be.reverted;

        // get royalty through Rarible's interface
        royalty = await fsaf.getRaribleV2Royalties(1);
    
        expect(royalty[0].value).to.equal(500);
        expect(royalty[0].account).to.equal(owner.address);
    });   
    
    it("Should return default royalty through royaltyInfo", async function () {
        // get royalty
        royalty = await fsaf.royaltyInfo(1, 100000);
    
        expect(royalty[0]).to.equal(fsaf.address);
        expect(royalty[1]).to.equal(10000);
    });

    it("Should return custom royalty through royaltyInfo", async function () {
        // set new setCustomRoyaltyInfo
        await expect(fsaf.setCustomRoyaltyInfo(1, owner.address, 500)).not.to.be.reverted;
                
        // get royalty
        royalty = await fsaf.royaltyInfo(1, 100000);
    
        expect(royalty[0]).to.equal(owner.address);
        expect(royalty[1]).to.equal(5000);
    });
    
    it("Should support LibRoyaltiesV2", async function () {
        // get check supported interface
        expect(await fsaf.supportsInterface(0xcad96cca)).to.equal(true);  // LibRoyaltiesV2
    });  
    
    it("Should support EIP-2981", async function () {
        // get check supported interface
        expect(await fsaf.supportsInterface(0x2a55205a)).to.equal(true);  // EIP-2981
    });   
        
    it("Should call upportsInterface of super classes", async function () {
        // get check supported interface
        expect(await fsaf.supportsInterface(0xffffffff)).to.equal(false);  // 
    });

    // --- test withdraw ---
    it("withdraw should send fund to owner", async function() {
        // Give 100 ETH to the contract through public mint
        await minter.sendTransaction({to: fsaf.address, value: parseEther("100")});
  
        const tx = fsaf.withdraw(other.address);
        await expect(tx).to.be.not.reverted;
        await expect(await tx).to.changeEtherBalance(other, parseEther("100"));
  
        // contract's wallet balance should be 0
        expect((await provider.getBalance(fsaf.address)).toString()).to.equal("0");
    })    
  
    it("withdraw should faild if recipient is 0", async function() {
      // Give 100 ETH to the contract through public mint
      await minter.sendTransaction({to: fsaf.address, value: parseEther("100")});
  
      await expect(fsaf.withdraw(AddressZero)).to.be.revertedWith("recipient shouldn't be 0");
  
      // contract's wallet balance shouldn't be changed
      expect((await provider.getBalance(fsaf.address)).toString()).to.equal(parseEther("100"));
    })    
  
    it("withdraw should faild if transaction is initiated by non-owner", async function() {
      // Give 100 ETH to the contract through public mint
      await minter.sendTransaction({to: fsaf.address, value: parseEther("100")});
  
      await expect(fsaf.connect(other).withdraw(other.address)).to.be.revertedWith("Ownable: caller is not the owner");
  
      // contract's wallet balance shouldn't be changed
      expect((await provider.getBalance(fsaf.address)).toString()).to.equal(parseEther("100"));
    })

    // --- test name and symbol ---
    it("should be able to get the default name and symbol", async function() {
        expect(await fsaf.name()).to.equal("MEGAMI Four Seasons and Flowers");
        expect(await fsaf.symbol()).to.equal("FSAF");
    });

    it("should be able to change the name and symbol", async function() {
        // Change the name and symbol
        await expect(fsaf.setNameAndSymbol("Sugoi MEGAMI Four Seasons and Flowers", "Sugoi FSAF")).to.be.not.reverted;

        // Confirm the change
        expect(await fsaf.name()).to.equal("Sugoi MEGAMI Four Seasons and Flowers");
        expect(await fsaf.symbol()).to.equal("Sugoi FSAF");
    })

    it("should fail to change the name and symbol if transaction is initiated by non-owner", async function() {
        // Change the name and symbol
        await expect(fsaf.connect(other).setNameAndSymbol("Sugoi MEGAMI Four Seasons and Flowers", "Sugoi FSAF")).to.be.reverted;

        // Confirm the change
        expect(await fsaf.name()).to.equal("MEGAMI Four Seasons and Flowers");
        expect(await fsaf.symbol()).to.equal("FSAF");
    })
});