module.exports = async hre => {
    const network = await hre.ethers.provider.getNetwork();
    const chainId = network.chainId;
    
    if (chainId !== 31337) return;

    const { deployer } = await hre.getNamedAccounts();
    const link = await hre.deployments.deploy("ChainlinkMock", {
        from: deployer,
        log: true,
    });
    const vrfCoordinator = await hre.deployments.deploy("VRFCoordinatorMock", {
        from: deployer,
        args: [link.address],
        log: true,
    });

    // for tests
    const plantMock = await hre.deployments.deploy("PlantMock", {
        from: deployer,
        args: [
            vrfCoordinator.address,
            link.address,
            "0xf86195cf7690c55907b2b611ebb7343a6f649bff128701cc542f0569e2c549da",
            hre.ethers.utils.parseEther("0.0001"),
        ],
        log: true,
    });
};

module.exports.tags = ["mocks"];
