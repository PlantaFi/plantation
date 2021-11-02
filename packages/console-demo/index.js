const menu = require('console-menu');
const process = require('process');
const max = Math.max;
const min = Math.min;

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
        item.cb();
        if (++lineCount % 10 == 0) { printHead(); }
        printTree() //console.log('You chose: ' + JSON.stringify(item));
    }
}

let Time = 0; // absolute internal timestamp in seconds
let Balance = 10; // in MATIC
const GasCost = 0.005; // base gas for every tx
const WaterCost = 0.5;
const PruneCost = 0.1;

/*
bits
3: 1 of 8 species
3: growth bonus (4% extra growth per unit 2^3)
3: maturation bonus - less growth required per stage (4% less growth needed to stage up per unit 2^3)
3: water efficiency (absorb 4% more water per unit)
3: fertilizer efficiency (absorb 4% more fertilizer)
3: fruit bonus (grows 4% more per)
3: longevity (lives 6% longer per)
3: weaken hardiness (3% less branches weaken)
3: (branch) dying hardiness (3% less branches die)
5: color/cosmetic
= sums to 32
*/
// returns a 32-char string of 1s and 0s
function generateDNA() {
  // return Math.floor(Math.random() * 2 ** 32).toString(2).padStart(32, "0");
  return '11110110111101100101000110001100';
}
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

const MAX_ABSORB = 500;

const Genes = parseGenes(generateDNA());

const factor = (name) => 1 + Genes[name] * .04; // XXX assumes 4% effect per unit for each gene

// absorbed amt related to healthy mass
function _absorbed(norm, weak, dead) {
    return Math.min(MAX_ABSORB, factor('absorb') * norm);
}
function _useRate(norm, weak, dead) {
    // TODO should we cap useRate?
    // weak/dead will spend absorbed water
    return /* DNAwaterUseFactor * */ (1 + Math.floor(Math.sqrt(norm+weak+dead)));
}
const Tree = {
    norm: 1 /* must be >0 */,
    weak: 0,
    dead: 0,
    h2oTil: 0,
    h2oFrom: 0,
    // rest get initialized by water()
}

const branchLinearRate = 1.0 // base rate per hour
const wetWeakenRate = 0.05;
const dryWeakenRate = 0.2;
const strengthenRate = 0.1;
const deathRate = 0.1;

const wetTime = (T) => (min(Time, T.h2oTil) - T.h2oFrom) / 3600;
const dryTime = (T) => (max(0, Time - T.h2oTil)) / 3600;

const wetGrowth = (T) => wetTime(T) * factor('growth') * (branchLinearRate + Math.sqrt(T.norm));
const wetWeaken = (T) => wetTime(T) * factor('weak')/2 * wetWeakenRate * T.norm;
const dryWeaken = (T) => dryTime(T) * factor('weak')/2 * dryWeakenRate * T.norm;
const wetStrengthen = (T) => wetTime(T) * strengthenRate * T.weak;

const normBranchGrowth = (T) => wetGrowth(T) - wetWeaken(T) + wetStrengthen(T) - dryWeaken(T);
const weakBranchGrowth = (T) =>                wetWeaken(T) - wetStrengthen(T) + dryWeaken(T) - deadBranchGrowth(T);
const deadBranchGrowth = (T) => factor('die') * deathRate * (Time - T.h2oFrom)/3600 * T.weak;

const printGenes = () => console.log(Object.keys(Genes).map(k => `${k}: ${Genes[k]}`).join('\n'));
const printHead = () => console.log('Time(H) ,MATIC    ,~br.norm   ,~br.weak   ,~br.dead   ,>=last sum  ,h2o.level,/ h2o.useRate,=h2o.hours'.split(',').join('\t'));
const printTree = () => console.log([Time/3600, Balance, Tree.norm + normBranchGrowth(Tree), Tree.weak + weakBranchGrowth(Tree), Tree.dead + deadBranchGrowth(Tree), Tree.norm+Tree.weak+Tree.dead, Tree.h2oLevelFrom/3600, Tree.h2oUseRate, Tree.h2oTil/3600].map(x => x.toFixed(2)).join('\t\t'));

// no time passes
function water() {
    update();
    Balance -= (WaterCost + GasCost);
    Tree.h2oLevelFrom = _absorbed(Tree.norm, Tree.weak, Tree.dead);
    Tree.h2oUseRate = _useRate(Tree.norm, Tree.weak, Tree.dead);
    Tree.h2oTil = Time + 3600 * Tree.h2oLevelFrom/Tree.h2oUseRate;
    Tree.h2oFrom = Time;
}
function update() {
    // pre-calc before assign due to dependencies
    [Tree.norm, Tree.weak, Tree.dead] = [Tree.norm + normBranchGrowth(Tree),
        Tree.weak + weakBranchGrowth(Tree),
        Tree.dead + deadBranchGrowth(Tree)];
}
function idle1hr() {
    Time += 3600;
}
function currentH2oLevel() {
    return max(0, Tree.h2oLevelFrom - (Time - Tree.h2oFrom)/3600 * Tree.h2oUseRate);
}
// prune efficiency - able to target most dead, many weak, accidently prune few normal
const pruneDead = 0.8;
const pruneWeak = 0.4;
const pruneNorm = 0.1;
const pruneInfection = 0.05;

// assume for now a constant "effort" of pruning which can be called multiple times
function prune() {
    update();
    Balance -= (PruneCost + GasCost);
    let targetAmount = 100;
    const deads = min(targetAmount, pruneDead * Tree.dead);
    const weaks = min(targetAmount - deads, pruneWeak * Tree.weak);
    const norms = min(targetAmount - deads - weaks, pruneNorm * Tree.norm);
    console.log(`pruned norms:${norms}, weaks:${weaks}, deads:${deads}`);
    Tree.norm -= norms;
    Tree.weak -= weaks;
    Tree.dead -= deads;

    // XXX update but not used until next watering - doesn't update level or h2oTil or From
    Tree.h2oUseRate = _useRate(Tree.norm, Tree.weak, Tree.dead);
    // TODO
    // can't track wounds alone w/o knowing number+when cut so make infections immediately weaken/die
    // so pruning will kill some healthy

}

const THRESH_ADULT_BRANCHES = 1000; // assume it should take about a week to reach adulthood
const isAdult = (T) => T.isAdult ? true : T.norm > THRESH_ADULT_BRANCHES;
const isHealthyAdult = (T) => T.norm > THRESH_ADULT_BRANCHES;

async function main() {
    printGenes();
    printHead();
    water();
    printTree();
    while (1) {
        await next();
    }
}
main()






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

