async function main() {
    const [deployer] = await ethers.getSigners();
  
    console.log("Deploying contracts with the account:", deployer.address);
    console.log("Account balance:", (await deployer.getBalance()).toString());

    console.log("Deploying FundManager");
  
    const FundManagerFactory = await ethers.getContractFactory("FundManager");
    const fundManager = await FundManagerFactory.deploy();
  
    console.log("FundManager address:", fundManager.address);

    console.log("Deploy MEGAMI")

    const MegamiFactory = await ethers.getContractFactory("MEGAMI");
    const megami = await MegamiFactory.deploy(fundManager.address);

    console.log("MEGAMI address:", megami.address);

    console.log("Deploy MEGAMISales")

    const MegamiSalesFactory = await ethers.getContractFactory("MEGAMISales");
    const megamiSales = await MegamiSalesFactory.deploy(megami.address, fundManager.address);

    console.log("MEGAMISales address:", megamiSales.address);
  
    console.log("Verifying FundManager");

    try {
      await hre.run("verify:verify", {
          address: fundManager.address,
          constructorArguments: [],
      });
    } catch (error) {
      console.error(error);
    }

    console.log("Verifying MEGAMI");

    try {
      await hre.run("verify:verify", {
          address: megami.address,
          constructorArguments: [fundManager.address],
      });
    } catch (error) {
      console.error(error);
    }

    console.log("Verifying MEGAMISales");

    try {
      await hre.run("verify:verify", {
          address: megamiSales.address,
          constructorArguments: [megami.address, fundManager.address],
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