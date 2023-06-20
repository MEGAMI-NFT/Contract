async function main() {
  const [deployer] = await ethers.getSigners();

  console.log("Deploying contracts with the account:", deployer.address);
  console.log("Account balance:", (await deployer.getBalance()).toString());

  console.log("Deploy TeamMEGAMI")

  const TeamMEGAMIFactory = await ethers.getContractFactory("TeamMEGAMI");
  const teamMegami = await TeamMEGAMIFactory.deploy();

  console.log("TeamMEGAMI address:", teamMegami.address);

  // We need to wait until Etherscan create a cache of our contracts
  console.log("Waiting 1 minute for making sure bytecode being cached by etherscan");
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  await sleep(60000);

  console.log("Verifying TeamMEGAMI");

  try {
    await hre.run("verify:verify", {
        address: teamMegami.address,
        constructorArguments: [],
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