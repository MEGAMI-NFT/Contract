const { AddressZero } = require('@ethersproject/constants');
const { expect, assert } = require("chai");
const { parseEther } = require('ethers/lib/utils');
const { waffle, ethers } = require("hardhat");

const provider = waffle.provider;

describe("MEGAMIX", function () {
    beforeEach(async function () {  
        [owner, seller, minter, other] = await ethers.getSigners();

        // Setup FundManager
        const FundManagerFactory = await ethers.getContractFactory("FundManager");
        fundManagerContract = await FundManagerFactory.deploy();

        const Megamix = await hre.ethers.getContractFactory("MEGAMIX");
        megamix = await Megamix.deploy(fundManagerContract.address);

        // To deploy our contract, we just have to call Token.deploy() and await
        // for it to be deployed(), which happens once its transaction has been
        // mined.
        await megamix.deployed();

        // For controller testings

        const MegamixController = await ethers.getContractFactory("MEGAMIXController");
        megamixControllerContract = await MegamixController.deploy(megamix.address);
    });

    // --- set tokenURI tests ---
    it("Should be able to set the baseURI", async function () {
        await expect(megamix.setBaseURI("ipfs://yyyyy/")).not.to.be.reverted;
    });

    it("Should fail to set the baseURI if non owner tries", async function () {
        await expect(megamix.connect(other).setBaseURI("ipfs://yyyyy/")).to.be.revertedWith("Ownable: caller is not the owner");
    });    

    it("Should be able to set the tokenURI", async function () {
        await expect(megamix.setTokenURI(1, "ipfs://xxxxx/")).not.to.be.reverted;

        expect(await megamix.uri(1)).to.equal("ipfs://xxxxx/");
    });

    it("Should fail to set the tokenURI if non owner tries", async function () {
        await expect(megamix.connect(other).setTokenURI(1, "ipfs://yyyyy/")).to.be.revertedWith("Ownable: caller is not the owner");
    });   

    it("Should be able to get uri based on baseURI and tokenURI", async function () {
        await expect(megamix.setBaseURI("ipfs://xxxxx/")).not.to.be.reverted;
        await expect(megamix.setTokenURI(1, "1.json")).not.to.be.reverted;

        expect(await megamix.uri(1)).to.equal("ipfs://xxxxx/1.json");
    });

    // --- create tests ---
    it("Should be able to create a token", async function() {
        tx = megamix.create(10, "ipfs://xxxxx/1.json", true);
        
        await expect(tx).not.to.be.reverted;
        await expect(tx).to.emit(megamix, 'TransferSingle').withArgs(owner.address, AddressZero, owner.address, 10, 1);
    });

    it("Should fail to create a token if non owner tries", async function() {
        await expect(megamix.connect(other).create(1, "ipfs://xxxxx/1.json", true)).to.be.revertedWith("Ownable: caller is not the owner");
    });

    it("Should be able to create the same token twice", async function() {
        // create a token
        tx = megamix.create(10, "ipfs://xxxxx/1.json", true);
        
        await expect(tx).not.to.be.reverted;
        await expect(tx).to.emit(megamix, 'TransferSingle').withArgs(owner.address, AddressZero, owner.address, 10, 1);

        // try to create the token again
        await expect(megamix.create(10, "ipfs://xxxxx/1.json", true)).to.be.revertedWith("token already exist");
    });    

    // --- mint tests ---
    it("Should be able to mint a token", async function() {
        // create a token first
        await expect(megamix.create(10, "ipfs://xxxxx/1.json", true)).not.to.be.reverted;

        // mint the token
        tx = megamix.mint(minter.address, 10, 1, "0x");
        await expect(tx).not.to.be.reverted;
        await expect(tx).to.emit(megamix, 'TransferSingle').withArgs(owner.address, AddressZero, minter.address, 10, 1);
    });

    it("Should be able to mint a token from the controller", async function() {
        // create a token first
        await expect(megamix.create(10, "ipfs://xxxxx/1.json", true)).not.to.be.reverted;

        // set the controller
        await expect(megamix.setControllerContract(megamixControllerContract.address)).to.be.not.reverted;

        // mint the token from the controller
        tx = megamixControllerContract.mint(minter.address, 10, 1, "0x");
        await expect(tx).not.to.be.reverted;
        await expect(tx).to.emit(megamix, 'TransferSingle').withArgs(megamixControllerContract.address, AddressZero, minter.address, 10, 1);
    });    
    
    it("Should fail to mint a token if non owner tries", async function() {
        // create a token first
        await expect(megamix.create(10, "ipfs://xxxxx/1.json", true)).not.to.be.reverted;

        // mint the token
        await expect(megamix.connect(other).mint(minter.address, 10, 1, "0x")).to.be.revertedWith("Ownable: caller is not the Owner or ControllerContract");
    });

    // --- mint batch tests ---
    it("Should be able to mint multipe tokens at once", async function() {
        // create tokens first
        await expect(megamix.create(10, "ipfs://xxxxx/1.json", true)).not.to.be.reverted;
        await expect(megamix.create(20, "ipfs://xxxxx/2.json", true)).not.to.be.reverted;

        // mint the tokens
        tx = megamix.mintBatch(minter.address, [10, 20], [1, 2], "0x");
        await expect(tx).not.to.be.reverted;
        await expect(tx).to.emit(megamix, 'TransferBatch').withArgs(owner.address, AddressZero, minter.address, [10, 20], [1, 2]);
    });

    it("Should be able to mint multipe tokens at once from the controller", async function() {
        // create a token first
        await expect(megamix.create(10, "ipfs://xxxxx/1.json", true)).not.to.be.reverted;

        // set the controller
        await expect(megamix.setControllerContract(megamixControllerContract.address)).to.be.not.reverted;

        // mint the token from the controller
        tx = megamixControllerContract.mintBatch(minter.address, [10, 20], [1, 2], "0x");
        await expect(tx).not.to.be.reverted;
        await expect(tx).to.emit(megamix, 'TransferBatch').withArgs(megamixControllerContract.address, AddressZero, minter.address, [10, 20], [1, 2]);
    });    

    it("Should fail to mint multiple tokens if non owner tries", async function() {
        // create tokens first
        await expect(megamix.create(10, "ipfs://xxxxx/1.json", true)).not.to.be.reverted;
        await expect(megamix.create(20, "ipfs://xxxxx/2.json", true)).not.to.be.reverted;

        await expect(megamix.connect(other).mintBatch(minter.address, [10, 20], [1, 2], "0x")).to.be.revertedWith("Ownable: caller is not the Owner or ControllerContract");
    });

    // --- airdrop tests ---
    it("Should be able to send a token to multiple recipients", async function() {
        // create tokens first
        await expect(megamix.create(10, "ipfs://xxxxx/1.json", true)).not.to.be.reverted;

        tx = megamix.airdrop(10, 1, [seller.address, minter.address, other.address]);
        await expect(tx).not.to.be.reverted;
        await expect(tx).to.emit(megamix, 'TransferSingle').withArgs(owner.address, AddressZero, seller.address, 10, 1);
        await expect(tx).to.emit(megamix, 'TransferSingle').withArgs(owner.address, AddressZero, minter.address, 10, 1);
        await expect(tx).to.emit(megamix, 'TransferSingle').withArgs(owner.address, AddressZero, other.address, 10, 1);
    })

    it("Should fail to send a token to multiple recipients if token doesn't exist", async function() {
        await expect(megamix.airdrop(10, 1, [seller.address, minter.address, other.address])).to.be.revertedWith("token doesn't exist");
    })    

    it("Should fail to send a token to multiple recipients if amount is 0", async function() {
        // create tokens first
        await expect(megamix.create(10, "ipfs://xxxxx/1.json", true)).not.to.be.reverted;
                
        await expect(megamix.airdrop(10, 0, [seller.address, minter.address, other.address])).to.be.revertedWith("amount should be more than 0");
    })    

    it("Should fail to send a token to multiple recipients if recipient is 0", async function() {
        // create tokens first
        await expect(megamix.create(10, "ipfs://xxxxx/1.json", true)).not.to.be.reverted;
                
        await expect(megamix.airdrop(10, 1, [])).to.be.revertedWith("no recipients");
    })        

    it("Should fail to send a token to multiple recipients if non owner tries it", async function() {
        // create tokens first
        await expect(megamix.create(10, "ipfs://xxxxx/1.json", true)).not.to.be.reverted;
                
        await expect(megamix.connect(other).airdrop(10, 1, [seller.address, minter.address, other.address])).to.be.revertedWith("Ownable: caller is not the owner");
    })       

    // --- burn tests ---
    it("Should be able to burn a token", async function() {
        // create tokens first
        await expect(megamix.create(10, "ipfs://xxxxx/1.json", true)).not.to.be.reverted;
        
        // mint the token
        tx = megamix.mint(minter.address, 10, 1, "0x");
        await expect(tx).not.to.be.reverted;
        await expect(tx).to.emit(megamix, 'TransferSingle').withArgs(owner.address, AddressZero, minter.address, 10, 1);

        // burn the token
        tx2 = megamix.burn(minter.address, 10, 1);
        await expect(tx2).not.to.be.reverted;
        await expect(tx2).to.emit(megamix, 'TransferSingle').withArgs(owner.address, minter.address, AddressZero, 10, 1);
    });

    it("Should be able to burn a token from the controller", async function() {
        // create a token first
        await expect(megamix.create(10, "ipfs://xxxxx/1.json", true)).not.to.be.reverted;

        // mint the token
        tx = megamix.mint(minter.address, 10, 1, "0x");
        await expect(tx).not.to.be.reverted;
        await expect(tx).to.emit(megamix, 'TransferSingle').withArgs(owner.address, AddressZero, minter.address, 10, 1);
        
        // set the controller
        await expect(megamix.setControllerContract(megamixControllerContract.address)).to.be.not.reverted;

        // burn the token from the controller
        tx2 = megamixControllerContract.burn(minter.address, 10, 1);
        await expect(tx2).not.to.be.reverted;
        await expect(tx2).to.emit(megamix, 'TransferSingle').withArgs(megamixControllerContract.address, minter.address, AddressZero, 10, 1);
    });        

    it("Should fail to burn a token if non owner tries", async function() {
        // create tokens first
        await expect(megamix.create(10, "ipfs://xxxxx/1.json", true)).not.to.be.reverted;
        
        // mint the token
        tx = megamix.mint(minter.address, 10, 1, "0x");
        await expect(tx).not.to.be.reverted;
        await expect(tx).to.emit(megamix, 'TransferSingle').withArgs(owner.address, AddressZero, minter.address, 10, 1);

        // burn the token
        await expect(megamix.connect(other).burn(minter.address, 10, 1)).to.be.revertedWith("Ownable: caller is not the Owner or ControllerContract");
    });

    it("Should fail to burn a token more than the total supply", async function() {
        // create tokens first
        await expect(megamix.create(10, "ipfs://xxxxx/1.json", true)).not.to.be.reverted;
        
        // mint the token
        tx = megamix.mint(minter.address, 10, 1, "0x");
        await expect(tx).not.to.be.reverted;
        await expect(tx).to.emit(megamix, 'TransferSingle').withArgs(owner.address, AddressZero, minter.address, 10, 1);

        // burn the token
        await expect(megamix.burn(minter.address, 10, 5)).to.be.revertedWith("ERC1155: burn amount exceeds totalSupply");
    });    

    // --- burnBatch tests ---
    it("Should be able to burn multiple tokens at once", async function() {
        // create tokens first
        await expect(megamix.create(10, "ipfs://xxxxx/1.json", true)).not.to.be.reverted;
        await expect(megamix.create(20, "ipfs://xxxxx/2.json", true)).not.to.be.reverted;

        // mint the tokens
        tx = megamix.mintBatch(minter.address, [10, 20], [1, 2], "0x");
        await expect(tx).not.to.be.reverted;
        await expect(tx).to.emit(megamix, 'TransferBatch').withArgs(owner.address, AddressZero, minter.address, [10, 20], [1, 2]);

        // burn the tokens
        tx2 = megamix.burnBatch(minter.address, [10, 20], [1, 2]);
        await expect(tx2).not.to.be.reverted;
        await expect(tx2).to.emit(megamix, 'TransferBatch').withArgs(owner.address, minter.address, AddressZero, [10, 20], [1, 2]);
    });    

    it("Should be able to burn multiple tokens at once from the controller", async function() {
        // create a token first
        await expect(megamix.create(10, "ipfs://xxxxx/1.json", true)).not.to.be.reverted;

        // mint the tokens
        tx = megamix.mintBatch(minter.address, [10, 20], [1, 2], "0x");
        await expect(tx).not.to.be.reverted;
        await expect(tx).to.emit(megamix, 'TransferBatch').withArgs(owner.address, AddressZero, minter.address, [10, 20], [1, 2]);
        
        // set the controller
        await expect(megamix.setControllerContract(megamixControllerContract.address)).to.be.not.reverted;

        // burn the tokens from the controller
        tx2 = megamixControllerContract.burnBatch(minter.address, [10, 20], [1, 2]);
        await expect(tx2).not.to.be.reverted;
        await expect(tx2).to.emit(megamix, 'TransferBatch').withArgs(megamixControllerContract.address, minter.address, AddressZero, [10, 20], [1, 2]);
    });      

    it("Should fail to burn multiple tokens if non owner tries", async function() {
        // create tokens first
        await expect(megamix.create(10, "ipfs://xxxxx/1.json", true)).not.to.be.reverted;
        await expect(megamix.create(20, "ipfs://xxxxx/2.json", true)).not.to.be.reverted;

        // mint the tokens
        tx = megamix.mintBatch(minter.address, [10, 20], [1, 2], "0x");
        await expect(tx).not.to.be.reverted;
        await expect(tx).to.emit(megamix, 'TransferBatch').withArgs(owner.address, AddressZero, minter.address, [10, 20], [1, 2]);

        // burn the tokens
        await expect(megamix.connect(other).burnBatch(minter.address, [10, 20], [1, 2])).to.be.revertedWith("Ownable: caller is not the Owner or ControllerContract");
    });        

    // --- safeTransferFrom tests ---
    it("Should be able to transfer to others", async function() {
        // create a token first
        await expect(megamix.create(10, "ipfs://xxxxx/1.json", true)).not.to.be.reverted;

        // mint the token
        await expect(megamix.mint(minter.address, 10, 1, "0x")).not.to.be.reverted;

        // transfer to another wallet
        tx = megamix.connect(minter).safeTransferFrom(minter.address, other.address, 10, 1, "0x");
        await expect(tx).not.to.be.reverted;
        await expect(tx).to.emit(megamix, 'TransferSingle').withArgs(minter.address, minter.address, other.address, 10, 1);
    });

    it("Should fail to transfer to others if the token is not transferable", async function() {
        // create a non transferable token first
        await expect(megamix.create(10, "ipfs://xxxxx/1.json", false)).not.to.be.reverted;

        // mint the token
        await expect(megamix.mint(minter.address, 10, 1, "0x")).not.to.be.reverted;

        // transfer to another wallet
        await expect(megamix.connect(minter).safeTransferFrom(minter.address, other.address, 10, 1, "0x")).to.be.revertedWith("transfer is disabled");
    });
    
    it("Should fail to transfer to others if the token doesn't exist", async function() {
        // transfer to another wallet
        await expect(megamix.connect(minter).safeTransferFrom(minter.address, other.address, 10, 1, "0x")).to.be.revertedWith("the token doesn't exist");
    });

    // --- safeBatchTransferFrom tests ---
    it("Should be able to transfer to others", async function() {
        // create tokens first
        await expect(megamix.create(10, "ipfs://xxxxx/1.json", true)).not.to.be.reverted;
        await expect(megamix.create(20, "ipfs://xxxxx/2.json", true)).not.to.be.reverted;

        // mint the tokens
        tx = megamix.mintBatch(minter.address, [10, 20], [1, 2], "0x");
        await expect(tx).not.to.be.reverted;
        await expect(tx).to.emit(megamix, 'TransferBatch').withArgs(owner.address, AddressZero, minter.address, [10, 20], [1, 2]);

        // transfer to another wallet
        tx2 = megamix.connect(minter).safeBatchTransferFrom(minter.address, other.address, [10, 20], [1, 2], "0x");
        await expect(tx2).not.to.be.reverted;
        await expect(tx2).to.emit(megamix, 'TransferBatch').withArgs(minter.address, minter.address, other.address, [10, 20], [1, 2]);
    });

    it("Should fail to transfer to others if one of the tokens doesn't exist", async function() {
        // create tokens first
        await expect(megamix.create(10, "ipfs://xxxxx/1.json", true)).not.to.be.reverted;
        
        // mint the token
        tx = megamix.mint(minter.address, 10, 1, "0x");
        await expect(tx).not.to.be.reverted;
        await expect(tx).to.emit(megamix, 'TransferSingle').withArgs(owner.address, AddressZero, minter.address, 10, 1);

        // transfer to another wallet
        await expect(megamix.connect(minter).safeBatchTransferFrom(minter.address, other.address, [10, 20], [1, 2], "0x")).to.be.revertedWith("the token doesn't");
    });      

    it("Should fail to transfer to others if one of the tokens isn't transferable", async function() {
        // create tokens first
        await expect(megamix.create(10, "ipfs://xxxxx/1.json", true)).not.to.be.reverted;
        await expect(megamix.create(20, "ipfs://xxxxx/2.json", false)).not.to.be.reverted;

        // mint the tokens
        tx = megamix.mintBatch(minter.address, [10, 20], [1, 2], "0x");
        await expect(tx).not.to.be.reverted;
        await expect(tx).to.emit(megamix, 'TransferBatch').withArgs(owner.address, AddressZero, minter.address, [10, 20], [1, 2]);

        // transfer to another wallet
        await expect(megamix.connect(minter).safeBatchTransferFrom(minter.address, other.address, [10, 20], [1, 2], "0x")).to.be.revertedWith("transfer is disabled");
    });   
    
    // --- controllerContract tests  ---
    it("Should be able to change the controller contract", async function() {
        expect(await megamix.getControllerContract()).to.equal(AddressZero);

        await expect(megamix.setControllerContract(megamixControllerContract.address)).to.be.not.reverted;

        expect(await megamix.getControllerContract()).to.equal(megamixControllerContract.address);
    });

    // --- transferability tests ---
    it("Should return the current status of the transferability", async function() {
        // create tokens first
        await expect(megamix.create(10, "ipfs://xxxxx/1.json", true)).not.to.be.reverted;
        await expect(megamix.create(20, "ipfs://xxxxx/1.json", false)).not.to.be.reverted;

        // check the status
        expect(await megamix.getTransferable(10)).to.equal(true);
        expect(await megamix.getTransferable(20)).to.equal(false);        
    });

    it("Should be able to change the transferability", async function() {
        // create tokens first
        await expect(megamix.create(10, "ipfs://xxxxx/1.json", true)).not.to.be.reverted;

        // check the status
        expect(await megamix.getTransferable(10)).to.equal(true);

        // change the status
        await expect(megamix.setTransferable(10, false)).not.to.be.reverted;

        // check the status
        expect(await megamix.getTransferable(10)).to.equal(false);
    });

    it("Should faild to set the transferability of non existing token", async function() {
            // change the status of the non existing token
            await expect(megamix.setTransferable(10, false)).to.be.revertedWith("token doesn't exist");
    })

    // --- Royalty tests ---   
    it("Should fail to set invalid address to the defaultRoyaltyInfo", async function () {
        // set new defaultRoyaltyInfo with invalid address
        await expect(megamix.setDefaultRoyaltyInfo(AddressZero, 500)).to.revertedWith("invalid address");
    });   
    
    it("Should fail to set invalid percentage to the defaultRoyaltyInfo", async function () {
        // set new defaultRoyaltyInfo
        await expect(megamix.setDefaultRoyaltyInfo(owner.address, 1501)).to.revertedWith("must be <= 15");
    });  
    
    it("Should be able to set the new default royalty info with up-to 15%", async function () {
        // set new defaultRoyaltyInfo
        await expect(megamix.setDefaultRoyaltyInfo(owner.address, 1500)).not.to.be.reverted;

        // get royalty
        royalty = await megamix.royaltyInfo(1, 100000);
    
        expect(royalty[0]).to.equal(owner.address);
        expect(royalty[1]).to.equal(15000);
    }); 

    it("Should be able to set the new custom royalty info with up-to 15%", async function () {
        // set new setCustomRoyaltyInfo
        await expect(megamix.setCustomRoyaltyInfo(1, owner.address, 1500)).not.to.be.reverted;

        // get custom royalty
        royalty = await megamix.royaltyInfo(1, 100000);
    
        expect(royalty[0]).to.equal(owner.address);
        expect(royalty[1]).to.equal(15000);

        // default royalty shouldn't be changed
        royalty = await megamix.royaltyInfo(2, 100000);
    
        expect(royalty[0]).to.equal(fundManagerContract.address);
        expect(royalty[1]).to.equal(3000);        
    });     

    it("Should be able to reset custom royalty by setting zero addrss", async function () {
        // set new setCustomRoyaltyInfo
        await expect(megamix.setCustomRoyaltyInfo(1, owner.address, 1500)).not.to.be.reverted;

        // get custom royalty
        royalty = await megamix.royaltyInfo(1, 100000);
    
        expect(royalty[0]).to.equal(owner.address);
        expect(royalty[1]).to.equal(15000);        
        
        // set new defaultRoyaltyInfo with zero address
        await expect(megamix.setCustomRoyaltyInfo(1, AddressZero, 500)).not.to.be.reverted;

        // get default royalty again
        royalty = await megamix.royaltyInfo(1, 100000);
    
        expect(royalty[0]).to.equal(fundManagerContract.address);
        expect(royalty[1]).to.equal(3000);            
    });   

    it("Should fail to set invalid percentage to the setCustomRoyaltyInfo", async function () {
        // set new defaultRoyaltyInfo
        await expect(megamix.setCustomRoyaltyInfo(1, owner.address, 1501)).to.revertedWith("must be <= 15");
    });  
    
    it("Should return default royalty through getRaribleV2Royalties", async function () {
        // get royalty through Rarible's interface
        royalty = await megamix.getRaribleV2Royalties(1);
    
        expect(royalty[0].value).to.equal(300);
        expect(royalty[0].account).to.equal(fundManagerContract.address);
    });   

    it("Should return custom royalty through getRaribleV2Royalties if it's set", async function () {
        // set new setCustomRoyaltyInfo
        await expect(megamix.setCustomRoyaltyInfo(1, owner.address, 500)).not.to.be.reverted;

        // get royalty through Rarible's interface
        royalty = await megamix.getRaribleV2Royalties(1);
    
        expect(royalty[0].value).to.equal(500);
        expect(royalty[0].account).to.equal(owner.address);
    });   
    
    it("Should return default royalty through royaltyInfo", async function () {
        // get royalty
        royalty = await megamix.royaltyInfo(1, 100000);
    
        expect(royalty[0]).to.equal(fundManagerContract.address);
        expect(royalty[1]).to.equal(3000);
    });

    it("Should return custom royalty through royaltyInfo", async function () {
        // set new setCustomRoyaltyInfo
        await expect(megamix.setCustomRoyaltyInfo(1, owner.address, 500)).not.to.be.reverted;
                
        // get royalty
        royalty = await megamix.royaltyInfo(1, 100000);
    
        expect(royalty[0]).to.equal(owner.address);
        expect(royalty[1]).to.equal(5000);
    });
    
    it("Should support LibRoyaltiesV2", async function () {
        // get check supported interface
        expect(await megamix.supportsInterface(0xcad96cca)).to.equal(true);  // LibRoyaltiesV2
    });  
    
    it("Should support EIP-2981", async function () {
        // get check supported interface
        expect(await megamix.supportsInterface(0x2a55205a)).to.equal(true);  // EIP-2981
    });   
        
    it("Should call upportsInterface of super classes", async function () {
        // get check supported interface
        expect(await megamix.supportsInterface(0xffffffff)).to.equal(false);  // 
    });

    // --- test withdraw ---
    it("Should fail to set invalid address to FundManager", async function() {
        await expect(megamix.setFundManagerContract(AddressZero)).to.be.revertedWith("invalid address");
  
        expect(await megamix.getFundManagerContract()).to.equal(fundManagerContract.address);
    })
  
    it("Should fail to update FundManager if transaction is initiated by non owner", async function() {
        await expect(megamix.connect(other).setFundManagerContract(other.address)).to.be.revertedWith("Ownable: caller is not the owner");

        expect(await megamix.getFundManagerContract()).to.equal(fundManagerContract.address);
    })
      
    it("Should be able to update FundManager", async function() {
        await expect(megamix.setFundManagerContract(other.address)).to.be.not.reverted;

        expect(await megamix.getFundManagerContract()).to.equal(other.address);
    })
    
    it("Should move fund to FundManager", async function() {
        // Give 100 ETH to the contract through public mint
        await minter.sendTransaction({to: megamix.address, value: parseEther("100")});      
        
        const tx = megamix.moveFundToManager();
        await expect(tx).to.be.not.reverted;
        await expect(await tx).to.changeEtherBalance(fundManagerContract, parseEther("100"));

        // contract's wallet balance should be 0
        expect((await provider.getBalance(megamix.address)).toString()).to.equal("0");
    })
  
    it("Should fail to move fund to FundManager if it's not set", async function() {
        // Deploy new contract for this test
        const TestMegamix = await hre.ethers.getContractFactory("MEGAMIX");
        testMegamix = await TestMegamix.deploy(AddressZero);  // Wrong fund manager
        await testMegamix.deployed();
        
        await expect(testMegamix.moveFundToManager()).to.be.revertedWith("fundManager shouldn't be 0");
    })
  
    it("emergencyWithdraw should send fund to owner", async function() {
        // Give 100 ETH to the contract through public mint
        await minter.sendTransaction({to: megamix.address, value: parseEther("100")});
  
        const tx = megamix.emergencyWithdraw(other.address);
        await expect(tx).to.be.not.reverted;
        await expect(await tx).to.changeEtherBalance(other, parseEther("100"));
  
        // contract's wallet balance should be 0
        expect((await provider.getBalance(megamix.address)).toString()).to.equal("0");
    })    
  
    it("emergencyWithdraw should faild if recipient is 0", async function() {
      // Give 100 ETH to the contract through public mint
      await minter.sendTransaction({to: megamix.address, value: parseEther("100")});
  
      await expect(megamix.emergencyWithdraw(AddressZero)).to.be.revertedWith("recipient shouldn't be 0");
  
      // contract's wallet balance shouldn't be changed
      expect((await provider.getBalance(megamix.address)).toString()).to.equal(parseEther("100"));
    })    
  
    it("emergencyWithdraw should faild if transaction is initiated by non-owner", async function() {
      // Give 100 ETH to the contract through public mint
      await minter.sendTransaction({to: megamix.address, value: parseEther("100")});
  
      await expect(megamix.connect(other).emergencyWithdraw(other.address)).to.be.revertedWith("Ownable: caller is not the owner");
  
      // contract's wallet balance shouldn't be changed
      expect((await provider.getBalance(megamix.address)).toString()).to.equal(parseEther("100"));
    })

    // --- test name and symbol ---
    it("should be able to get the default name and symbol", async function() {
        expect(await megamix.name()).to.equal("MEGAMIX");
        expect(await megamix.symbol()).to.equal("MEGAMIX");
    });

    it("should be able to change the name and symbol", async function() {
        // Change the name and symbol
        await expect(megamix.setNameAndSymbol("MEGAMEGAMIX", "Sugoi MEGAMIX")).to.be.not.reverted;

        // Confirm the change
        expect(await megamix.name()).to.equal("MEGAMEGAMIX");
        expect(await megamix.symbol()).to.equal("Sugoi MEGAMIX");
    })

    it("should fail to change the name and symbol if transaction is initiated by non-owner", async function() {
        // Change the name and symbol
        await expect(megamix.connect(other).setNameAndSymbol("MEGAMEGAMIX", "Sugoi MEGAMIX")).to.be.reverted;

        // Confirm the change
        expect(await megamix.name()).to.equal("MEGAMIX");
        expect(await megamix.symbol()).to.equal("MEGAMIX");
    })
});