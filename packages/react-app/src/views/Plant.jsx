import { SyncOutlined } from "@ant-design/icons";
import { utils } from "ethers";
import {
  Card,
  Col,
  Collapse,
  DatePicker,
  Divider,
  Input,
  List,
  Progress,
  Row,
  Slider,
  Spin,
  Statistic,
  Switch,
  Space,
} from "antd";
import React, { useState, useEffect } from "react";
import { Address, Balance } from "../components";

import fruitTreePng from "../lpc-fruit-trees/fruit-trees.png";
import iconWater from "../foundicons/water.png";
import iconFire from "../foundicons/fire.png";
import iconBeaker from "../foundicons/beaker.png";
import iconScythe from "../foundicons/scythe.png";

// stuff we might need from App.jsx
// import { Transactor } from "./helpers";
import {
  useContractReader,
} from "eth-hooks";
/*
import {
  useEventListener,
} from "eth-hooks/events/useEventListener";
import { useContractConfig } from "./hooks"
*/

const POLL_TIME = 5000;
const { Panel } = Collapse;

const fmtEth = utils.formatEther;
const floatEth = x => parseFloat(fmtEth(x));

const TreeStages = ["SEED", "SPROUT", "BABY", "TEENAGE", "ADULT", "DEAD"];
const MassPerStage = 50; // make same as in Seed.sol

function mass2stage(m) {
  if (false) {
    // TODO
    return "DEAD";
  }
  if (m < 100) {
    return "SEED";
  }
  return TreeStages[Math.min(4, Math.floor(m / MassPerStage))];
}
const SpeciesNames = ["Lingo", "Mican", "Nasu", "Abo", "Cheri", "Ume", "Nana", "Coco"];
function species2name(speciesIdx) {
  return SpeciesNames[speciesIdx];
}

const MAX_UINT16 = 65535;
const MAX_UINT256 = "115792089237316195423570985008687907853269984665640564039457584007913129639935";
const FRUIT_PER_MASS = 10;

function Getcoordination({ coordination }) {
  // console.log("coordination " + coordination);
  const x = Math.floor(coordination % 32).toString();
  const y = Math.floor(coordination / 32).toString();
  return "(" + y + "," + x + ")";
}

const SpeciesBabyImgOffsets = {
  // [x * 96, y * 128]
  Lingo: [0, 3],
  Mican: [1, 3],
  Nasu: [4, 3],
  Abo: [6, 3],
  Cheri: [3, 3],
  Ume: [7, 3],
  Nana: [1, 11],
  Coco: [0, 11],
  _ERROR_: [0, 0],
};
const FruitRow1 = 16; // row of apple tree
// points to smallest fruit, first color
const SpeciesFruitImgOffsets = {
  Lingo: [0, 2 + FruitRow1],
  Mican: [5, 2 + FruitRow1],
  Nasu: [3, 5 + FruitRow1],
  Abo: [7, 5 + FruitRow1],
  Cheri: [2, 5 + FruitRow1],
  Ume: [8, 5 + FruitRow1],
  Nana: [3, 8 + FruitRow1],
  Coco: [2, 8 + FruitRow1],
  _ERROR_: [0, 0],
};
function calcTreePos(species, treeState, fruitCount) {
  // XXX temp
  // XXX quick hack, all dead trees look the same
  if (TreeStages[treeState] == "DEAD") {
    return "0 -896px";
  }
  if (TreeStages[treeState] == "ADULT" && fruitCount > 0) {
    const offs = SpeciesFruitImgOffsets[species2name(species)];
    const fruitOff = fruitCount > 20 ? 2 : Math.floor(fruitCount / 10);
    return `-${offs[0] * 96}px -${(offs[1] - fruitOff) * 128}px`;
  }
  const posX = SpeciesBabyImgOffsets[species2name(species)][0] * 96;
  const stageOffY = (treeState - 1) * 128; // only applicable if not SEED and DEAD
  const posY = SpeciesBabyImgOffsets[species2name(species)][1] * 128 - stageOffY;
  return `-${posX}px -${posY}px`;
}
const getTreeStyle = (species, treeState, fruitCount) => {
  return {
    objectFit: "none",
    objectPosition: calcTreePos(species, treeState, fruitCount),
    width: 96,
    height: 128,
    /*    position: "absolute",
    top: -64, */
    marginTop: 32,
    zoom: "150%",
  };
};

