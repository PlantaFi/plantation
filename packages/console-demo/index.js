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
    // rest get initialized by water()
}
water();

const branchLinearRate = 1.0 // base rate per hour
const wetWeakenRate = 0.05;
const dryWeakenRate = 0.2;
const strengthenRate = 0.1;
const deathRate = 0.1;

const minOr0 = (x, y) => max(0, min(x, y));

const wetTime = (T, t) => minOr0(t, T.h2oHours);
const dryTime = (T, t) => max(0, t - T.h2oHours);

const wetGrowth = (T, t) => wetTime(T, t) * factor('growth') * (branchLinearRate + Math.sqrt(T.norm));
const wetWeaken = (T, t) => wetTime(T, t) * factor('weak')/2 * wetWeakenRate * T.norm;
const dryWeaken = (T, t) => dryTime(T, t) * factor('weak')/2 * dryWeakenRate * T.norm;
const wetStrengthen = (T, t) => wetTime(T, t) * strengthenRate * T.weak;

const normBranchGrowth = (T, t) => wetGrowth(T, t) - wetWeaken(T, t) + wetStrengthen(T, t) - dryWeaken(T, t);
const weakBranchGrowth = (T, t) =>                   wetWeaken(T, t) - wetStrengthen(T, t) + dryWeaken(T, t) - deadBranchGrowth(T, t);
const deadBranchGrowth = (T, t) => factor('die') * deathRate * t * T.weak;

const printGenes = () => console.log(Object.keys(Genes).map(k => `${k}: ${Genes[k]}`).join('\n'));
const printHead = () => console.log('MATIC    ,br.norm   ,+br.weak   ,+br.dead   ,=br.total  ,h2o.level,/ h2o.useRate,=h2o.hours'.split(',').join('\t'));
const printTree = () => console.log([Balance, Tree.norm, Tree.weak, Tree.dead, Tree.norm+Tree.weak+Tree.dead, Tree.h2oLevel, Tree.h2oUseRate, Tree.h2oHours].map(x => x.toFixed(2)).join('\t\t'));

// no time passes
function water() {
    Balance -= (WaterCost + GasCost);
    Tree.h2oLevel = _absorbed(Tree.norm, Tree.weak, Tree.dead);
    Tree.h2oUseRate = _useRate(Tree.norm, Tree.weak, Tree.dead);
    Tree.h2oHours = Tree.h2oLevel/Tree.h2oUseRate;
}
function idle1hr() {
    // pre-calc before assign due to dependencies
    [Tree.norm, Tree.weak, Tree.dead] = [Tree.norm + normBranchGrowth(Tree, 1),
        Tree.weak + weakBranchGrowth(Tree, 1),
        Tree.dead + deadBranchGrowth(Tree, 1)];
    Tree.h2oLevel = Math.max(0, Tree.h2oLevel - Tree.h2oUseRate);
    Tree.h2oHours = Math.max(0, Tree.h2oHours - 1);
}
// prune efficiency - able to target most dead, many weak, accidently prune few normal
const pruneDead = 0.8;
const pruneWeak = 0.4;
const pruneNorm = 0.1;
const pruneInfection = 0.05;

// assume for now a constant "effort" of pruning which can be called multiple times
function prune() {
    Balance -= (PruneCost + GasCost);
    let targetAmount = 100;
    const deads = min(targetAmount, pruneDead * Tree.dead);
    const weaks = min(targetAmount - deads, pruneWeak * Tree.weak);
    const norms = min(targetAmount - deads - weaks, pruneNorm * Tree.norm);
    console.log(`pruned norms:${norms}, weaks:${weaks}, deads:${deads}`);
    Tree.norm -= norms;
    Tree.weak -= weaks;
    Tree.dead -= deads;

    // XXX update but not used until next watering - doesn't update h2oHours/level
    Tree.h2oUseRate = _useRate(Tree.norm, Tree.weak, Tree.dead);
    // TODO
    // can't track wounds alone w/o knowing number+when cut so make infections immediately weaken/die
    // so pruning will kill some healthy

}
async function main() {
    printGenes();
    printHead();
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

