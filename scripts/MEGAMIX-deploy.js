async function main() {
    const [deployer] = await ethers.getSigners();
  
    console.log("Deploying contracts with the account:", deployer.address);
    console.log("Account balance:", (await deployer.getBalance()).toString());

    const fundManagerAddress = '0xe779e2a98d5d2ef98cdaf8ca25223259e6a47206';
    /**
    console.log("Deploying FundManager");
  
    const FundManagerFactory = await ethers.getContractFactory("FundManager");
    const fundManager = await FundManagerFactory.deploy();
  
    fundManagerAddress = fundManager.address;
    
    console.log("FundManager address:", fundManagerAddress);
    */

    console.log("Deploy MEGAMIX")

    const MegamixFactory = await ethers.getContractFactory("MEGAMIX");
    const megamix = await MegamixFactory.deploy(fundManagerAddress);

    console.log("MEGAMIX address:", megamix.address);
  
    // We need to wait until Etherscan create a cache of our contracts
    console.log("Waiting 1 minute for making sure bytecode being cached by etherscan");
    const sleep = ms => new Promise(r => setTimeout(r, ms));
    await sleep(60000);

    /**
    console.log("Verifying FundManager");

    try {
      await hre.run("verify:verify", {
          address: fundManager.address,
          constructorArguments: [],
      });
    } catch (error) {
      console.error(error);
    }
    */

    console.log("Verifying MEGAMIX");

    try {
      await hre.run("verify:verify", {
          address: megamix.address,
          constructorArguments: [fundManagerAddress],
      });
    } catch (error) {
      console.error(error);
    }
  }
  
  main()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });