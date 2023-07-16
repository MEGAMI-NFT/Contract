async function main() {
    const [deployer] = await ethers.getSigners();
  
    console.log("Deploying contracts with the account:", deployer.address);
    console.log("Account balance:", (await deployer.getBalance()).toString());

    console.log("Deploy MEGAMIFourSeasonsAndFlowers")

    const FSAFFactory = await ethers.getContractFactory("MEGAMIFourSeasonsAndFlowers");
    const fsaf = await FSAFFactory.deploy();

    console.log("MEGAMIFourSeasonsAndFlowers address:", fsaf.address);
  
    // We need to wait until Etherscan create a cache of our contracts
    console.log("Waiting 1 minute for making sure bytecode being cached by etherscan");
    const sleep = ms => new Promise(r => setTimeout(r, ms));
    await sleep(60000);

    console.log("Verifying MEGAMIFourSeasonsAndFlowers");

    try {
      await hre.run("verify:verify", {
          address: fsaf.address,
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