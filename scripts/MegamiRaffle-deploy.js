async function main() {
    const [deployer] = await ethers.getSigners();

    console.log("Deploying contracts with the account:", deployer.address);
    console.log("Account balance:", (await deployer.getBalance()).toString());

    const RinkebyVRFCoordinator = '0x6168499c0cFfCaCD319c818142124B7A15E857ab';
    const RinkebyKeyHash = '0xd89b2bf150e3b9e13446986e571fb9cab24b13cea0a43ea20a6049a85cc807cc';
    const RinkebySubscriptionId = 10340;

    console.log("Deploy MegamiRaffle")

    const MegamixRaffleFactory = await ethers.getContractFactory("MegamiRaffle");
    const megamiRaffle = await MegamixRaffleFactory.deploy(
      RinkebyVRFCoordinator,
      RinkebySubscriptionId,
      RinkebyKeyHash,
    );

    console.log("MegamixRaffle address:", megamiRaffle.address);
    
    // We need to wait until Etherscan create a cache of our contracts
    console.log("Waiting 1 minute for making sure bytecode being cached by etherscan");
    const sleep = ms => new Promise(r => setTimeout(r, ms));
    await sleep(60000);

    console.log("Verifying MegamiRaffle");

    try {
      await hre.run("verify:verify", {
          address: megamiRaffle.address,
          constructorArguments: [RinkebyVRFCoordinator, RinkebySubscriptionId, RinkebyKeyHash],
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