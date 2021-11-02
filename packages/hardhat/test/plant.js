const { deployments } = require("hardhat");
const { use, expect } = require("chai");
const { solidity } = require("ethereum-waffle");

use(solidity);

const setup = deployments.createFixture(async hre => {
    await hre.deployments.fixture("Plant");
    const [user1] = await hre.ethers.getUnnamedSigners();
    const plant = await hre.ethers.getContract("Plant", user1);
    return {
        hre,
        user1,
        plant,
    }
});

describe("Plant", () => {

    // quick fix to let gas reporter fetch data from gas station & coinmarketcap
    before((done) => {
        setTimeout(done, 1000);
    });

    describe("traitFactor()", () => {
        const setupMock = deployments.createFixture(async hre => {
            await hre.deployments.fixture();
            const PlantMock = await ethers.getContractFactory("PlantMock");
            const plantMock = await PlantMock.deploy();
            return {
                hre,
                plantMock,
            }
        });
        const dna = 4143337868;

        it("should return the correct trait factor", async () => {
            const { plantMock, hre } = await setupMock();
            const absorbFactorWad = await plantMock.doTraitFactor(3, dna);
            const absorbFactor = hre.ethers.utils.formatEther(absorbFactorWad);
            expect(absorbFactor).to.equal("1.28");
        });
    });

    describe("unplantedByAddress", () => {

        it("should return the unplanted plant ids", async () => {
            const { user1, plant } = await setup();
            await plant.buy();
            await plant.buy();
            const unplantedIds = await plant.unplantedByAddress(user1.address);
            expect(unplantedIds.map(bn => bn.toNumber())).to.deep.equal([1, 2]);
        });
    });
});