function parseGenes(dnaStr) {
  const OFFSETS = {
    SPECIES: 0 * 3,
    GROWTH: 1 * 3,
    MATURE: 2 * 3, // TODO how soon it starts fruiting
    ABSORB: 3 * 3,
    FERTILE: 4 * 3, // TODO affects potential fruit bounty
    FRUIT: 5 * 3,
    LONG: 6 * 3,
    WEAK: 7 * 3,
    DIE: 8 * 3,
    COLOR: 9 * 3, // special case of 5 bits
  };
  const genes = {};
  for (let key in OFFSETS) {
    genes[key.toLowerCase()] = parseInt(dnaStr.slice(OFFSETS[key], OFFSETS[key] + (key == "COLOR" ? 5 : 3)), 2);
  }
  return genes;
}

function CountTreeStage({ sum }) {
  //SEED
  if (sum < 1) {
    return 0;
    //SPROUT
  } else if (sum < 10) {
    return 1;
    //BABY
  } else if (sum < 20) {
    return 2;
    //TEENAGE
  } else if (sum < 30) {
    return 3;
    //ADULT
  } else {
    return 4;
  }
}

function PlantImage({ species, treeState, fruit }) {
  return (
    <div>
      <img src={fruitTreePng} style={getTreeStyle(species, treeState, fruit)} />
    </div>
  );
}

function DisplayPlantImage({ plantDNA, isAlive, lastNormalBranch, lastWeakBranch, lastDeadBranch, lastDeadPruned }) {
  const plantGene = parseGenes(plantDNA.toString(2).padStart(32, "0"));

  const sum =
    Number(utils.formatEther(lastNormalBranch)) +
    Number(utils.formatEther(lastWeakBranch)) +
    Number(utils.formatEther(lastDeadBranch)) +
    Number(utils.formatEther(lastDeadPruned));
  let treeState = CountTreeStage({ sum });
  if (!isAlive) {
    treeState = 5;
  }
  //console.log("treeState " + treeState);
  //console.log("sum " + sum);

  return (
    <div>
      <PlantImage species={plantGene.species} treeState={treeState} fruit={plantGene.fruit} />
    </div>
  );
}

function GetApproveMatics({ address, plantId, readContracts, plantAddress, writeContracts, tx, isAlive }) {
  const maticAllowance = useContractReader(readContracts, "FMatic", "allowance", [address, plantAddress], POLL_TIME);
  return (
    <div style={{ display: "inline-block" }}>
      {maticAllowance > 0 ? (
        <button
          type="button"
          style={{ margin: 10 }}
          className="nes-btn is-success"
          disabled={!isAlive}
          onClick={async () => {
            const result = tx(writeContracts.Plant.fertilize(plantId), update => {
              console.log("📡 Transaction Update:", update);
              if (update && (update.status === "confirmed" || update.status === 1)) {
                console.log(" 🍾 Transaction " + update.hash + " finished!");
                console.log(
                  " ⛽️ " +
                    update.gasUsed +
                    "/" +
                    (update.gasLimit || update.gas) +
                    " @ " +
                    parseFloat(update.gasPrice) / 1000000000 +
                    " gwei",
                );
              }
            });
            console.log("awaiting metamask/web3 confirm result...", result);
            console.log(await result);
          }}
        >
          Fertilize
        </button>
      ) : (
        <button
          type="button"
          style={{ margin: 10 }}
          className="nes-btn is-success"
          disabled={!isAlive}
          onClick={async () => {
            const result = tx(writeContracts.FMatic.approve(plantAddress, utils.parseEther("1000")), update => {
              console.log("📡 Transaction Update:", update);
              if (update && (update.status === "confirmed" || update.status === 1)) {
                console.log(" 🍾 Transaction " + update.hash + " finished!");
                console.log(
                  " ⛽️ " +
                    update.gasUsed +
                    "/" +
                    (update.gasLimit || update.gas) +
                    " @ " +
                    parseFloat(update.gasPrice) / 1000000000 +
                    " gwei",
                );
              }
            });
            console.log("awaiting metamask/web3 confirm result...", result);
            console.log(await result);
          }}
        >
          Approve Fertilize
        </button>
      )}
    </div>
  );
}

