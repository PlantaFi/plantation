const { deployments, ethers } = require("hardhat");
const { use, expect } = require("chai");
const { solidity } = require("ethereum-waffle");

use(solidity);

const setup = deployments.createFixture(async hre => {
    await hre.deployments.fixture();
    const PlantMock = await ethers.getContractFactory("PlantMock");
    const plantMock = await PlantMock.deploy();
    return {
        plantMock,
    }
});

describe("Plant", () => {

    // quick fix to let gas reporter fetch data from gas station & coinmarketcap
    before((done) => {
        setTimeout(done, 1000);
    });

    describe("traitFactor()", () => {
        const dna = 4143337868;

        it("should return the correct trait factor", async () => {
            const { plantMock } = await setup();
            const absorbFactorWad = await plantMock.doTraitFactor(3, dna);
            const absorbFactor = absorbFactorWad / 1e18;
            expect(absorbFactor).to.equal(1.28);
        });
    });
});
