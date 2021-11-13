module.exports = async hre => {
    const { deployer } = await hre.getNamedAccounts();
    const vrfCoordinator = await hre.ethers.getContract("VRFCoordinatorMock");
    const link = await hre.ethers.getContract("ChainlinkMock");
    await hre.deployments.deploy("Plant", {
        from: deployer,
        args: [
            vrfCoordinator.address,
            link.address, 
            "0xf86195cf7690c55907b2b611ebb7343a6f649bff128701cc542f0569e2c549da",
            hre.ethers.utils.parseEther("0.0001"),
        ],
        log: true,
    });
    const plant = await hre.ethers.getContract("Plant");
    await link.transfer(plant.address, hre.ethers.utils.parseEther("10"));
};

module.exports.tags = ["plant"];
module.exports.dependencies = ["mocks"];
