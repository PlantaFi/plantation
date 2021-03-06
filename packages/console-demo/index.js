const menu = require('console-menu');
const process = require('process');
const max = Math.max;
const min = Math.min;

let lineCount = 0;
async function next() {
    let item = await menu(hotkeys);
    if (item && item.cb) {
        item.cb();
        checkAlive();
        if (++lineCount % 10 == 0) { printHead(); }
        printTree() //console.log('You chose: ' + JSON.stringify(item));
    }
}

let DEBUG = false;
const debugSwitch = () => DEBUG = !DEBUG;
const hotkeys = [
        { hotkey: 'i', title: 'Idle (pass 1 hour)', cb: idle1hr, selected: true },
        { hotkey: 'w', title: 'Water (cost 0.1)', cb: water },
        { hotkey: 'p', title: 'Prune', cb: prune },
        { hotkey: 'b', title: 'Burn (and replant)', cb: burn },
        { hotkey: 'd', title: 'Debug', cb: debugSwitch },
        { separator: true },
        { hotkey: 'q', title: 'Quit', cb: process.exit },
];
const Ctx = {
  time: 0, // absolute internal timestamp in seconds
  balance: 10, // in MATIC
  landBurns: 10, // boosts longevity by 4%
  landSpecies: Math.floor(Math.random() * 8),
}
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
3: longevity (lives 4% longer per)
3: weaken hardiness (4 less branches weaken)
3: (branch) dying hardiness (4% less branches die)
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
                    MATURE : 2*3, // TODO how soon it starts fruiting
                    ABSORB : 3*3,
                    FERTILE: 4*3, // TODO affects potential fruit bounty
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
const FRAILTY_THRESH = 5000;

// TODO move into Tree
const Genes = parseGenes(generateDNA());

const factor = (name) => 1 + Genes[name] * .04; // XXX assumes 4% effect per unit for each gene

// Weaken absorption as land/plant "species" code diverges, but max out at 20% penalty
const landSpeciesMatchFactor = () => 1 - .04 * max(5, Math.abs(factor('species') - Ctx.landSpecies));

// absorbed amt related to healthy mass
function _absorbed(norm, weak, dead) {
    return Math.min(MAX_ABSORB, factor('absorb') * norm * landSpeciesMatchFactor());
}
function _useRate(norm, weak, dead) {
    // TODO should we cap useRate?
    // weak/dead will spend absorbed water
    return /* DNAwaterUseFactor * */ (1 + Math.floor(Math.sqrt(norm+weak+dead)));
}
const Tree = { }
function initTree() {
    Tree.isAlive = true;
    Tree.frailty = 1.0; // multiplies weakenRates as multiple of 5000 deadPruned
    Tree.norm = 1 /* must be >0 */;
    Tree.weak = 0;
    Tree.dead = 0;
    Tree.deadPruned = 0;
    Tree.h2oTil = Ctx.time;
    Tree.h2oFrom = Ctx.time;
    water();
}

const branchLinearRate = 1.0 // base rate per hour
const wetWeakenRate = 0.05;
const dryWeakenRate = 0.2;
const strengthenRate = 0.1;
const deathRate = 0.1;

// redefine 'time' to mean seconds of specified 1 hour spent in wet/dry state
const wetTime = (tbox) => max(0, (min(tbox.h2oTil, tbox.t1) - max(tbox.h2oFrom, tbox.t0)))/3600;
const dryTime = (tbox) => (max(tbox.h2oTil, tbox.t1) - max(tbox.h2oTil, tbox.t0))/3600;
const anyTime = (tbox) => (tbox.t1 - max(tbox.h2oFrom, tbox.t0))/3600;

// TimeBox = { t0, t1, h2oFrom, h2oTil }
const wetGrowth = (tbox, norm) => wetTime(tbox) * factor('growth') * (branchLinearRate + Math.sqrt(norm));
const wetWeaken = (tbox, norm) => wetTime(tbox) * factor('weak')/2 * wetWeakenRate * norm;
const dryWeaken = (tbox, norm) => dryTime(tbox) * factor('weak')/2 * dryWeakenRate * norm;
const wetStrengthen = (tbox, weak) => wetTime(tbox) * strengthenRate * weak;
const normBranchGrowth = (tbox, norm, weak, frailty) => wetGrowth(tbox, norm) - frailty * wetWeaken(tbox, norm) + wetStrengthen(tbox, weak) - frailty * dryWeaken(tbox, norm);
const weakBranchGrowth = (tbox, norm, weak, frailty) =>                         frailty * wetWeaken(tbox, norm) - wetStrengthen(tbox, weak) + frailty * dryWeaken(tbox, norm) - deadBranchGrowth(tbox, weak);
const deadBranchGrowth = (tbox, weak) => factor('die') * deathRate * anyTime(tbox) * weak;

// compounds from h2oFrom to Time, hourly
function extrapolateBranches() {
  let [norm, weak, dead] = [Tree.norm, Tree.weak, Tree.dead];
  let tbox = {t0: Tree.h2oFrom, t1: null, h2oFrom: Tree.h2oFrom, h2oTil: Tree.h2oTil};
  while (tbox.t0 < Ctx.time) {
    tbox.t1 = min(Ctx.time, tbox.t0 + 3600);
    if (DEBUG) { debug(tbox, norm, weak, dead); }
    let normDelta = normBranchGrowth(tbox, norm, weak, Tree.frailty);
    let weakDelta = weakBranchGrowth(tbox, norm, weak, Tree.frailty);
    let deadDelta = deadBranchGrowth(tbox, weak);
    norm += normDelta;
    weak += weakDelta;
    dead += deadDelta;
    tbox.t0 += 3600;
  }
  return [norm, weak, dead];
}

