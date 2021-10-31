const menu = require('console-menu');
const process = require('process');

async function next() {
    let item = await menu([
        { hotkey: 'i', title: 'Idle (pass 1 day)', cb: idle1d, selected: true },
        { hotkey: 's', title: `Fertilize/Stake 1 MATIC for ${fruitOutGivenMaticIn(1*(1-Game.fertilizeTaxRate))} preFruit`, cb: fertilize },
        { hotkey: 'S', title: `Fertilize/Stake 10 MATIC for ${fruitOutGivenMaticIn(10*(1-Game.fertilizeTaxRate))} preFruit`, cb: fertilize10 },
        { hotkey: 'h', title: 'Harvest', cb: harvest },
        //{ hotkey: 'p', title: 'Sell 1 FRUIT for PLANT seed', cb: fruit2plant },
        { hotkey: 'm', title: `Sell 1 FRUIT for ${maticOutGivenFruitIn(1)} MATIC`, cb: fruit2matic },
        { separator: true },
        { hotkey: 'q', title: 'Quit', cb: process.exit },
    ])
    if (item && item.cb) {
        item.cb();
        console.log('.');
        printHead();
        printState();
        //console.log(Player);
        //console.log(Game);
    }
}

const Player = {};
const Game = {};
const GamePool = {};
const Fruit = { totalSupply: 0 };

// DEX has a MATIC/FRUIT rate
// Game also starts with 1 MATIC = 1 FRUIT
// over time collects MATIC... FRUIT should become more valuable
// more valuable means in AMM that balance is MATIC > FRUIT
// can always exchange FRUIT for MATIC then it's like a DEX. no need for another DEX.
// we should separate the fees/tax into separate pool
//
//
// fertilize: stakes matic minus fee, mints fruit andn both go into pool
// later at maturity prefruit amount can be removed from pool, if more.. then more fruit is minted (inflation
// if immediately harvest -> exchanged for matic then fruit price will drop
//
function initState() {
  Player.maticBalance = 1000;
  Player.fruitBalance = 0;
  Player.preFruitClaim = 0; // aggregate all plants unharvested, assume same timing
  Player.plantBalance = 0; // no need to track, assume 1
  Player.sinceFertilize = 0; // days since fertilize - reach fertilizePeriod for 100%

  Game.fertilizePeriod = 3;
  Game.bonusStake = 0.02; // compounds per period after 100% ripe
  GamePool.maticBalance = 0;
  Game.maticPotBalance = 0; // profit
  Game.fruitPotBalance = 0;
  GamePool.fruitBalance = 0; // fertilize -> mints and stakes this future fruit
  Fruit.totalSupply = 0; // theoretical price is totalSupply (not pool balance) / maticPoolBalance
  Game.fertilizeTaxRate = 0.05;
  Game.harvestTaxRate = 0.025;
}

function initFruitPrice() {
  GamePool.maticBalance = 10;
  GamePool.fruitBalance = 10; // initalize to 1 MATIC = 1 FRUIT
  Fruit.totalSupply = 10; // should it go into player's account? no
}

const pad12 = (s) => (s + '            ').slice(0, 12);
const printHead = () => console.log('Player,---,---,---,---,---,Game Profit,,Game Pool,\nMATIC,FRUIT,preFruit,days fert,ripe,bonus,MATIC,FRUIT,MATIC,FRUIT,supply FRUIT'.split(',').map(x => pad12(x)).join(''));
const printState = () => console.log([Player.maticBalance, Player.fruitBalance, Player.preFruitClaim, Player.sinceFertilize, harvestable()[0], harvestable()[1], Game.maticPotBalance, Game.fruitPotBalance, GamePool.maticBalance, GamePool.fruitBalance, Fruit.totalSupply].map(x => pad12((x).toFixed(2))).join(''));

function idle1d() {
  Player.sinceFertilize++;
}

