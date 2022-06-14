require("@nomiclabs/hardhat-web3");
require("@nomiclabs/hardhat-waffle");
require("hardhat-gas-reporter");
require("solidity-coverage")
require("@nomiclabs/hardhat-etherscan");

const INFURA_API_KEY = process.env.INFURA_API_KEY;

/**
 * @type import('hardhat/config').HardhatUserConfig
 */
module.exports = {
  solidity: "0.8.7",
  networks: {
    rinkeby: {
      url: `https://rinkeby.infura.io/v3/${INFURA_API_KEY}`,
      accounts: [process.env.RINKEBY_PRIVATE_KEY]
    }
  },
  etherscan: {
    // API key for Etherscan
    // Obtain one at https://etherscan.io/
    apiKey: process.env.ETHERSCAN_API_KEY
  },
  gasReporter: {
    enabled: (process.env.REPORT_GAS) ? true : false
  }
};
