async function main() {
    const [deployer] = await ethers.getSigners();
  
    console.log("Deploying contracts with the account:", deployer.address);
    console.log("Account balance:", (await deployer.getBalance()).toString());

    /*
    console.log("Deploying FundManager");
  
    const FundManagerFactory = await ethers.getContractFactory("FundManager");
    const fundManager = await FundManagerFactory.deploy();
  
    fundManagerAddress = fundManager.address;
    */
    fundManagerAddress = '0xb6B6195a22999d65a839a6346BCe8fCc24081495';
    
    console.log("FundManager address:", fundManagerAddress);

    console.log("Deploy MEGAMIMusic")

    const MusicFactory = await ethers.getContractFactory("MEGAMIMusic");
    const music = await MusicFactory.deploy(fundManagerAddress);

    console.log("MEGAMIMusic address:", music.address);
  
    // We need to wait until Etherscan create a cache of our contracts
    console.log("Waiting 1 minute for making sure bytecode being cached by etherscan");
    const sleep = ms => new Promise(r => setTimeout(r, ms));
    await sleep(60000);

    /*

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

    console.log("Verifying MEGAMIMusic");

    try {
      await hre.run("verify:verify", {
          address: music.address,
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