const menu = require('console-menu');
const process = require('process');

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
// const Time = 0; // unused

let DNAwaterUseFactor = 1.0;
let soilAbsorbFactor = 1.0;
const MAX_ABSORB = 500;

// soilAbsorbFactor is 1.0 to 1.5, default to 1.0
// DNAwaterUseFactor is 0.8 to 1.2, default to 1.0
function _absorbed(soilAbsorbFactor, norm, weak, dead) {
    // absorbed amt related to healthy mass
    return Math.min(MAX_ABSORB, soilAbsorbFactor * norm);
}
function _useRate(soilAbsorbFactor, norm, weak, dead) {
    // TODO should we cap useRate?
    // weak/dead will spend absorbed water
    return DNAwaterUseFactor * (1 + Math.floor(Math.sqrt(norm+weak+dead)));
}
const Tree = {
    norm: 1 /* must be >0 */,
    weak: 0,
    dead: 0,
    // rest get initialized by water()
}
water();

const branchLinearRate = 1.0 // base rate per hour
const weakenRate = 0.05;
const strengthenRate = 0.1;
const dryWeakenRate = 0.2;
const deathRate = 0.1;

// linear component + exponential

const max = Math.max;
const min = Math.min;
const minOr0 = (x, y) => max(0, min(x, y));

// assumes hydration - t is hours to look forward
//
// while hydrated... norm grow.. then stop when not
// while hydrated... some norm weaken.. then more weaken
// while hydrated... some weak die.. then more weak die
const normBranchGrowth = (T, t) => minOr0(t, T.h2oHours) * (
        branchLinearRate + Math.sqrt(T.norm) -
        weakenRate * T.norm +
        strengthenRate * T.weak
    ) - max(0, t - T.h2oHours) * dryWeakenRate * T.norm
const weakBranchGrowth = (T, t) => minOr0(t, T.h2oHours) * (
        weakenRate * T.norm -
        strengthenRate * T.weak
    ) + max(0, t - T.h2oHours) * dryWeakenRate * T.norm - deathRate*t*T.weak;
const deadBranchGrowth = (T, t) => deathRate*t*T.weak;

function printHead() {
    console.log('MATIC    ,br.norm   ,+br.weak   ,+br.dead   ,=br.total  ,h2o.level,/ h2o.useRate,=h2o.hours'.split(',').join('\t'));
}
function printTree() {
    console.log([Balance, Tree.norm, Tree.weak, Tree.dead, Tree.norm+Tree.weak+Tree.dead, Tree.h2oLevel, Tree.h2oUseRate, Tree.h2oHours].map(x => x.toFixed(2)).join('\t\t'));
}
// no time passes
function water() {
    Balance -= (WaterCost + GasCost);
    Tree.h2oLevel = _absorbed(soilAbsorbFactor, Tree.norm, Tree.weak, Tree.dead);
    Tree.h2oUseRate = _useRate(soilAbsorbFactor, Tree.norm, Tree.weak, Tree.dead);
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
    Tree.h2oUseRate = _useRate(soilAbsorbFactor, Tree.norm, Tree.weak, Tree.dead);
    // TODO
    // can't track wounds alone w/o knowing number+when cut so make infections immediately weaken/die
    // so pruning will kill some healthy

}
async function main() {
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

