const { deployments } = require("hardhat");
const { use, expect } = require("chai");
const { solidity } = require("ethereum-waffle");

use(solidity);

const setup = deployments.createFixture(async hre => {
    await hre.deployments.fixture("Plant");
    const [user1, user2] = await hre.ethers.getUnnamedSigners();
    const plant = await hre.ethers.getContract("Plant", user1);
    return {
        hre,
        user1,
        user2,
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
            const token1Id = await plant.tokenOfOwnerByIndex(user1.address, 0);
            await plant.buy();
            const token2Id = await plant.tokenOfOwnerByIndex(user1.address, 1);
            const unplantedIds = await plant.unplantedByAddress(user1.address);
            expect(unplantedIds).to.deep.equal([token1Id, token2Id]);
        });
    });

    describe("burn", () => {

        it("should only burn an owned plant", async () => {
            const { user1, user2, plant } = await setup();
            await plant.buy();
            const token1Id = await plant.tokenOfOwnerByIndex(user1.address, 0);
            const plantUser2 = plant.connect(user2);
            await plantUser2.buy();
            await expect(plantUser2.burn(token1Id)).to.be.reverted;
        });

        it("should burn an owned plant", async () => {
            const { hre, user1, plant } = await setup();
            await plant.buy();
            const user1Balance = await plant.balanceOf(user1.address);
            const token1Id = await plant.tokenOfOwnerByIndex(user1.address, 0);
            await expect(plant.burn(token1Id)).to.emit(plant, 'Transfer').withArgs(user1.address, hre.ethers.constants.AddressZero, 1);
            expect(await plant.balanceOf(user1.address)).to.equal(user1Balance.sub(1));
        });
    });
});
