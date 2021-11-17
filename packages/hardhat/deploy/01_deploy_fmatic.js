module.exports = async hre => {
    const { deployer } = await hre.getNamedAccounts();
    await hre.deployments.deploy("FMatic", {
        from: deployer,
        log: true,
    });
};

module.exports.tags = ["fmatic"];

