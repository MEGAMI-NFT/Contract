require("@nomiclabs/hardhat-web3");
require("@nomiclabs/hardhat-waffle");
require("hardhat-gas-reporter");
require('solidity-coverage')

/**
 * @type import('hardhat/config').HardhatUserConfig
 */
module.exports = {
  solidity: "0.8.7",
  gasReporter: {
    enabled: (process.env.REPORT_GAS) ? true : false
  }
};
