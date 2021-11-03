module.exports = async hre => {
  const { deployer } = await hre.getNamedAccounts();
  await hre.deployments.deploy("Plant", {
    from: deployer,
    log: true,
  });
};

module.exports.tags = ["Plant"];
