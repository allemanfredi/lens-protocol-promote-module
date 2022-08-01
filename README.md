# promote-module (in progress)

This Lens Protocol module allows you to create a Transparent Promotion system in which the post creator can add a reward for those who mirror (or comment) it.
Moreover it will specify one or more profiles (ex: influencers) that in case of mirroring (or commenting) it, they will receive a reward.

&nbsp;

***

&nbsp;

## :white_check_mark: Publish & Verify

Create an __.env__ file with the following fields:

```
ETHERSCAN_API_KEY=
POLYGON_MAINNET_NODE=
POLYGON_MAINNET_PRIVATE_KEY=
```


### publish


```
❍ npx hardhat run --network mainnet scripts/deploy-script.js
```

### verify

```
❍ npx hardhat verify --network mainnet DEPLOYED_CONTRACT_ADDRESS "Constructor argument 1"
```
