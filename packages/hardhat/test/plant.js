const crypto = require("crypto");
const { deployments, ethers } = require("hardhat");
const { use, expect } = require("chai");
const { solidity } = require("ethereum-waffle");

use(solidity);

const setup = deployments.createFixture(async hre => {
    await hre.deployments.fixture("plant");
    const [user1, user2] = await hre.ethers.getUnnamedSigners();
    // We need to mock the VRF flow in our unit tests
    const plant = await hre.ethers.getContract("PlantMock", user1);
    const link = await hre.ethers.getContract("ChainlinkMock");
    await link.transfer(plant.address, hre.ethers.utils.parseEther("10"));
    return {
        hre,
        user1,
        user2,
        plant,
    }
});

// Helper to mock and simplify the asynchronous VRF flow
async function buy(plantContract) {
    const tx = await plantContract.buy().then(tx => tx.wait());
    const plantId = tx.events.find(e => e.event === "PlantCreationStarted").args["plantId"];
    const random = hre.ethers.BigNumber.from(crypto.randomBytes(32));
    await plantContract.doFulfillRandomness(plantId, random, { gasLimit: 206000 + 22086 });
    return plantId;
}

describe("Plant", () => {

    // quick fix to let gas reporter fetch data from gas station & coinmarketcap
    before((done) => {
        setTimeout(done, 1000);
    });

    describe("deployment", () => {

        it("should deploy", async () => {
            const Plant = await ethers.getContractFactory("Plant");
            await Plant.deploy(
                ethers.constants.AddressZero,
                ethers.constants.AddressZero,
                ethers.constants.HashZero,
                ethers.constants.Zero,
                ethers.constants.AddressZero,
            );
        });
    });

    describe("traitFactor", () => {
        
        const dna = 4143337868;

        it("should return the correct trait factor", async () => {
            const { plant, hre } = await setup();
            const absorbFactorWad = await plant.doTraitFactor(3, dna);
            const absorbFactor = hre.ethers.utils.formatEther(absorbFactorWad);
            expect(absorbFactor).to.equal("1.28");
        });
    });

    describe("buy", () => {

        it("should mint a plant token, increase the user's balance and emit the PlantCreated event", async () => {
            const { user1, plant } = await setup();
            const supplyBefore = await plant.totalSupply();
            const balanceBefore = await plant.balanceOf(user1.address);
            const tx = await plant.buy().then(tx => tx.wait());
            const plantId = tx.events.find(e => e.event === "PlantCreationStarted").args["plantId"];
            const random = hre.ethers.BigNumber.from(crypto.randomBytes(32));
            await expect(plant.doFulfillRandomness(plantId, random, { gasLimit: 206000 + 22086 })).to.emit(plant, "Transfer").withArgs(hre.ethers.constants.AddressZero, user1.address, plantId);
            expect(await plant.totalSupply()).to.equal(supplyBefore.add(1));
            expect(await plant.balanceOf(user1.address)).to.equal(balanceBefore.add(1));
        });
    });

    describe("unplantedByAddress", () => {

        it("should return the unplanted plant ids", async () => {
            const { user1, plant } = await setup();
            const plant1Id = await buy(plant);
            const plant2Id = await buy(plant);
            const unplantedIds = await plant.unplantedByAddress(user1.address);
            expect(unplantedIds).to.deep.equal([plant1Id, plant2Id]);
        });
    });

    describe("burn", () => {

        it("should only burn an owned plant", async () => {
            const { user2, plant } = await setup();
            const plantId = await buy(plant);
            const plantUser2 = plant.connect(user2);
            await buy(plantUser2);
            await expect(plantUser2.burn(plantId)).to.be.reverted;
        });

        it("should burn an owned plant", async () => {
            const { hre, user1, plant } = await setup();
            const plantId = await buy(plant);
            const balance = await plant.balanceOf(user1.address);
            await expect(plant.burn(plantId)).to.emit(plant, "Transfer").withArgs(user1.address, hre.ethers.constants.AddressZero, plantId);
            expect(await plant.balanceOf(user1.address)).to.equal(balance.sub(1));
        });
    });
});
