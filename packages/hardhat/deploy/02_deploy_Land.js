module.exports = async hre => {
    const { deployer } = await hre.getNamedAccounts();
    await hre.deployments.deploy("Land", {
      from: deployer,
      log: true,
    });
  };
  
  module.exports.tags = ["Land"];
  