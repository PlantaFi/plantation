module.exports = async hre => {
    const { deployer } = await hre.getNamedAccounts();
    const plant = await hre.ethers.getContract("Plant");

    await hre.deployments.deploy("Fruit", {
        from: deployer,
        log: true,
    });
};

module.exports.tags = ["fruit"];
