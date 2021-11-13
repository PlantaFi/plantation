const menu = require('console-menu');
const process = require('process');

async function next() {
    let item = await menu([
        { hotkey: 'i', title: 'Idle (pass 1 HOUR)', cb: idle1h, selected: true },
        { hotkey: 'I', title: 'Idle (pass 1 day)', cb: idle1d, selected: true },
        { hotkey: 's', title: `Fertilize/Stake 1 MATIC for ${fruitOutGivenMaticIn(1*(1-Game.fertilizeTaxRate))} preFruit`, cb: fertilize },
        { hotkey: 'S', title: `Fertilize/Stake 10 MATIC for ${fruitOutGivenMaticIn(10*(1-Game.fertilizeTaxRate))} preFruit`, cb: fertilize10 },
        { hotkey: 'h', title: 'Harvest', cb: harvest },
        //{ hotkey: 'p', title: 'Sell 1 FRUIT for PLANT seed', cb: fruit2plant },
        { hotkey: 'm', title: `Sell 1 FRUIT for ${maticOutGivenFruitIn(1)} MATIC`, cb: fruit2matic },
        { hotkey: 'M', title: `Sell 10 FRUIT for ${maticOutGivenFruitIn(10)} MATIC`, cb: _10fruit2matic },
        { hotkey: 'b', title: `Buy Plant-seed for ${nextSeedPrice()} FRUIT`, cb: fruit2plant },
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

let Time = 0;
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
  Player.plantBalance = 1;
  Player.fertilizedFrom = 0; // days since fertilize - reach fertilizePeriod for 100%

  Game.fertilizePeriod = 3 * 24 * 3600; // seconds to fully ripen
  Game.bonusStake = 0.02; // compounds per period (3D) after 100% ripe
  GamePool.maticBalance = 0;
  Game.maticPotBalance = 0; // profit
  Game.fruitPotBalance = 0;
  GamePool.fruitBalance = 0; // fertilize -> mints and stakes this future fruit
  Fruit.totalSupply = 0; // theoretical price is totalSupply (not pool balance) / maticPoolBalance
  Game.fertilizeTaxRate = 0.05;
  Game.harvestTaxRate = 0.025;
  Game.seedsSold = 0; // used to calculate next seed's price
  Game.seedBurnTake = 0.5; // how much FRUIT from seed sale is burned vs taken as profit
}

function initFruitPrice() {
  GamePool.maticBalance = 10;
  GamePool.fruitBalance = 10; // initalize to 1 MATIC = 1 FRUIT
  Fruit.totalSupply = 10; // should it go into player's account? no
}

const pad12 = (s) => (s + '            ').slice(0, 12);
const printHead = () => console.log('Player,---,---,---,---,---,---,Game Profit,,Game Pool,\nMATIC,Plants,FRUIT,preFruit,hr fert,ripe,bonus,MATIC,FRUIT,MATIC,FRUIT,supply FRUIT'.split(',').map(x => pad12(x)).join(''));
const printState = () => console.log([Player.maticBalance, Player.plantBalance, Player.fruitBalance, Player.preFruitClaim, (Time - Player.fertilizedFrom) / 3600, harvestable()[0], harvestable()[1], Game.maticPotBalance, Game.fruitPotBalance, GamePool.maticBalance, GamePool.fruitBalance, Fruit.totalSupply].map(x => pad12((x).toFixed(2))).join(''));

function idle1h() {
  Time += 3600;
}
function idle1d() {
  Time += 3600 * 24;
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
  // can't use transfer() because different amounts, 2 recipients, one called 'Pot'
  Player.maticBalance -= amount;
  Game.maticPotBalance += tax;
  GamePool.maticBalance += _amount;
  console.log(`amt ${amount}, tax ${tax}, fOUT ${fruitOut}`);
  console.log(`fertilized ${fruitOut} preFruit. Ripens 100% in ${Game.fertilizePeriod/(24*3600)} days.`);
  Player.preFruitClaim += fruitOut; // XXX allows re-fertilize but resets timer
  Player.fertilizedFrom = Time;
  GamePool.fruitBalance += fruitOut; // it's only preFruit because not yet harvested, but is minted
  Fruit.totalSupply += fruitOut;
}
const fertilize10 = () => fertilize(10);

// returns [ripenedPreFruit, compoundedBonusUnmintedFruit]
function harvestable() {
  let amount;
  let bonus = 0;
  let secsSince = Time - Player.fertilizedFrom;
  let _period = Game.fertilizePeriod;
  if (secsSince < _period) {
    amount = secsSince / _period * Player.preFruitClaim;
  } else {
    bonus = Player.preFruitClaim * (Math.pow(1 + Game.bonusStake, (secsSince - _period) / _period) - 1);
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

function transfer(from, to, token, amount) {
  const _bal = token + 'Balance';
  if (amount > from[_bal]) { throw 'Insufficient funds of ' + token }
  from[_bal] -= amount;
  to[_bal] += amount;
}
function fruit2matic(fruitIn=1) {
  if (fruitIn > Player.fruitBalance) {
    fruitIn = Player.fruitBalance;
  }
  const maticOut = maticOutGivenFruitIn(fruitIn);
  console.log(`sold ${fruitIn} FRUIT for ${maticOut} MATIC`);
  transfer(Player, GamePool, 'fruit', fruitIn);
  transfer(GamePool, Player, 'matic', maticOut);
}
const _10fruit2matic = () => fruit2matic(10);
const nextSeedPrice = () => 2 + 0.1 * Game.seedsSold;

function fruit2plant() {
  if (Player.fruitBalance < nextSeedPrice()) {
    console.log('OOPS you need more fruit than ', nextSeedPrice());
    return;
  }
  Player.fruitBalance -= nextSeedPrice();
  // BURN a portion of the FRUIT and receive the rest as profit
  Fruit.totalSupply -= nextSeedPrice() * Game.seedBurnTake;
  Game.fruitPotBalance += nextSeedPrice() * (1 - Game.seedBurnTake);
  Player.plantBalance++;
  Game.seedsSold++;

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