const printGenes = () => console.log(Object.keys(Genes).map(k => `${k}: ${Genes[k]}`).join('\n'));
const printHead = () => console.log('Time(H) ,MATIC    ,~br.norm   ,~br.weak   ,~br.dead   ,deadPruned  ,frailty  ,>=last sum  ,/ h2o.useRate,=h2o.hours'.split(',').join('\t'));
const printTree = () => console.log([Ctx.time/3600, Ctx.balance, ...extrapolateBranches(), Tree.deadPruned, Tree.frailty, Tree.norm+Tree.weak+Tree.dead, Tree.h2oUseRate, Tree.h2oTil/3600].map(x => x.toFixed(2)).join('\t\t'));

function debug(tbox, norm, weak, dead) {
  const names = ['from', 'til', 't0', 't1', 'norm', 'weak', 'wetTime', 'dryTime', 'norm Grow', 'weak Grow', 'dead Grow'];
  const vals = [tbox.h2oFrom, tbox.h2oTil, tbox.t0, tbox.t1, Tree.norm, Tree.weak, wetTime(tbox), dryTime(tbox), normBranchGrowth(tbox, norm, weak), weakBranchGrowth(tbox, norm, weak), deadBranchGrowth(tbox, weak)];
  for (let i = 0; i < names.length; i++) {
    if (1||vals[i] < 0) {
      console.log(`${names[i]} ${vals[i]}`);
    }
  }
}
function checkAlive() {
  if (extrapolateBranches()[0] < 1) {
    Tree.isAlive = false;
    console.log('PLANT IS DEAD');
  }
}

// no time passes
function water() {
    updateBranches();
    Ctx.balance -= (WaterCost + GasCost);
    // XXX LevelFrom not needed if we save Til
    const _h2oLevelFrom = _absorbed(Tree.norm, Tree.weak, Tree.dead);
    Tree.h2oUseRate = _useRate(Tree.norm, Tree.weak, Tree.dead);
    Tree.h2oTil = Ctx.time + 3600 * _h2oLevelFrom/Tree.h2oUseRate;
    Tree.h2oFrom = Ctx.time;
}
function updateBranches() {
    // pre-calc before assign due to dependencies
    [Tree.norm, Tree.weak, Tree.dead] = extrapolateBranches();
    // growth depends on h2oFrom and h2oTil and branch counts. h2oTil remains but h2oFrom ...
    Tree.h2oFrom = Ctx.time;
    // Can't let From > Til
    if (Ctx.time > Tree.h2oTil) {
      Tree.h2oTil = Ctx.time;
    }
}
function idle1hr() {
    Ctx.time += 3600;
}
// prune efficiency - able to target most dead, many weak, accidently prune few normal
const pruneDead = 0.8;
const pruneWeak = 0.4;
const pruneNorm = 0.1;
const pruneInfection = 0.05;

// assume for now a constant "effort" of pruning which can be called multiple times
function prune() {
    updateBranches();
    Ctx.balance -= (PruneCost + GasCost);
    let targetAmount = 100;
    const deads = min(targetAmount, pruneDead * Tree.dead);
    const weaks = min(targetAmount - deads, pruneWeak * Tree.weak);
    const norms = min(targetAmount - deads - weaks, pruneNorm * Tree.norm);
    console.log(`pruned norms:${norms}, weaks:${weaks}, deads:${deads}`);
    Tree.norm -= norms;
    Tree.weak -= weaks;
    Tree.dead -= deads;
    Tree.deadPruned += deads;
    Tree.frailty = 1+(Tree.deadPruned/((1 + .04*Ctx.landBurns) * factor('long') * FRAILTY_THRESH))**3;

    // XXX update but not used until next watering - doesn't update level or h2oTil or From
    Tree.h2oUseRate = _useRate(Tree.norm, Tree.weak, Tree.dead);
    // TODO
    // can't track wounds alone w/o knowing number+when cut so make infections immediately weaken/die
    // so pruning will kill some healthy

}

function burn() {
  if (Tree.deadPruned > 1000) {
    Ctx.landBurns++;
  } else {
    console.log('Burned too early to get land bonus');
  }
  initTree();
}

const THRESH_ADULT_BRANCHES = 1000; // assume it should take about a week to reach adulthood
const isAdult = (T) => T.isAdult ? true : T.norm > THRESH_ADULT_BRANCHES;
const isHealthyAdult = (T) => T.norm > THRESH_ADULT_BRANCHES;

async function main() {
    printGenes();
    printHead();
    initTree();
    printTree();
    while (1) {
        await next();
    }
}

if (require.main === module) {
    main();
} else {
    console.log('required as a module');
}

module.exports = {
  Tree,
  Ctx,
  initTree,
  debug,
  printHead,
  printTree,
  water,
  prune,
  idle1hr,
  burn,
  main
}


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

