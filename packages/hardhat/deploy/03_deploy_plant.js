module.exports = async hre => {
    const { deployer } = await hre.getNamedAccounts();
    let linkAddr;
    let vrfCoordinatorAddr;
    let keyHash;
    const land = await hre.ethers.getContract("Land");
    const fruit = await hre.ethers.getContract("Fruit");

    const network = await hre.ethers.provider.getNetwork();
    const chainId = network.chainId;
    // for tests
    if (chainId === 31337) {
        const vrfCoordinatorMock = await hre.ethers.getContract("VRFCoordinatorMock");
        const linkMock = await hre.ethers.getContract("ChainlinkMock");
        keyHash = "0xf86195cf7690c55907b2b611ebb7343a6f649bff128701cc542f0569e2c549da";
        linkAddr = linkMock.address;
        vrfCoordinatorAddr = vrfCoordinatorMock.address;
        await hre.deployments.deploy("PlantMock", {
            from: deployer,
            args: [
                vrfCoordinator.address,
                linkAddr,
                keyHash,
                hre.ethers.utils.parseEther("0.0001"),
                land.address,
                fruit.address,
            ],
            log: true,
        });
    } else if (chainId === 80001) { // mumbai values from https://docs.chain.link/docs/vrf-contracts/
        linkAddr = "0x326C977E6efc84E512bB9C30f76E30c160eD06FB";
        vrfCoordinatorAddr = "0x8C7382F9D8f56b33781fE506E897a4F1e2d17255";
        keyHash = "0x6e75b569a01ef56d18cab6a8e71e6600d6ce853834d4a5748b720d06f878b3a4";
    }
    await hre.deployments.deploy("Plant", {
        from: deployer,
        args: [
            vrfCoordinatorAddr,
            linkAddr, 
            keyHash,
            hre.ethers.utils.parseEther("0.0001"),
            land.address,
            fruit.address,
        ],
        log: true,
    });

    const plant = await hre.ethers.getContract("Plant");
    await land._initialize(plant.address);
    if (chainId === 31337) {
        await linkMock.transfer(plant.address, hre.ethers.utils.parseEther("10"));
    } else {
      console.log('TODO: transfer LINK to the Plant contract');
    }
};

module.exports.tags = ["plant"];
module.exports.dependencies = ["mocks", "fruit", "land"];
