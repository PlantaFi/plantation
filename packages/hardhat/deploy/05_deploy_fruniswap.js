// deploy/00_deploy_land.js

const { ethers } = require("hardhat");

const localChainId = "31337";

module.exports = async ({ getNamedAccounts, deployments, getChainId }) => {
  const { deploy } = deployments;
  const { deployer } = await getNamedAccounts();
  const chainId = await getChainId();

  await deploy("Fruniswap", {
    // Learn more about args here: https://www.npmjs.com/package/hardhat-deploy#deploymentsdeploy
    from: deployer,
    // args: [ "Hello", ethers.utils.parseEther("1.5") ],
    log: true,
  });

  // Getting a previously deployed contract
  const Fruniswap = await ethers.getContract("Fruniswap", deployer);
  const Pair = await ethers.getContract("UniswapV2Pair", deployer);

  const Fruit = await ethers.getContract("Fruit", deployer);
  const FMatic = await ethers.getContract("FMatic", deployer);
  /*
  console.log(await Pair.token0());
  console.log(await Pair.token1());
  console.log(await Fruniswap.token0());
  console.log(await Fruniswap.token1());
  */
  await Fruniswap.initialize(Pair.address);
  console.log('Fruniswap initialized token0 to: ', await Fruniswap.token0());
  console.log(await Fruniswap.token1());

  console.log('1 FRUIT = ', ethers.utils.formatEther(await Fruniswap.getAmountOutForFruitIn(ethers.utils.parseEther("1"))));
  

  /*  await YourContract.setPurpose("Hello");
  
    To take ownership of yourContract using the ownable library uncomment next line and add the 
    address you want to be the owner. 
    // yourContract.transferOwnership(YOUR_ADDRESS_HERE);

    //const yourContract = await ethers.getContractAt('YourContract', "0xaAC799eC2d00C013f1F11c37E654e59B0429DF6A") //<-- if you want to instantiate a version of a contract at a specific address!
  */

  /*
  //If you want to send value to an address from the deployer
  const deployerWallet = ethers.provider.getSigner()
  await deployerWallet.sendTransaction({
    to: "0x34aA3F359A9D614239015126635CE7732c18fDF3",
    value: ethers.utils.parseEther("0.001")
  })
  */

  /*
  //If you want to send some ETH to a contract on deploy (make your constructor payable!)
  const yourContract = await deploy("YourContract", [], {
  value: ethers.utils.parseEther("0.05")
  });
  */

  /*
  //If you want to link a library into your contract:
  // reference: https://github.com/austintgriffith/scaffold-eth/blob/using-libraries-example/packages/hardhat/scripts/deploy.js#L19
  const yourContract = await deploy("YourContract", [], {}, {
   LibraryName: **LibraryAddress**
  });
  */

  // Verify your contracts with Etherscan
  // You don't want to verify on localhost
  if (chainId !== localChainId) {
    /*
    await run("verify:verify", {
      address: Fruniswap.address,
      contract: "contracts/Fruniswap.sol:Fruniswap",
      contractArguments: [],
    });
    */
  }
};
module.exports.tags = ["fruniswap"];
module.exports.dependencies = ["pair", "fruit", "fmatic"];