function CountWaterLevel({ state }) {
  // lastWaterLevel
  // lastWaterTicks
  // lastWaterUseRate
  // lastWateredAt
  let nowish = +new Date() / 1000;
  //const _last = state.lastWateredAt.toNumber();
  console.log(state);
  const initWateredAt = state.lastWateredAt.toNumber();
  const _last = state.lastUpdatedAt.toNumber();
  if (nowish < _last) {
    nowish = _last;
  }
  const hoursElapsed = (nowish - _last) / 3600;
  const lastWaterTicks = floatEth(state.lastWaterTicks);
  const ticksElapsed = (nowish - initWateredAt) / 36; // TODO 36 to 3600
  const lastWaterLevel = utils.formatEther(state.lastWaterLevel);
  const lastWaterUseRate = utils.formatEther(state.lastWaterUseRate);
  const newWaterLevel = lastWaterLevel - hoursElapsed * lastWaterUseRate;
  console.log(`LWL: ${lastWaterLevel} / Ticks: ${ticksElapsed} + ${lastWaterTicks}`);
  return (
    <div>
      Water Level: {lastWaterLevel}
      <progress
        className="nes-progress is-primary"
        value={(100.0 * lastWaterTicks) / (lastWaterTicks + ticksElapsed)}
        max="100"
      ></progress>
      {lastWaterTicks == 0 ? <span className="nes-text is-error">DRY!</span> : ""}
    </div>
  );
}

function DisplayBurn({ isAlive, tx, writeContracts, landTokenId }) {
  return (
    <div>
      {isAlive ? (
        <div>
          <h4 style={{ color: "lightgreen" }}>This Plant is Alive!</h4>
        </div>
      ) : (
        <div>
          <span>This plant is dead!</span>
          <button
            type="button"
            style={{ margin: 10 }}
            className="nes-btn is-error"
            onClick={async () => {
              console.log(`burn ${landTokenId}`);
              const result = tx(writeContracts.Land.handleBurn(landTokenId), update => {
                console.log("📡 Transaction Update:", update);
                if (update && (update.status === "confirmed" || update.status === 1)) {
                  console.log(" 🍾 Transaction " + update.hash + " finished!");
                  console.log(
                    " ⛽️ " +
                      update.gasUsed +
                      "/" +
                      (update.gasLimit || update.gas) +
                      " @ " +
                      parseFloat(update.gasPrice) / 1000000000 +
                      " gwei",
                  );
                }
              });
              console.log("awaiting metamask/web3 confirm result...", result);
              console.log(await result);
            }}
          >
            Burn!
          </button>
        </div>
      )}
    </div>
  );
}

