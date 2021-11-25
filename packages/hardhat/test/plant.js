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
    const fruit = await hre.ethers.getContract("Fruit", user1);
    await fruit.approve(plant.address, hre.ethers.constants.MaxUint256);
    await fruit.freeFruit();
    return {
        hre,
        user1,
        user2,
        plant,
        fruit,
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
                ethers.constants.AddressZero,
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
            const { user1, plant, fruit } = await setup();
            const supplyBefore = await plant.totalSupply();
            const balanceBefore = await plant.balanceOf(user1.address);
            const fruitBalanceBefore = await fruit.balanceOf(user1.address);
            const price = await plant.currentPrice();
            const tx = await plant.buy();
            const receipt = await tx.wait();
            expect(await fruit.balanceOf(user1.address)).to.equal(fruitBalanceBefore.sub(price));
            const plantId = receipt.events.find(e => e.event === "PlantCreationStarted").args["plantId"];
            const random = hre.ethers.BigNumber.from(crypto.randomBytes(32));
            await expect(plant.doFulfillRandomness(plantId, random, { gasLimit: 206000 + 22086 })).to.emit(plant, "Transfer").withArgs(hre.ethers.constants.AddressZero, user1.address, plantId);
            expect(await plant.totalSupply()).to.equal(supplyBefore.add(1));
            expect(await plant.balanceOf(user1.address)).to.equal(balanceBefore.add(1));
        });
    });

    describe("prune", () => {

        it("should mint a plant token, prune it, and update frailty", async () => {
            const { user1, plant, fruit } = await setup();
            const supplyBefore = await plant.totalSupply();
            const balanceBefore = await plant.balanceOf(user1.address);
            const fruitBalanceBefore = await fruit.balanceOf(user1.address);
            const price = await plant.currentPrice();
            const tx = await plant.buy();
            const receipt = await tx.wait();
            expect(await fruit.balanceOf(user1.address)).to.equal(fruitBalanceBefore.sub(price));
            const plantId = receipt.events.find(e => e.event === "PlantCreationStarted").args["plantId"];
            const random = hre.ethers.BigNumber.from(crypto.randomBytes(32));
            await expect(plant.doFulfillRandomness(plantId, random, { gasLimit: 206000 + 22086 })).to.emit(plant, "Transfer").withArgs(hre.ethers.constants.AddressZero, user1.address, plantId);
            expect(await plant.totalSupply()).to.equal(supplyBefore.add(1));
            expect(await plant.balanceOf(user1.address)).to.equal(balanceBefore.add(1));

            // expect no change at first
            const pruneTx1 = await plant.prune(plantId);
            await pruneTx1.wait();
            const state1 = await plant.state(plantId);
            expect(state1.lastDeadPruned.toString()).to.equal("0");
            expect(state1.lastFrailty.toString()).to.equal(hre.ethers.utils.parseEther("1").toString());

            await hre.ethers.provider.send("evm_increaseTime", [600]);
            await plant.water(plantId);
            await hre.ethers.provider.send("evm_increaseTime", [1200]);
            await plant.water(plantId);
            await hre.ethers.provider.send("evm_increaseTime", [3600]);
            const pruneTx = await plant.prune(plantId);
            const pruneReceipt = await pruneTx.wait();
            const state = await plant.state(plantId);
            // expect a small increase
            expect(parseFloat(hre.ethers.utils.formatEther(state.lastDeadPruned))).to.be.above(0);
            expect(state.lastFrailty.toString()).to.equal(hre.ethers.utils.parseEther("1").toString());
        });
    });

    describe("die", () => {

        it("should make a plant die", async () => {
            const { user1, plant, fruit } = await setup();
            const tx = await plant.buy();
            const receipt = await tx.wait();
            const plantId = receipt.events.find(e => e.event === "PlantCreationStarted").args["plantId"];
            const random = hre.ethers.BigNumber.from(crypto.randomBytes(32));
            await expect(plant.doFulfillRandomness(plantId, random, { gasLimit: 206000 + 22086 })).to.emit(plant, "Transfer").withArgs(hre.ethers.constants.AddressZero, user1.address, plantId);

            // expect no change at first
            const pruneTx1 = await plant.prune(plantId);
            await pruneTx1.wait();
            const state1 = await plant.state(plantId);
            expect(state1.lastDeadPruned.toString()).to.equal("0");
            expect(state1.lastFrailty.toString()).to.equal(hre.ethers.utils.parseEther("1").toString());

            await hre.ethers.provider.send("evm_increaseTime", [3600]);
            const pruneTx2 = await plant.prune(plantId);
            //await plant.water(plantId);
            await hre.ethers.provider.send("evm_increaseTime", [3600]);
            const pruneTx3 = await plant.prune(plantId);
            //await plant.water(plantId);
            await hre.ethers.provider.send("evm_increaseTime", [7200]);
            const pruneTx4 = await plant.prune(plantId);
            //await plant.water(plantId);
            await hre.ethers.provider.send("evm_increaseTime", [7200]);
            const pruneTx = await plant.prune(plantId);
            const pruneReceipt = await pruneTx.wait();
            const state = await plant.state(plantId);
            expect(parseFloat(hre.ethers.utils.formatEther(state.lastNormalBranch))).to.be.below(1);
            expect(state.isAlive).to.be.false;
        });
    });

    describe("currentPrice", () => {
        
        it("should return the correct price", async () => {
            const { plant } = await setup();
            for (let i = 0; i < 3; i++) {
                await buy(plant);
            }
            const base = await plant.BASE_PRICE();
            const step = await plant.PRICE_INCREASE();
            const supply = await plant.totalSupply();
            console.log(base.add(supply.mul(step)).toString(), (await plant.currentPrice()).toString());
            expect(await plant.currentPrice()).to.equal(base.add(supply.mul(step)));
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
            const { hre, user2, plant, fruit } = await setup();
            const plantId = await buy(plant);
            const plantUser2 = plant.connect(user2);
            const fruitUser2 = fruit.connect(user2)
            await fruitUser2.freeFruit();
            await fruitUser2.approve(plant.address, hre.ethers.constants.MaxUint256);
            await buy(plantUser2);
            await expect(plantUser2["burn(uint256)"](plantId)).to.be.reverted;
        });

        it("should burn an owned plant", async () => {
            const { hre, user1, plant } = await setup();
            const plantId = await buy(plant);
            const balance = await plant.balanceOf(user1.address);
            await expect(plant["burn(uint256)"](plantId)).to.emit(plant, "Transfer").withArgs(user1.address, hre.ethers.constants.AddressZero, plantId);
            expect(await plant.balanceOf(user1.address)).to.equal(balance.sub(1));
        });
    });
});
