async function main() {
  const [deployer] = await ethers.getSigners();

  console.log("Deploying contracts with the account:", deployer.address);
  console.log("Account balance:", (await deployer.getBalance()).toString());

  console.log("Deploying FundManager");

  const FundManagerFactory = await ethers.getContractFactory("FundManager");
  const fundManager = await FundManagerFactory.deploy();

  console.log("FundManager address:", fundManager.address);

  console.log("Deploy MEGAMIMoviewSBT")

  const MegamiMovieSbtFactory = await ethers.getContractFactory("MEGAMIMovieSBT");
  const mmsbt = await MegamiMovieSbtFactory.deploy(fundManager.address);

  console.log("MEGAMIMoviewSBT address:", mmsbt.address);

  // We need to wait until Etherscan create a cache of our contracts
  console.log("Waiting 1 minute for making sure bytecode being cached by etherscan");
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  await sleep(60000);

  console.log("Verifying FundManager");

  try {
    await hre.run("verify:verify", {
        address: fundManager.address,
        constructorArguments: [],
    });
  } catch (error) {
    console.error(error);
  }

  console.log("Verifying MEGAMIMovieSBT");

  try {
    await hre.run("verify:verify", {
        address: mmsbt.address,
        constructorArguments: [fundManager.address],
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