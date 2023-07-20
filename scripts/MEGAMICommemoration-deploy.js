async function main() {
    const [deployer] = await ethers.getSigners();
  
    console.log("Deploying contracts with the account:", deployer.address);
    console.log("Account balance:", (await deployer.getBalance()).toString());

    console.log("Deploy MEGAMICommemoration")

    const MGMCFactory = await ethers.getContractFactory("MEGAMICommemoration");
    const mgmc = await MGMCFactory.deploy();

    console.log("MEGAMICommemoration address:", mgmc.address);
  
    // We need to wait until Etherscan create a cache of our contracts
    console.log("Waiting 1 minute for making sure bytecode being cached by etherscan");
    const sleep = ms => new Promise(r => setTimeout(r, ms));
    await sleep(60000);

    const fundManagerAddress = "0x2e57ce2b4a890e6402dbd70a33c4b30860499c1a";

    console.log("Verifying MEGAMICommemoration");

    try {
      await hre.run("verify:verify", {
          address: mgmc.address,
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