function _extrapolateBranches(pstate) {
  const max = Math.max;
  const min = Math.min;

  const tickRate = 36; // TODO 3600

  function parseGenes(dnaStr) {
    const OFFSETS = {
      SPECIES: 0 * 3,
      GROWTH: 1 * 3,
      MATURE: 2 * 3, // TODO how soon it starts fruiting
      ABSORB: 3 * 3,
      FERTILE: 4 * 3, // TODO affects potential fruit bounty
      FRUIT: 5 * 3,
      LONG: 6 * 3,
      WEAK: 7 * 3,
      DIE: 8 * 3,
      COLOR: 9 * 3, // special case of 5 bits
    };
    const genes = {};
    for (let key in OFFSETS) {
      genes[key.toLowerCase()] = parseInt(dnaStr.slice(OFFSETS[key], OFFSETS[key] + (key == "COLOR" ? 5 : 3)), 2);
    }
    return genes;
  }

  const Genes = parseGenes(pstate.dna.toString(2));

  const factor = name => 1 + Genes[name] * 0.04; // XXX assumes 4% effect per unit for each gene
  const landSpeciesMatchFactor = () => 1 - 0.04 * max(5, Math.abs(factor("species") - pstate.landSpecies));

  const MAX_ABSORB = 500;
  const FRAILTY_THRESH = 5000;

  const branchLinearRate = 1.0; // base rate per hour
  const wetWeakenRate = 0.05;
  const dryWeakenRate = 0.2;
  const strengthenRate = 0.1;
  const deathRate = 0.1;

  // redefine 'time' to mean seconds of specified 1 hour spent in wet/dry state
  const wetTime = tbox => max(0, min(tbox.h2oTil, tbox.t1) - max(tbox.h2oFrom, tbox.t0)) / tickRate;
  const dryTime = tbox => (max(tbox.h2oTil, tbox.t1) - max(tbox.h2oTil, tbox.t0)) / tickRate;
  const anyTime = tbox => (tbox.t1 - max(tbox.h2oFrom, tbox.t0)) / tickRate;

  // TimeBox = { t0, t1, h2oFrom, h2oTil }
  const wetGrowth = (tbox, norm) => wetTime(tbox) * factor("growth") * (branchLinearRate + Math.sqrt(norm));
  const wetWeaken = (tbox, norm) => ((wetTime(tbox) * factor("weak")) / 2) * wetWeakenRate * norm;
  const dryWeaken = (tbox, norm) => ((dryTime(tbox) * factor("weak")) / 2) * dryWeakenRate * norm;
  const wetStrengthen = (tbox, weak) => wetTime(tbox) * strengthenRate * weak;
  const normBranchGrowth = (tbox, norm, weak, frailty) =>
    wetGrowth(tbox, norm) -
    frailty * wetWeaken(tbox, norm) +
    wetStrengthen(tbox, weak) -
    frailty * dryWeaken(tbox, norm);
  const weakBranchGrowth = (tbox, norm, weak, frailty) =>
    frailty * wetWeaken(tbox, norm) -
    wetStrengthen(tbox, weak) +
    frailty * dryWeaken(tbox, norm) -
    deadBranchGrowth(tbox, weak);
  const deadBranchGrowth = (tbox, weak) => factor("die") * deathRate * anyTime(tbox) * weak;

  let [norm, weak, dead] = [
    floatEth(pstate.lastNormalBranch),
    floatEth(pstate.lastWeakBranch),
    floatEth(pstate.lastDeadBranch),
  ];
  //const h2oFrom = pstate.lastWateredAt;
  const h2oFrom = pstate.lastUpdatedAt;
  const h2oTil = h2oFrom + (floatEth(pstate.lastWaterLevel) / floatEth(pstate.lastWaterUseRate)) * 36;
  let tbox = { t0: h2oFrom, t1: null, h2oFrom, h2oTil: h2oTil };
  let snow = +new Date() / 1000;
  const frailty = 1; // TODO
  while (tbox.t0 < snow) {
    tbox.t1 = min(snow, tbox.t0 + tickRate);
    let normDelta = normBranchGrowth(tbox, norm, weak, frailty);
    let weakDelta = weakBranchGrowth(tbox, norm, weak, frailty);
    let deadDelta = deadBranchGrowth(tbox, weak);
    norm += normDelta;
    weak += weakDelta;
    dead += deadDelta;
    tbox.t0 += tickRate;
  }
  return [norm, weak, dead];
}

