const menu = require('console-menu');
const process = require('process');

async function next() {
    let item = await menu([
        { hotkey: 'i', title: 'Idle (pass 1 day)', cb: idle1d, selected: true },
        { hotkey: 's', title: 'Fertilize/Stake 1 MATIC', cb: fertilize },
        { hotkey: 'S', title: 'Fertilize/Stake 10 MATIC', cb: fertilize10 },
        { hotkey: 'h', title: 'Harvest', cb: harvest },
        { hotkey: 'p', title: 'Exchange FRUIT for PLANT seed', cb: fruit2plant },
        { hotkey: 'm', title: 'Exchange FRUIT for MATIC', cb: fruit2matic },
        { separator: true },
        { hotkey: 'q', title: 'Quit', cb: process.exit },
    ])
    if (item && item.cb) {
        item.cb();
        //printTree() //console.log('You chose: ' + JSON.stringify(item));
        console.log(Player);
        console.log(Game);
    }
}

const Player = {};
const Game = {};

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
  Game.bonusStake = 0.05; // compounds after 100% ripe
  Game.maticPoolBalance = 0;
  Game.maticPotBalance = 0; // profit
  Game.fruitPotBalance = 0;
  Game.fruitBalance = 0; // fertilize -> mints and stakes this future fruit
  Game.fruitTotalSupply = 0; // theoretical price is totalSupply / maticPoolBalance
  Game.fertilizeTaxRate = 0.05;
  Game.harvestTaxRate = 0.02;
}

function initFruitPrice() {
  Game.maticPoolBalance = 100;
  Game.fruitBalance = 100;
  Game.fruitTotalSupply = 100; // should it go into player's account? no
}

function idle1d() {
  Player.sinceFertilize++;
}

// x*y=k -> (x+maticIn)*(y-fruitOut) = x*y -> fruitOut = -1*(x*y / (x+maticIn) - y) = y-x*y/(x+mIn)
const fruitOutGivenMaticIn = (maticIn) => Game.fruitBalance - Game.maticBalance * Game.fruitBalance / (Game.maticBalance + maticIn);

// TODO amount should be in (pre)FRUIT, not MATIC.. so cost will fluctuate
function fertilize(amount=1) {
  let tax = amount * Game.fertilizeTaxRate;
  let _amount = amount - tax;
  Player.maticBalance -= amount;
  Game.maticPotBalance += tax;
  Game.maticBalance += _amount;
  let fruitOut = fruitOutGivenMaticIn(_amount);
  Player.preFruitClaim += fruitOut; // XXX allows re-fertilize but resets timer
  Player.sinceFertilize = 0;
  Game.fruitBalance += fruitOut; // it's only preFruit because not yet harvested, but is minted
  Game.fruitTotalSupply += fruitOut;
}
const fertilize10 = () => fertilize(10);

function harvest() {
  let amount;
  let _since = Player.sinceFertilize;
  let _period = Game.fertilizePeriod;
  if (_since < _period) {
    amount = _since / _period * Player.preFruitClaim;
  } else if (_since == _period) {
    amount = Player.preFruitClaim;
  } else {
    let compoundedBonus = Player.preFruitClaim * Math.pow(1 + Game.bonusStake, _since - _period) - Player.preFruitClaim;

    // "mint" extra that didn't exist, must be minted into supply, may be implications for minting long after debt had increased
    Game.fruitTotalSupply += compoundedBonus;
    Game.fruitBalance += compoundedBonus;

    amount = Player.preFruitClaim + compoundedBonus;
  }
  let tax = amount * Game.harvestTaxRate;
  Game.fruitPotBalance += tax;

  // TODO transferFrom(amount, 'fruit', Game, Player) = from['fruit' + 'Balance'] -= amount, to['fruit' + 'Balance'] += amount;
  Player.fruitBalance += amount - tax;
  Game.fruitBalance -= amount;

}

function fruit2matic() {
  // get exchange rate
  State.playerPlantBalance++;
}

function fruit2plant() {
}

async function main() {
  initState();
  initFruitPrice();
  while (1) {
    await next();
  }
}
main()

