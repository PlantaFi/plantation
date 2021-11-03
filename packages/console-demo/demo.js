const menu = require('console-menu');
const process = require('process');
const { ethers } = require('ethers');

const abi = require('../react-app/src/contracts/hardhat_contracts.json');

async function main() {
    const provider = new ethers.providers.StaticJsonRpcProvider();
    const signer = provider.getSigner();
    const network = await provider.getNetwork();
    const chainId = network.chainId;
    const networkName = network.name != 'unknown' ? network.name : 'localhost';
    const deployedContracts = abi[chainId][networkName].contracts;
    const Plant = deployedContracts.Plant;
    const plant = new ethers.Contract(Plant.address, Plant.abi, signer);

    let lineCount = 0;
    async function next() {
    let item = await menu([
        { hotkey: 'i', title: 'Idle (pass 1 hour)', cb: idle1hr, selected: true },
        { hotkey: 'w', title: 'Water (cost 0.1)', cb: water },
        { hotkey: 'p', title: 'Prune', cb: prune },
        { separator: true },
        { hotkey: 'q', title: 'Quit', cb: process.exit },
    ])
    if (item && item.cb) {
        await item.cb();
        if (++lineCount % 10 == 0) { printHead(); }
        await printTree() //console.log('You chose: ' + JSON.stringify(item));
    }
    }

    let Balance = 10; // in MATIC
    const GasCost = 0.005; // base gas for every tx
    const WaterCost = 0.5;
    const PruneCost = 0.1;

    Balance -= (WaterCost + GasCost);

    function parseGenes(dnaStr) {
        const OFFSETS = { SPECIES: 0*3,
                            GROWTH : 1*3,
                            MATURE : 2*3,
                            ABSORB : 3*3,
                            FERTILE: 4*3,
                            FRUIT  : 5*3,
                            LONG   : 6*3,
                            WEAK   : 7*3,
                            DIE    : 8*3,
                            COLOR  : 9*3, // special case of 5 bits
                        };
        const genes = {};
        for (let key in OFFSETS) {
            genes[key.toLowerCase()] = parseInt(dnaStr.slice(OFFSETS[key], OFFSETS[key] + (key == 'COLOR' ? 5 : 3)), 2);
        }
        return genes;
    }

    const { dna } = await plant.plantStates(0);
    const Genes = parseGenes(dna.toString(2));
    const printGenes = () => console.log(Object.keys(Genes).map(k => `${k}: ${Genes[k]}`).join('\n'));
    const printHead = () => console.log('MATIC    ,~br.norm   ,~br.weak   ,~br.dead   ,>=last sum  ,h2o.level,/ h2o.useRate,=h2o.hours'.split(',').join('\t'));

    async function printTree() {
        const Tree = await plant.state(0);
        const values = [Tree.lastNormalBranch, Tree.lastWeakBranch, Tree.lastDeadBranch, Tree.lastNormalBranch.add(Tree.lastWeakBranch).add(Tree.lastDeadBranch), Tree.lastWaterLevel, Tree.lastWaterUseRate, Tree.lastWaterTicks]
            .map(ethers.utils.formatEther)
            .map(s => parseFloat(s).toFixed(2))
            .join('\t\t');
        console.log(`${Balance.toFixed(2)}\t\t${values}`);
    }

    async function idle1hr() {
        const now = (await provider.getBlock(await provider.getBlockNumber())).timestamp;
        const plusOneHour = now + 1 * 60 * 60;
        await provider.send('evm_setNextBlockTimestamp', [plusOneHour]);
        await provider.send('evm_mine', []);
    }

    async function water() {
        Balance -= (WaterCost + GasCost);
        await plant.water(0);
    }

    async function prune() {
        Balance -= (PruneCost + GasCost);
        await plant.prune(0);
    }

    await printGenes();
    printHead();
    while (1) {
        await next();
    }
}

main().catch(e => {
    console.error(e);
    process.exit(1);
})






/*
 * solidity square root
function sqrt(uint x) returns (uint y) {
    uint z = (x + 1) / 2;
    y = x;
    while (z < y) {
        y = z;
        z = (x / z + z) / 2;
    }
}
*/