function DisplayBranches({ state, lastDeadPruned }) {
  // lastDeadBranch
  // dna
  // landBurns
  // landSpecies
  // lastDeadPruned
  // lastNormalBranch
  // lastWeakBranch
  // lastFrailty
  // lastUpdatedAt
  // isAlive
  //const [norm, weak, dead] = _extrapolateBranches(state);
  let [norm, weak, dead] = [
    floatEth(state.lastNormalBranch),
    floatEth(state.lastWeakBranch),
    floatEth(state.lastDeadBranch),
  ];
  const sum = norm + weak + dead;
  return (
    <div>
      <div>
        {norm ? <div style={{width: 100*norm/sum + '%', display: 'inline-block', paddingRight: 4}}>
          <progress className="nes-progress is-success" style={{}} value="100" max="100"></progress>
        </div> : ''}
        {weak ? <div style={{width: 100*weak/sum + '%', display: 'inline-block', paddingRight: 4}}>
          <progress className="nes-progress is-warning" style={{}} value="100" max="100"></progress>
        </div> : ''}
        {dead ? <div style={{width: 100*dead/sum + '%', display: 'inline-block'}}>
          <progress className="nes-progress is-error" style={{ }} value="100" max="100"></progress>
        </div> : ''}
      </div>
      <div style={{ color: "black" }}>Healthy branches: {norm}</div>
      <div style={{ color: "black" }}>Weak: {weak}</div>
      <div style={{ color: "black" }}>Dead: {dead}</div>
      <span style={{ color: "black" }}>Pruned Branches: {utils.formatEther(lastDeadPruned)}</span>
      <progress className="nes-progress is-pattern" value={utils.formatEther(lastDeadPruned)} max="100"></progress>
    </div>
  );
}

function DisplayFruits({ flowers, lastFertilizedAt }) {
  const _last = lastFertilizedAt.toNumber();
  const ripenTime = 36 * 50; // GAME_TICKS*RIPEN_TICKS
  let ripeAmount = floatEth(flowers);
  let nowish = +new Date() / 1000;
  nowish = nowish < _last ? _last : nowish; // if now in past
  if (nowish < _last + ripenTime) {
    ripeAmount = (ripeAmount * (nowish - _last)) / ripenTime;
  }
  const pct = floatEth(flowers) > 0 ? (100 * ripeAmount) / floatEth(flowers) : 0;
  return (
    <div>
      <span style={{ color: "black" }}>
        Ripe / Fruit: {ripeAmount} / {floatEth(flowers)}
      </span>
      <progress className="nes-progress " value={pct} max="100"></progress>
    </div>
  );
}