// x*y=k -> (x+maticIn)*(y-fruitOut) = x*y -> fruitOut = -1*(x*y / (x+maticIn) - y) = y-x*y/(x+mIn)
const fruitOutGivenMaticIn = (maticIn) => GamePool.fruitBalance - GamePool.maticBalance * GamePool.fruitBalance / (GamePool.maticBalance + maticIn);
//          (x-maticOut)*(y+fruitIn) = x*y -> maticOut = -1*(x*y / (y+fruitIn) - x) = x-x*y/(y+fIn)
const maticOutGivenFruitIn = (fruitIn) => GamePool.maticBalance - GamePool.maticBalance * GamePool.fruitBalance / (GamePool.fruitBalance + fruitIn)

// TODO amount should be in (pre)FRUIT, not MATIC.. so cost will fluctuate
function fertilize(amount=1) {
  let tax = amount * Game.fertilizeTaxRate;
  let _amount = amount - tax;
  let fruitOut = fruitOutGivenMaticIn(_amount);
  Player.maticBalance -= amount;
  Game.maticPotBalance += tax;
  GamePool.maticBalance += _amount;
  console.log(`amt ${amount}, tax ${tax}, fOUT ${fruitOut}`);
  console.log(`fertilized ${fruitOut} preFruit. Ripens 100% in ${Game.fertilizePeriod} days.`);
  Player.preFruitClaim += fruitOut; // XXX allows re-fertilize but resets timer
  Player.sinceFertilize = 0;
  GamePool.fruitBalance += fruitOut; // it's only preFruit because not yet harvested, but is minted
  Fruit.totalSupply += fruitOut;
}
const fertilize10 = () => fertilize(10);

// returns [ripenedPreFruit, compoundedBonusUnmintedFruit]
function harvestable() {
  let amount;
  let bonus = 0;
  let _since = Player.sinceFertilize;
  let _period = Game.fertilizePeriod;
  if (_since < _period) {
    amount = _since / _period * Player.preFruitClaim;
  } else if (_since == _period) {
    amount = Player.preFruitClaim;
  } else {
    bonus = Player.preFruitClaim * Math.pow(1 + Game.bonusStake, _since - _period) - Player.preFruitClaim;
    amount = Player.preFruitClaim;
  }

  return [amount, bonus];
}
function harvest() {
  const [amount, bonus] = harvestable();
  if (bonus) {
    // "mint" extra that didn't exist, must be minted into supply, may be implications for minting long after debt had increased
    console.log(`mint ${bonus} new FRUIT`);
    Fruit.totalSupply += bonus;
    GamePool.fruitBalance += bonus;
  }
  let tax = (amount + bonus) * Game.harvestTaxRate;
  // TODO auto-sell FRUIT tax to MATIC
  Game.fruitPotBalance += tax;

  Player.preFruitClaim = 0;
  Player.sinceFertilize = 0;

  // TODO transferFrom(amount, 'fruit', Game, Player) = from['fruit' + 'Balance'] -= amount, to['fruit' + 'Balance'] += amount;
  console.log(`harvested ${amount + bonus - tax} FRUIT after ${tax} tax`);
  Player.fruitBalance += amount + bonus - tax;
  GamePool.fruitBalance -= amount + bonus;

}

function fruit2matic() {
  let fruitIn = 1;
  if (fruitIn > Player.fruitBalance) {
    fruitIn = Player.fruitBalance;
  }
  const maticOut = maticOutGivenFruitIn(fruitIn);
  console.log(`sold ${fruitIn} FRUIT for ${maticOut} MATIC`);
  Player.fruitBalance -= fruitIn;
  GamePool.fruitBalance += fruitIn;
  Player.maticBalance += maticOut;
  GamePool.maticBalance -=maticOut;
}

function fruit2plant() {
}

async function main() {
  initState();
  initFruitPrice();
  printHead();
  while (1) {
    await next();
  }
}
main()

