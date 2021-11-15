module.exports = async hre => {
    const network = await hre.ethers.provider.getNetwork();
    const chainId = network.chainId;
    
    if (chainId !== 31337) return;

    const { deployer } = await hre.getNamedAccounts();
    const link = await hre.deployments.deploy("ChainlinkMock", {
        from: deployer,
        log: true,
    });
    await hre.deployments.deploy("VRFCoordinatorMock", {
        from: deployer,
        args: [link.address],
        log: true,
    });
};

module.exports.tags = ["mocks"];
