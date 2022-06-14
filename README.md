# Contract

## Hardhat Setup
```
yarn add --save-dev @nomiclabs/hardhat-ethers ethers @nomiclabs/hardhat-waffle ethereum-waffle chai hardhat-gas-reporter
```

## Test
Test contract
```
yarn test
```

Test contract with gas reports
```
yarn test:gas
```

## Deploy
Rinkeby
```
INFURA_API_KEY=<Alchemy API Key> RINKEBY_PRIVATE_KEY=<Rinkeby Wallet Private Key> ETHERSCAN_API_KEY=<Etherscan API Key> yarn deploy:rinkeby
```

You may see verification errors, but you can ignore them if their `Reason` is `Already Verified`.
