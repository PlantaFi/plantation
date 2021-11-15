module.exports = async hre => {
    const { deployer } = await hre.getNamedAccounts();
    const vrfCoordinator = await hre.ethers.getContract("VRFCoordinatorMock");
    const link = await hre.ethers.getContract("ChainlinkMock");
    const land = await hre.ethers.getContract("Land");
    const fruit = await hre.ethers.getContract("Fruit");

    const network = await hre.ethers.provider.getNetwork();
    const chainId = network.chainId;
    // for tests
    if (chainId === 31337) {
        await hre.deployments.deploy("PlantMock", {
            from: deployer,
            args: [
                vrfCoordinator.address,
                link.address,
                "0xf86195cf7690c55907b2b611ebb7343a6f649bff128701cc542f0569e2c549da",
                hre.ethers.utils.parseEther("0.0001"),
                land.address,
                fruit.address,
            ],
            log: true,
        });
    }
    await hre.deployments.deploy("Plant", {
        from: deployer,
        args: [
            vrfCoordinator.address,
            link.address, 
            "0xf86195cf7690c55907b2b611ebb7343a6f649bff128701cc542f0569e2c549da",
            hre.ethers.utils.parseEther("0.0001"),
            land.address,
            fruit.address,
        ],
        log: true,
    });

    const plant = await hre.ethers.getContract("Plant");
    await land._initialize(plant.address);
    await link.transfer(plant.address, hre.ethers.utils.parseEther("10"));
};

module.exports.tags = ["plant"];
module.exports.dependencies = ["mocks", "fruit", "land"];
