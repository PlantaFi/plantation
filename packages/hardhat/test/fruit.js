const { deployments, ethers } = require("hardhat");
const { use, expect } = require("chai");
const { solidity } = require("ethereum-waffle");

use(solidity);

const setup = deployments.createFixture(async hre => {
    await hre.deployments.fixture("fruit");
    const [user1, user2] = await hre.ethers.getUnnamedSigners();
    const plant = await hre.ethers.getContract("Plant", user1);
    return {
        hre,
        user1,
        user2,
        plant,
    }
});

describe("Fruit", () => {

    // quick fix to let gas reporter fetch data from gas station & coinmarketcap
    before((done) => {
        setTimeout(done, 1000);
    });

    describe("deployment", () => {

        it("should deploy", async () => {
            const Fruit = await ethers.getContractFactory("Fruit");
            await Fruit.deploy();
        });
    });

});
