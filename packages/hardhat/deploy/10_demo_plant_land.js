module.exports = async hre => {
    const { deployer } = await hre.getNamedAccounts();
    const land = await hre.ethers.getContract("Land");
    const fruit = await hre.ethers.getContract("Fruit");
    const fmatic = await hre.ethers.getContract("FMatic");
    const plant = await hre.ethers.getContract("Plant");
    const utils = hre.ethers.utils;

    const network = await hre.ethers.provider.getNetwork();
    const chainId = network.chainId;
    // for tests
    if (chainId === 31337) {
        await fruit.freeFruit();
        await fruit.approve(plant.address, utils.parseEther("1000"));
        console.log('Buy a plant')
        let tx = await plant.buy();
        let receipt = await tx.wait();
        let plantId = receipt.events.find(e => e.event === "PlantCreationStarted").args["plantId"];
        console.log('Wait 5 seconds for VRF to trigger');
        await new Promise(r => setTimeout(r, 5000));
        tx = await plant.buy();
        let receipt2 = await tx.wait();
        let plantId2 = receipt2.events.find(e => e.event === "PlantCreationStarted").args["plantId"];
        await new Promise(r => setTimeout(r, 5000));
        //await plant.buy();
        // no need to approve for buying land - yet
        const landFee = { value: utils.parseEther("0.0005") }
        //await land.mintAt(deployer, 0, landFee); // top-left corner
        //await land.mintAt(deployer, 33, landFee); // down 1, right 1
        let isMinted = await land.isMinted(32*13+13);
        if (!isMinted) {
            console.log('Mint land');
            await land.mintAt(deployer, 32*13+13, landFee); // corner of visible default map
            console.log('Implant seed');
            await land.implant(32*13+13, plantId);
        }
        isMinted = await land.isMinted(32*14+14);
        if (!isMinted) {
            console.log('Mint land');
            await land.mintAt(deployer, 32*14+14, landFee); // corner of visible default map
            console.log('Implant seed');
            await land.implant(32*14+14, plantId2);
        }
    }
};

module.exports.tags = ["demo"];
module.exports.dependencies = ["plant", "mocks", "fruit", "fmatic", "land"];
