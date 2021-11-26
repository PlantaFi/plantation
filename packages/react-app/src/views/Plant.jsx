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
import React, { useState } from "react";
import { Address, Balance } from "../components";

import fruitTreePng from "../lpc-fruit-trees/fruit-trees.png";
import iconWater from "../foundicons/water.png";
import iconFire from "../foundicons/fire.png";
import iconBeaker from "../foundicons/beaker.png";
import iconScythe from "../foundicons/scythe.png";

// stuff we might need from App.jsx
// import { Transactor } from "./helpers";
import {
  useBalance,
  useContractLoader,
  useContractReader,
  useGasPrice,
  useOnBlock,
  useUserProviderAndSigner,
} from "eth-hooks";
/*
import {
  useEventListener,
} from "eth-hooks/events/useEventListener";
import { useContractConfig } from "./hooks"
*/

const { Panel } = Collapse;

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
  console.log("coordination " + coordination);
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
  console.log(species);
  return {
    objectFit: "none",
    objectPosition: calcTreePos(species, treeState, fruitCount),
    width: 96,
    height: 128,
    position: "absolute",
    top: -64,
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
  console.log("sum1 " + sum);
  //SEED
  if (sum < 100) {
    return 0;
    //SPROUT
  } else if (sum < 1000) {
    return 1;
    //BABY
  } else if (sum < 2000) {
    return 2;
    //TEENAGE
  } else if (sum < 3000) {
    return 3;
    //ADULT
  } else {
    return 4;
  }
}

function PlantImage({ species, treeState, fruit }) {
  return (
    <div>
      <img width={200} height={200} src={fruitTreePng} style={getTreeStyle(species, treeState, fruit)} />
    </div>
  );
}

function GetApproveMatics({ address, plantId, readContracts, plantAddress, writeContracts, tx }) {
  const maticAllowance = useContractReader(readContracts, "FMatic", "allowance", [address, plantAddress]);
  return (
    <div>
      {maticAllowance ? (
        <button
          type="button"
          style={{ margin: 10 }}
          class="nes-btn is-success"
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
          class="nes-btn is-success"
          onClick={async () => {
            const result = tx(writeContracts.FMatic.approve(plantId), update => {
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

function PlantDetails({
  plantId,
  isAlive,
  plantDNA,
  geo,
  waterLevel,
  lastNormalBranch,
  lastWeakBranch,
  lastDeadBranch,
  lastDeadPruned,
}) {
  const plantGene = parseGenes(plantDNA.toString(2).padStart(32, "0"));
  const sum =
    Number(utils.formatEther(lastNormalBranch)) +
    Number(utils.formatEther(lastWeakBranch)) +
    Number(utils.formatEther(lastDeadBranch)) +
    Number(utils.formatEther(lastDeadPruned));
  const treeState = CountTreeStage({ sum });
  console.log("sum " + sum);
  console.log("treeState " + treeState);

  // console.log("species " + plantGene.species);
  // console.log("growth " + plantGene.growth);
  // console.log("mature " + plantGene.mature);
  // console.log("absorb " + plantGene.absorb);
  // console.log("fertile " + plantGene.fertile);
  // console.log("fruit " + plantGene.fruit);
  // console.log("long " + plantGene.long);
  // console.log("weak " + plantGene.weak);
  // console.log("die " + plantGene.die);
  // console.log("color " + plantGene.color);

  return (
    <div>
      {plantGene ? (
        <div>
          <Row gutter={{ xs: 8, sm: 16, md: 24, lg: 32 }}>
            <Space align="center">
              <Col span={8}>
                <PlantImage species={plantGene.species} treeState={treeState} fruit={plantGene.fruit} />
              </Col>
            </Space>
            <Col span={8} offset={5}>
              <h4>ID:{plantId}</h4>
              <h4>
                Coordination:
                <Getcoordination coordination={geo} />
              </h4>
              <h3>Healthy: </h3>
              <h3>weak:{plantGene.weak}</h3>
              <h3>{isAlive ? "Alive" : "Dead!"}</h3>
              <h3>Ripe: </h3>
              <h3>Water:</h3> <h6>{utils.formatEther(waterLevel)}</h6>
              <h3>Fertile:{plantGene.fertile}</h3>
            </Col>
          </Row>
        </div>
      ) : (
        ""
      )}
    </div>
  );
}
// <h3>{plantGene.die == 0 ? "Alive" : "Dead!"}</h3>

export default function Plant({ address, plantId, readContracts, writeContracts, tx }) {
  const [loadingunplanted, setLoadingunplanted] = useState(true);

  const { Meta } = Card;

  const plantState = useContractReader(readContracts, "Plant", "state", [plantId]);
  console.log(" plantState " + plantState);
  console.log(utils.parseEther("1000"));

  return (
    <div>
      {/*
      ⚙️
    */}

      <div
        className="nes-container is-rounded"
        style={{
          backgroundColor: "darkgray",
          padding: 16,
          width: 400,
          margin: "auto",
          marginTop: 20,
        }}
      >
        <div style={{ textAlign: "center" }}>
          <h2>Owner:</h2>
          {plantState ? (
            <PlantDetails
              plantId={plantId}
              plantDNA={plantState[0]}
              isAlive={plantState[1]}
              geo={plantState[12]}
              waterLevel={plantState[7]}
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
      {/*
      ⚙️
    */}
      <div
        className="nes-container is-rounded"
        style={{
          padding: 16,
          width: 400,
          margin: "auto",
          marginTop: 64,
          marginBottom: 128,
          backgroundColor: "#3f9822",
        }}
      >
        <Row>
          <Col xs={{ span: 5, offset: 1 }} lg={{ span: 6, offset: 2 }}>
            <button
              type="button"
              style={{ margin: 10 }}
              class="nes-btn is-success"
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
          </Col>
        </Row>
        <Row>
          <Col xs={{ span: 11, offset: 1 }} lg={{ span: 6, offset: 2 }}>
            <button
              type="button"
              style={{ margin: 10 }}
              class="nes-btn is-error"
              onClick={async () => {
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
              Burn
            </button>
          </Col>
        </Row>
        <Row>
          <Col xs={{ span: 5, offset: 1 }} lg={{ span: 6, offset: 2 }}>
            <button
              type="button"
              style={{ margin: 10 }}
              class="nes-btn is-warning"
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
          </Col>
        </Row>
        <Row>
          <Col xs={{ span: 5, offset: 1 }} lg={{ span: 6, offset: 2 }}>
            {plantState ? (
              <GetApproveMatics
                address={address}
                plantId={plantId}
                readContracts={readContracts}
                plantAddress={readContracts.Plant.address}
                writeContracts={writeContracts}
                tx={tx}
              />
            ) : (
              ""
            )}
          </Col>
        </Row>
        <Row>
          <Col xs={{ span: 5, offset: 1 }} lg={{ span: 6, offset: 2 }}>
            <button
              type="button"
              style={{ margin: 10 }}
              class="nes-btn is-success"
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
          </Col>
        </Row>
      </div>
    </div>
  );
}