export default function Plant({ address, plantId, readContracts, writeContracts, tx }) {
  const plantState = useContractReader(readContracts, "Plant", "state", [plantId], 2000);

  const [secs, setSecs] = useState(0);
  useEffect(() => {
    console.log("New interval set");
    const interval = setInterval(() => {
      setSecs(secs => secs + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div>
      {/*
      ⚙️
    */}

      <div className="nes-container is-rounded is-dark with-title">
        <p className="title">Plant</p>
        <div style={{ width: "50%", display: "inline-block", verticalAlign: "top" }}>
          {" "}
          <div style={{ textAlign: "center" }}>
            <div style={{ backgroundColor: "white", padding: 32, maxWidth: 320, margin: "auto" }}>
              <div className="nes-container is-rounded with-title">
                <p className="title" style={{ color: "black" }}>
                  Species
                </p>
                {plantState ? (
                  <DisplayPlantImage
                    plantDNA={plantState[0]}
                    isAlive={plantState[1]}
                    lastNormalBranch={plantState[3]._hex}
                    lastWeakBranch={plantState[4]._hex}
                    lastDeadBranch={plantState[5]._hex}
                    lastDeadPruned={plantState[6]._hex}
                  />
                ) : (
                  "loading..."
                )}
              </div>
            </div>
          </div>
          <div style={{ margin: "50px 0" }}>
            <div style={{ position: "relative", top: -40 }}>
              <div className="nes-container is-rounded is-dark"> ID: #{plantId.toString().padStart(4, "0")} </div>

              <div className="nes-container is-rounded is-dark"> DNA: {plantState && plantState.dna.toString(16)} </div>

              <div className="nes-container is-rounded is-dark">
                <span>
                  Landowner: <Address address={address} /*ensProvider={mainnetProvider}*/ fontSize={16} />
                </span>
              </div>

              <div className="nes-container is-rounded is-dark">
                <span>
                  Coordinates: {plantState ? <Getcoordination coordination={plantState[12]} /> : "loading..."}
                </span>
              </div>

              <div className="nes-container is-rounded is-dark" style={{}}>
                {plantState ? (
                  <DisplayBurn
                    isAlive={plantState[1]}
                    tx={tx}
                    writeContracts={writeContracts}
                    landTokenId={plantState[12]}
                  />
                ) : (
                  "loading"
                )}
              </div>
            </div>
          </div>
        </div>
        <div style={{ display: "inline-block", width: "50%" }}>
          <div
            className="nes-container is-rounded notis-dark"
            style={{ margin: "10px", width: "97%", textAlign: "left", backgroundColor: "white" }}
          >
            <span style={{ color: "black" }}>{plantState ? <CountWaterLevel state={plantState} /> : "loading.."}</span>
            {plantState ? (
              <button
                type="button"
                style={{ margin: 10 }}
                disabled={!plantState[1]}
                className="nes-btn is-primary"
                onClick={async () => {
                  const result = tx(writeContracts.Plant.water(plantId), update => {
                    console.log("📡 Transaction Update:", update);
                    if (update && (update.status === "confirmed" || update.status === 1)) {
                      console.log(" 🍾 Transaction " + update.hash + " finished!");
                      console.log(
                        " ⛽️ " +
                          update.gasUsed +
                          "/" +
                          (update.gasLimit || update.gas) +
                          " @ " +
                          parseFloat(update.gasPrice) / 1000000000 +
                          " gwei",
                      );
                    }
                  });
                  console.log("awaiting metamask/web3 confirm result...", result);
                  console.log(await result);
                }}
              >
                Water
              </button>
            ) : (
              ""
            )}
          </div>
          <div
            className="nes-container is-rounded notis-dark"
            style={{ margin: "10px", width: "97%", textAlign: "left", backgroundColor: "white" }}
          >
            {plantState ? (
              <DisplayFruits flowers={plantState[15]} lastFertilizedAt={plantState.lastFertilizedAt} />
            ) : (
              "loading..."
            )}

            {plantState ? (
              <GetApproveMatics
                address={address}
                plantId={plantId}
                readContracts={readContracts}
                plantAddress={readContracts.Plant.address}
                writeContracts={writeContracts}
                tx={tx}
                isAlive={plantState[1]}
              />
            ) : (
              ""
            )}
            {plantState ? (
              <button
                type="button"
                style={{ margin: 10 }}
                disabled={!plantState[1]}
                className="nes-btn is-success"
                onClick={async () => {
                  const result = tx(writeContracts.Plant.harvest(plantId), update => {
                    console.log("📡 Transaction Update:", update);
                    if (update && (update.status === "confirmed" || update.status === 1)) {
                      console.log(" 🍾 Transaction " + update.hash + " finished!");
                      console.log(
                        " ⛽️ " +
                          update.gasUsed +
                          "/" +
                          (update.gasLimit || update.gas) +
                          " @ " +
                          parseFloat(update.gasPrice) / 1000000000 +
                          " gwei",
                      );
                    }
                  });
                  console.log("awaiting metamask/web3 confirm result...", result);
                  console.log(await result);
                }}
              >
                Harvest
              </button>
            ) : (
              ""
            )}
          </div>
          <div
            className="nes-container is-rounded notis-dark"
            style={{ margin: "10px", width: "97%", textAlign: "left", backgroundColor: "white" }}
          >
            {plantState ? (
              <div>
                <DisplayBranches state={plantState} lastDeadPruned={plantState[6]._hex} />
                <button
                  type="button"
                  style={{ margin: 10 }}
                  disabled={!plantState[1]}
                  className="nes-btn is-warning"
                  onClick={async () => {
                    const result = tx(writeContracts.Plant.prune(plantId), update => {
                      console.log("📡 Transaction Update:", update);
                      if (update && (update.status === "confirmed" || update.status === 1)) {
                        console.log(" 🍾 Transaction " + update.hash + " finished!");
                        console.log(
                          " ⛽️ " +
                            update.gasUsed +
                            "/" +
                            (update.gasLimit || update.gas) +
                            " @ " +
                            parseFloat(update.gasPrice) / 1000000000 +
                            " gwei",
                        );
                      }
                    });
                    console.log("awaiting metamask/web3 confirm result...", result);
                    console.log(await result);
                  }}
                >
                  Prune
                </button>
              </div>
            ) : (
              "loading..."
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
