module.exports = async hre => {
    const { deployer } = await hre.getNamedAccounts();

    await hre.deployments.deploy("Fruit", {
        from: deployer,
        log: true,
    });
};

module.exports.tags = ["fruit"];
