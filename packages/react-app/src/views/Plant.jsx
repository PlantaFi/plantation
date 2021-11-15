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

// const fruitTreePng = require('../lpc-fruit-trees/fruit-trees.png');
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

//export default
function TreeCardIdx({ idx, address, mainnetProvider, localProvider, tx, readContracts, writeContracts }) {
  const seedIdObj = useContractReader(readContracts, "Seed", "tokenOfOwnerByIndex", [address, idx]);

  return seedIdObj ? (
    <TreeCardInner
      seedId={seedIdObj.toNumber()}
      address={address}
      readContracts={readContracts}
      writeContracts={writeContracts}
      tx={tx}
    />
  ) : (
    ""
  );
}
function TreeCardInner({ seedId, address, mainnetProvider, localProvider, tx, readContracts, writeContracts }) {
  const treeStyle1 = {
    objectFit: "none",
    objectPosition: "0 -128px",
    width: 96,
    height: 128,
    position: "absolute",
    top: -48,
  };
  const treeStyle2 = {
    objectFit: "none",
    objectPosition: "0 -256px",
    width: 96,
    height: 128,
    position: "absolute",
    top: -48,
  };
  const treeStyle3 = {
    objectFit: "none",
    objectPosition: "0 -384px",
    width: 96,
    height: 128,
    position: "absolute",
    top: -48,
  };
  const treeStyleCocos = {
    objectFit: "none",
    objectPosition: "0 -1024px",
    width: 96,
    height: 128,
    position: "absolute",
    top: -48,
  };
  // returns (uint8 species, uint8 growthFactor, uint8 waterUseFactor, uint8 fertilizerUseFactor, uint8 fruitGrowthFactor)
  const treeTraits = useContractReader(readContracts, "Seed", "traits", [seedId]);
  const treeState = 4; //useContractReader(readContracts, "Seed", "state", [seedId]);
  console.log("state: ", treeState);
  const landId = useContractReader(readContracts, "Seed", "landId", [seedId]);
  const species = treeTraits ? treeTraits[0] : null;
  const speciesName = species === null ? "_ERROR_" : species2name(species);
  console.log("species: ", speciesName);
  const posX = SpeciesBabyImgOffsets[speciesName][0] * 96;
  const stageOffY = (treeState - 1) * 128; // only applicable if not SEED and DEAD
  const posY = SpeciesBabyImgOffsets[speciesName][1] * 128 - stageOffY;
  const deadStyle = {
    objectFit: "none",
    objectPosition: "0 -896px",
    width: 96,
    height: 128,
    position: "absolute",
    top: -64,
  };
  const treeStyle = treeState
    ? TreeStages[treeState] == "DEAD"
      ? deadStyle
      : {
          objectFit: "none",
          objectPosition: `-${posX}px -${posY}px`,
          width: 96,
          height: 128,
          position: "absolute",
          top: -64,
        }
    : {};
  const mass = useContractReader(readContracts, "Seed", "mass", [seedId]);
  const waterLevel = useContractReader(readContracts, "Seed", "waterLevel", [seedId]);
  const fruitMass = useContractReader(readContracts, "Seed", "fruitMass", [seedId]);
  const fruitCount = Math.floor((fruitMass ? fruitMass.toNumber() : 0) / FRUIT_PER_MASS);
  // getTreeStyle(species, treeState, fruitCount)
  return (
    <Col className="gutter-row" span={12}>
      <Card title={`${speciesName} @ Land ${landId}`} extra={<a href="#">More</a>} style={{ width: 500 }}>
        <div style={{ float: "left", width: 250 }}>
          <h3> #{seedId}</h3>
          <div style={{ marginTop: 50, padding: 0, position: "relative" }}>
            {!treeState || speciesName == "_ERROR_" ? "" : <img src={fruitTreePng} style={treeStyle1} />}
            <span className="gnd gnd-tilled-in-grass"></span>
          </div>
          <h3> Species: {speciesName}</h3>
        </div>
        <div style={{ float: "left", marginBottom: 25, width: 150 }}>
          <Button
            style={{ marginTop: 8 }}
            onClick={async () => {
              const result = tx(writeContracts.Seed.water(seedId), update => {
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
            Water! <img src={iconWater} width="20" />
          </Button>
          <Button
            style={{ marginTop: 8 }}
            onClick={async () => {
              const result = tx(
                writeContracts.Currency.approve(readContracts.Seed.address, utils.parseEther("12345")),
                update => {
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
                },
              );
              console.log("awaiting metamask/web3 confirm result...", result);
              console.log(await result);
            }}
          >
            Approve before fertilize !
          </Button>
          <Button
            style={{ marginTop: 8 }}
            onClick={async () => {
              const result = tx(writeContracts.Seed.fertilize(seedId), update => {
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
            Fertilize ! <img src={iconBeaker} width="20" />
          </Button>
          <Button
            style={{ marginTop: 8 }}
            onClick={async () => {
              const result = tx(writeContracts.Seed.harvest(seedId), update => {
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
            Harvest !
            <img src={iconScythe} width="20" />
          </Button>
          <Button
            style={{ marginTop: 8 }}
            onClick={async () => {
              const result = tx(writeContracts.Seed.burn(seedId), update => {
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
            Burn ! <img src={iconFire} width="20" />
          </Button>
        </div>
        <div style={{ clear: "both" }}>
          <Divider />
          <Row gutter={24}>
            <Col span={12}>
              <Statistic
                title="Location"
                value={landId === MAX_UINT16 ? "Unplanted" : `${landId % 32} / ${Math.floor(landId / 32)}`}
              />
            </Col>
            <Col span={12}>
              <Statistic title="Mass" value={mass ? mass.toNumber() : 0} />
            </Col>
            <Col span={12}>
              <Statistic title="Fruit" value={fruitCount} />
            </Col>
            <Col span={12}>
              <Statistic title="Water Level" value={waterLevel ? waterLevel.toString() : "N/A"} />
            </Col>
            <Col span={12}>
              <Statistic title="Growth Stage" value={TreeStages[treeState]} />
            </Col>
            <Col span={12}>
              <Statistic title="Factors" value={treeTraits ? treeTraits.join(", ") : ""} />
            </Col>
          </Row>
        </div>
      </Card>
    </Col>
  );
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

export function TreeUI({
  purpose,
  setPurposeEvents,
  address,
  mainnetProvider,
  localProvider,
  yourLocalBalance,
  price,
  tx,
  readContracts,
  writeContracts,
}) {
  const [newPurpose, setNewPurpose] = useState("loading...");

  const landSupply = useContractReader(readContracts, "Land", "totalSupply");
  const fruitSupply = useContractReader(readContracts, "Fruit", "totalSupply");
  const crcBalance = useContractReader(readContracts, "Currency", "balanceOf", [address]);
  const fruitBalance = useContractReader(readContracts, "Fruit", "balanceOf", [address]);
  const seedBalance = useContractReader(readContracts, "Seed", "balanceOf", [address]);
  const landBalance = useContractReader(readContracts, "Land", "balanceOf", [address]);
  /*
Show My Balances of: Seeds (Trees), Land Plots, Fruits
- balanceOf
For each Seed, show:
- DNA + show traits based on DNA
- species (from DNA)
- mass/stage - dead or not
- fruit mass/count
- last watered, current water level
- last fertilized
- don't show factors, let user figure them out
*/
  // iterate over all tokenOfOwnerByIndex from 0 to balanceOf
  // XXX quick hack - load max 5 trees
  const seedTokensOfOwnerByIndex = [...Array(Math.min(5, seedBalance ? seedBalance.toNumber() : 0)).keys()];

  const treeStyle1 = {
    objectFit: "none",
    objectPosition: "0 -128px",
    width: 96,
    height: 128,
    position: "absolute",
    top: -48,
  };
  const treeStyle2 = {
    objectFit: "none",
    objectPosition: "0 -256px",
    width: 96,
    height: 128,
    position: "absolute",
    top: -48,
  };
  const treeStyle3 = {
    objectFit: "none",
    objectPosition: "0 -384px",
    width: 96,
    height: 128,
    position: "absolute",
    top: -48,
  };
  const treeStyleCocos = {
    objectFit: "none",
    objectPosition: "0 -1024px",
    width: 96,
    height: 128,
    position: "absolute",
    top: -48,
  };
  return (
    <div>
      {/*
        ⚙️ Here is an example UI that displays and sets the purpose in your smart contract:
      */}
      <div style={{ border: "1px solid #cccccc", padding: 16, margin: "auto", marginTop: 64 }}>
        <h1>NFT Fruit Tree</h1>
        <Divider />
        <TreeBuilder
          address={address}
          mainnetProvider={mainnetProvider}
          localProvider={localProvider}
          yourLocalBalance={yourLocalBalance}
          tx={tx}
          writeContracts={writeContracts}
          readContracts={readContracts}
        />
        <Divider />
        <TreeMap2
          address={address}
          mainnetProvider={mainnetProvider}
          localProvider={localProvider}
          yourLocalBalance={yourLocalBalance}
          tx={tx}
          writeContracts={writeContracts}
          readContracts={readContracts}
        />
        <Divider />
        <LandRegistry
          address={address}
          mainnetProvider={mainnetProvider}
          localProvider={localProvider}
          yourLocalBalance={yourLocalBalance}
          tx={tx}
          writeContracts={writeContracts}
          readContracts={readContracts}
        />
        <Divider />

        {/* use utils.formatEther to display a BigNumber: */}
        <Collapse>

        </Collapse>
        <Divider />
        <Card>
          <h1>Your Trees</h1>

          <Row gutter={{ xs: 8, sm: 16, md: 24, lg: 32 }}>
            {seedTokensOfOwnerByIndex.map(idx => (
              <TreeCardIdx
                key={"treecard-" + idx}
                idx={idx}
                address={address}
                readContracts={readContracts}
                writeContracts={writeContracts}
                tx={tx}
              />
            ))}
          </Row>
        </Card>
      </div>
      <Divider />
      <div style={{ height: 100 }}> </div>
    </div>
  );
}

export default function Plant({
  purpose,
  setPurposeEvents,
  address,
  mainnetProvider,
  localProvider,
  yourLocalBalance,
  price,
  tx,
  readContracts,
  writeContracts,
}) {
  const { Meta } = Card;

  const species = 4;
  const treeState = 4;
  const fruitCount = 3;

  return (
    <div>
      {/*
      ⚙️ Here is an example UI that displays and sets the purpose in your smart contract:
    */}
      <div className="nes-container with-title">
        <p className="title">Menu</p>
        <p><span class="nes-text is-success">Bank &amp; Shop</span> | <span class="nes-text is-primary">Map</span> | <span class="nes-text is-disabled">Help</span> </p>
      </div>
      <div className='buchs-icon buchs-icon-left' style={{float: 'left'}}> </div>
      <div className='buchs-icon buchs-icon-right' style={{float: 'right'}}> </div>
      <div
        className='nes-container is-rounded'
        style={{
          backgroundColor: 'darkgray',
          padding: 16,
          width: 400,
          margin: "auto",
          marginTop: 20,
        }}
      >
        <div style={{ textAlign: "center" }}>
          <h2>Owner: </h2>

          <Row gutter={{ xs: 8, sm: 16, md: 24, lg: 32 }}>
            <Space align="center">
              <Col span={8}>
                <img width={200} height={200} src={fruitTreePng} style={getTreeStyle(species, treeState, fruitCount)} />
              </Col>
            </Space>
            <Col span={8} offset={5}>
              <h4>ID: </h4>
              <h4>ROW: </h4>
              <h4>Col:</h4>
              <h3>Healthy: </h3>
              <h3>weak: </h3>
              <h3>Dead: </h3>
              <h3>Ripe: </h3>
              <h3>Water: </h3>
              <h3>Fertile: </h3>
            </Col>
          </Row>
        </div>
      </div>
      {/*
      ⚙️ Here is an example UI that displays and sets the purpose in your smart contract:
    */}
      <div
        className='nes-container is-rounded'
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
            <button type="button" style={{margin:10}} class="nes-btn is-success">Water</button>
          </Col>
        </Row>
        <Row>
          <Col xs={{ span: 11, offset: 1 }} lg={{ span: 6, offset: 2 }}>
            <button type="button" style={{margin:10}} class="nes-btn is-error">Burn</button>
          </Col>
        </Row>
        <Row>
          <Col xs={{ span: 5, offset: 1 }} lg={{ span: 6, offset: 2 }}>
            <button type="button" style={{margin:10}} class="nes-btn is-warning">Prune</button>
          </Col>
        </Row>
        <Row>
          <Col xs={{ span: 5, offset: 1 }} lg={{ span: 6, offset: 2 }}>
            <button type="button" style={{margin:10}} class="nes-btn is-success">Harvest</button>
          </Col>
        </Row>
      </div>
      <div className="nes-container with-title">
        <p className="title">Footer</p>
        <p><span class="nes-text is-success">Bank &amp; Shop</span> | <span class="nes-text is-primary">Map</span> | <span class="nes-text is-disabled">Help</span> </p>
      </div>
    </div>
  );
}

// background: "#dd833b", border: "5px solid #e58f43" , borderRadius: '10px',
