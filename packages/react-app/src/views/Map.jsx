import React, { useState } from "react";
import { Row, Col, Button, Divider, Space } from "antd";
import { UpOutlined, DownOutlined, LeftOutlined, RightOutlined } from "@ant-design/icons";
import { LandDetails, Plant } from "./";
import { BrowserRouter, Link, Route, Switch } from "react-router-dom";

import {
  useBalance,
  useContractLoader,
  useContractReader,
  useGasPrice,
  useOnBlock,
  useUserProviderAndSigner,
} from "eth-hooks";
import backSand from "../assets/sand.png";
import backGrass from "../assets/grass.png";
import backTree from "../assets/tree.png";

let plantId;
let ownerAddress;

function maxArray({ distance }) {
  return Math.pow(distance + distance + 1, 2);
}

function countLandTokenId(x, y) {
  return x * 32 + y;
}

function MapDesign({
  distanceInfo,
  distance,
  readContracts,
  writeContracts,
  setPlantId,
  setLandTokenId,
  setOwnerAddress,
}) {
  let maxArrayLength = maxArray({ distance });
  if (distance == 16) {
    maxArrayLength = 1024;
  }

  const colNum = distance + 1 + distance;
  const cols = [];

  for (let i = 0; i < maxArrayLength; i++) {
    let backgroundImg = backSand;

    if (distanceInfo[2][i]) {
      backgroundImg = backGrass;
    }

    if (distanceInfo[3][i]) {
      backgroundImg = backTree;
    }

    cols.push(
      <Col key={i.toString()} span={24 / colNum}>
        <div
          style={{
            border: "1px solid #000000",
            borderRadius: "1px",
            width: 45,
            height: 46,
            backgroundColor: "white",
            display: "inline-flex",
            alignItems: "center",
          }}
        >
          <Link
            onClick={() => {
              console.log("landId " + distanceInfo[0][i]);
              setLandTokenId(distanceInfo[0][i]);
              setPlantId(distanceInfo[4][i].BigNumber);
              setOwnerAddress(distanceInfo[1][i]);
            }}
            to="/landdetails/"
          >
            <img
              src={backgroundImg}
              style={{
                objectFit: "fill",
                width: 45,
                height: 45,
              }}
            />
          </Link>
        </div>
      </Col>,
    );
  }
  //distanceInfo[4][i]
  //
  return (
    <Row type="flex" justify="center" align="middle">
      {cols}
    </Row>
  );
}

export default function Map({ address, tx, readContracts, writeContracts }) {
  const [currentx, setCurrentx] = useState(16);
  const [currenty, setCurrenty] = useState(16);
  const [plantId, setPlantId] = useState();
  const [landTokenId, setLandTokenId] = useState();
  const [ownerAddress, setOwnerAddress] = useState();

  const distance = 3;

  // x = 16
  // const landinfodistance16_4 = useContractReader(readContracts, "Land", "landOverviewByDistance", [
  //   countLandTokenId(16, 4),
  //   distance,
  // ]);
  // const landinfodistance16_8 = useContractReader(readContracts, "Land", "landOverviewByDistance", [
  //   countLandTokenId(16, 8),
  //   distance,
  // ]);
  // const landinfodistance16_12 = useContractReader(readContracts, "Land", "landOverviewByDistance", [
  //   countLandTokenId(16, 12),
  //   distance,
  // ]);
  // const landinfodistance16_16 = useContractReader(readContracts, "Land", "landOverviewByDistance", [
  //   countLandTokenId(16, 16),
  //   distance,
  // ]);
  // const landinfodistance16_20 = useContractReader(readContracts, "Land", "landOverviewByDistance", [
  //   countLandTokenId(16, 20),
  //   distance,
  // ]);
  // const landinfodistance16_24 = useContractReader(readContracts, "Land", "landOverviewByDistance", [
  //   countLandTokenId(16, 24),
  //   distance,
  // ]);
  // const landinfodistance16_28 = useContractReader(readContracts, "Land", "landOverviewByDistance", [
  //   countLandTokenId(16, 28),
  //   distance,
  // ]);
  //
  // // x = 20
  // const landinfodistance20_4 = useContractReader(readContracts, "Land", "landOverviewByDistance", [
  //   countLandTokenId(20, 4),
  //   distance,
  // ]);
  // const landinfodistance20_8 = useContractReader(readContracts, "Land", "landOverviewByDistance", [
  //   countLandTokenId(20, 8),
  //   distance,
  // ]);
  // const landinfodistance20_12 = useContractReader(readContracts, "Land", "landOverviewByDistance", [
  //   countLandTokenId(20, 12),
  //   distance,
  // ]);
  // const landinfodistance20_16 = useContractReader(readContracts, "Land", "landOverviewByDistance", [
  //   countLandTokenId(20, 16),
  //   distance,
  // ]);
  // const landinfodistance20_20 = useContractReader(readContracts, "Land", "landOverviewByDistance", [
  //   countLandTokenId(20, 20),
  //   distance,
  // ]);
  // const landinfodistance20_24 = useContractReader(readContracts, "Land", "landOverviewByDistance", [
  //   countLandTokenId(20, 24),
  //   distance,
  // ]);
  // const landinfodistance20_28 = useContractReader(readContracts, "Land", "landOverviewByDistance", [
  //   countLandTokenId(20, 28),
  //   distance,
  // ]);
  //
  // // x = 24
  // const landinfodistance24_4 = useContractReader(readContracts, "Land", "landOverviewByDistance", [
  //   countLandTokenId(24, 4),
  //   distance,
  // ]);
  // const landinfodistance24_8 = useContractReader(readContracts, "Land", "landOverviewByDistance", [
  //   countLandTokenId(24, 8),
  //   distance,
  // ]);
  // const landinfodistance24_12 = useContractReader(readContracts, "Land", "landOverviewByDistance", [
  //   countLandTokenId(24, 12),
  //   distance,
  // ]);
  // const landinfodistance24_16 = useContractReader(readContracts, "Land", "landOverviewByDistance", [
  //   countLandTokenId(24, 16),
  //   distance,
  // ]);
  // const landinfodistance24_20 = useContractReader(readContracts, "Land", "landOverviewByDistance", [
  //   countLandTokenId(24, 20),
  //   distance,
  // ]);
  // const landinfodistance24_24 = useContractReader(readContracts, "Land", "landOverviewByDistance", [
  //   countLandTokenId(24, 24),
  //   distance,
  // ]);
  // const landinfodistance24_28 = useContractReader(readContracts, "Land", "landOverviewByDistance", [
  //   countLandTokenId(24, 28),
  //   distance,
  // ]);
  //
  // // x = 28
  // const landinfodistance28_4 = useContractReader(readContracts, "Land", "landOverviewByDistance", [
  //   countLandTokenId(28, 4),
  //   distance,
  // ]);
  // const landinfodistance28_8 = useContractReader(readContracts, "Land", "landOverviewByDistance", [
  //   countLandTokenId(28, 8),
  //   distance,
  // ]);
  // const landinfodistance28_12 = useContractReader(readContracts, "Land", "landOverviewByDistance", [
  //   countLandTokenId(28, 12),
  //   distance,
  // ]);
  // const landinfodistance28_16 = useContractReader(readContracts, "Land", "landOverviewByDistance", [
  //   countLandTokenId(28, 16),
  //   distance,
  // ]);
  // const landinfodistance28_20 = useContractReader(readContracts, "Land", "landOverviewByDistance", [
  //   countLandTokenId(28, 20),
  //   distance,
  // ]);
  // const landinfodistance28_24 = useContractReader(readContracts, "Land", "landOverviewByDistance", [
  //   countLandTokenId(28, 24),
  //   distance,
  // ]);
  // const landinfodistance28_28 = useContractReader(readContracts, "Land", "landOverviewByDistance", [
  //   countLandTokenId(28, 28),
  //   distance,
  // ]);
  //
  // // x = 4
  // const landinfodistance4_4 = useContractReader(readContracts, "Land", "landOverviewByDistance", [
  //   countLandTokenId(4, 4),
  //   distance,
  // ]);
  // const landinfodistance4_8 = useContractReader(readContracts, "Land", "landOverviewByDistance", [
  //   countLandTokenId(4, 8),
  //   distance,
  // ]);
  // const landinfodistance4_12 = useContractReader(readContracts, "Land", "landOverviewByDistance", [
  //   countLandTokenId(4, 12),
  //   distance,
  // ]);
  // const landinfodistance4_16 = useContractReader(readContracts, "Land", "landOverviewByDistance", [
  //   countLandTokenId(4, 16),
  //   distance,
  // ]);
  // const landinfodistance4_20 = useContractReader(readContracts, "Land", "landOverviewByDistance", [
  //   countLandTokenId(4, 20),
  //   distance,
  // ]);
  // const landinfodistance4_24 = useContractReader(readContracts, "Land", "landOverviewByDistance", [
  //   countLandTokenId(4, 24),
  //   distance,
  // ]);
  // const landinfodistance4_28 = useContractReader(readContracts, "Land", "landOverviewByDistance", [
  //   countLandTokenId(4, 28),
  //   distance,
  // ]);
  // // x = 8
  // const landinfodistance8_4 = useContractReader(readContracts, "Land", "landOverviewByDistance", [
  //   countLandTokenId(8, 4),
  //   distance,
  // ]);
  // const landinfodistance8_8 = useContractReader(readContracts, "Land", "landOverviewByDistance", [
  //   countLandTokenId(8, 8),
  //   distance,
  // ]);
  // const landinfodistance8_12 = useContractReader(readContracts, "Land", "landOverviewByDistance", [
  //   countLandTokenId(8, 12),
  //   distance,
  // ]);
  // const landinfodistance8_16 = useContractReader(readContracts, "Land", "landOverviewByDistance", [
  //   countLandTokenId(8, 16),
  //   distance,
  // ]);
  // const landinfodistance8_20 = useContractReader(readContracts, "Land", "landOverviewByDistance", [
  //   countLandTokenId(8, 20),
  //   distance,
  // ]);
  // const landinfodistance8_24 = useContractReader(readContracts, "Land", "landOverviewByDistance", [
  //   countLandTokenId(8, 24),
  //   distance,
  // ]);
  // const landinfodistance8_28 = useContractReader(readContracts, "Land", "landOverviewByDistance", [
  //   countLandTokenId(8, 28),
  //   distance,
  // ]);
  //
  // // x = 12
  // const landinfodistance12_4 = useContractReader(readContracts, "Land", "landOverviewByDistance", [
  //   countLandTokenId(12, 4),
  //   distance,
  // ]);
  // const landinfodistance12_8 = useContractReader(readContracts, "Land", "landOverviewByDistance", [
  //   countLandTokenId(12, 8),
  //   distance,
  // ]);
  // const landinfodistance12_12 = useContractReader(readContracts, "Land", "landOverviewByDistance", [
  //   countLandTokenId(12, 12),
  //   distance,
  // ]);
  // const landinfodistance12_16 = useContractReader(readContracts, "Land", "landOverviewByDistance", [
  //   countLandTokenId(12, 16),
  //   distance,
  // ]);
  // const landinfodistance12_20 = useContractReader(readContracts, "Land", "landOverviewByDistance", [
  //   countLandTokenId(12, 20),
  //   distance,
  // ]);
  // const landinfodistance12_24 = useContractReader(readContracts, "Land", "landOverviewByDistance", [
  //   countLandTokenId(12, 24),
  //   distance,
  // ]);
  // const landinfodistance12_28 = useContractReader(readContracts, "Land", "landOverviewByDistance", [
  //   countLandTokenId(12, 28),
  //   distance,
  // ]);

  let landinfodistance = useContractReader(readContracts, "Land", "landOverviewByDistance", [
    countLandTokenId(currentx, currenty),
    distance,
  ]);

  // if (currentx == 4)
  //   switch (currenty) {
  //     case 4:
  //       landinfodistance = landinfodistance4_4;
  //       break;
  //     case 8:
  //       landinfodistance = landinfodistance4_8;
  //       break;
  //     case 12:
  //       landinfodistance = landinfodistance4_12;
  //       break;
  //     case 16:
  //       landinfodistance = landinfodistance4_16;
  //       break;
  //     case 20:
  //       landinfodistance = landinfodistance4_20;
  //       break;
  //     case 24:
  //       landinfodistance = landinfodistance4_24;
  //       break;
  //     case 28:
  //       landinfodistance = landinfodistance4_28;
  //       break;
  //   }
  //
  // if (currentx == 8)
  //   switch (currenty) {
  //     case 4:
  //       landinfodistance = landinfodistance8_4;
  //       break;
  //     case 8:
  //       landinfodistance = landinfodistance8_8;
  //       break;
  //     case 12:
  //       landinfodistance = landinfodistance8_12;
  //       break;
  //     case 16:
  //       landinfodistance = landinfodistance8_16;
  //       break;
  //     case 20:
  //       landinfodistance = landinfodistance8_20;
  //       break;
  //     case 24:
  //       landinfodistance = landinfodistance8_24;
  //       break;
  //     case 28:
  //       landinfodistance = landinfodistance8_28;
  //       break;
  //   }
  //
  // if (currentx == 12)
  //   switch (currenty) {
  //     case 4:
  //       landinfodistance = landinfodistance12_4;
  //       break;
  //     case 8:
  //       landinfodistance = landinfodistance12_8;
  //       break;
  //     case 12:
  //       landinfodistance = landinfodistance12_12;
  //       break;
  //
  //     case 16:
  //       landinfodistance = landinfodistance12_16;
  //       break;
  //     case 20:
  //       landinfodistance = landinfodistance12_20;
  //       break;
  //     case 24:
  //       landinfodistance = landinfodistance12_24;
  //       break;
  //     case 28:
  //       landinfodistance = landinfodistance12_28;
  //       break;
  //   }
  //
  // if (currentx == 16)
  //   switch (currenty) {
  //     case 4:
  //       landinfodistance = landinfodistance16_4;
  //       break;
  //     case 8:
  //       landinfodistance = landinfodistance16_8;
  //       break;
  //     case 12:
  //       landinfodistance = landinfodistance16_12;
  //       break;
  //     case 16:
  //       landinfodistance = landinfodistance16_16;
  //       break;
  //     case 20:
  //       landinfodistance = landinfodistance16_20;
  //       break;
  //     case 24:
  //       landinfodistance = landinfodistance16_24;
  //       break;
  //     case 28:
  //       landinfodistance = landinfodistance16_28;
  //       break;
  //   }
  //
  // if (currentx == 20)
  //   switch (currenty) {
  //     case 4:
  //       landinfodistance = landinfodistance20_4;
  //       break;
  //     case 8:
  //       landinfodistance = landinfodistance20_8;
  //       break;
  //     case 12:
  //       landinfodistance = landinfodistance20_12;
  //       break;
  //
  //     case 16:
  //       landinfodistance = landinfodistance20_16;
  //       break;
  //     case 20:
  //       landinfodistance = landinfodistance20_20;
  //       break;
  //     case 24:
  //       landinfodistance = landinfodistance20_24;
  //       break;
  //     case 28:
  //       landinfodistance = landinfodistance20_28;
  //       break;
  //   }
  //
  // if (currentx == 24)
  //   switch (currenty) {
  //     case 4:
  //       landinfodistance = landinfodistance24_4;
  //       break;
  //     case 8:
  //       landinfodistance = landinfodistance24_8;
  //       break;
  //     case 12:
  //       landinfodistance = landinfodistance24_12;
  //       break;
  //
  //     case 16:
  //       landinfodistance = landinfodistance24_16;
  //       break;
  //     case 20:
  //       landinfodistance = landinfodistance24_20;
  //       break;
  //     case 24:
  //       landinfodistance = landinfodistance24_24;
  //       break;
  //     case 28:
  //       landinfodistance = landinfodistance24_28;
  //       break;
  //   }
  //
  // if (currentx == 28)
  //   switch (currenty) {
  //     case 4:
  //       landinfodistance = landinfodistance28_4;
  //       break;
  //     case 8:
  //       landinfodistance = landinfodistance28_8;
  //       break;
  //     case 12:
  //       landinfodistance = landinfodistance28_12;
  //       break;
  //
  //     case 16:
  //       landinfodistance = landinfodistance28_16;
  //       break;
  //     case 20:
  //       landinfodistance = landinfodistance28_20;
  //       break;
  //     case 24:
  //       landinfodistance = landinfodistance28_24;
  //       break;
  //     case 28:
  //       landinfodistance = landinfodistance28_28;
  //       break;
  //   }
  console.log(landinfodistance);

  return (
    <div>
      <BrowserRouter>
        <nav>
          <div>
            {/*
      ⚙️ Here is an example UI that displays and sets the purpose in your smart contract:
    */}
            <div
              style={{
                border: "10px solid #fc8c03",
                borderRadius: "10px",
                padding: 16,
                width: 420,
                margin: "auto",
                marginTop: 64,
                backgroundColor: "lightgray",
                textAlign: "center",
              }}
            >
              <h1>welcome to Map</h1>
              <div style={{ overflow: "scroll scroll", height: 550, paddingTop: 50, textAlign: "center" }}>
                <Button
                  type="text"
                  icon={<UpOutlined />}
                  onClick={() => {
                    if (currentx > 4) setCurrentx(currentx - 4);
                  }}
                />
                <Divider orientation="left"></Divider>
                <div
                  style={{
                    width: 20,
                    height: 300,
                    float: "left",
                    display: "flex",
                    alignItems: "center",
                  }}
                >
                  <Button
                    type="text"
                    icon={<LeftOutlined />}
                    onClick={() => {
                      refreshPage();
                      if (currenty > 4) setCurrenty(currenty - 4);
                    }}
                  />
                </div>
                <div
                  style={{
                    width: 20,
                    height: 300,
                    float: "right",
                    display: "flex",
                    alignItems: "center",
                  }}
                >
                  <Button
                    type="text"
                    icon={<RightOutlined />}
                    onClick={() => {
                      if (currenty < 28) setCurrenty(currenty + 4);
                    }}
                  />
                </div>
                {landinfodistance ? (
                  <MapDesign
                    distanceInfo={landinfodistance}
                    distance={distance}
                    readContracts={readContracts}
                    writeContracts={writeContracts}
                    setPlantId={setPlantId}
                    setLandTokenId={setLandTokenId}
                    setOwnerAddress={setOwnerAddress}
                  />
                ) : (
                  "loading.."
                )}

                <Divider orientation="left"></Divider>
                <Button
                  type="text"
                  icon={<DownOutlined />}
                  onClick={() => {
                    if (currentx < 28) setCurrentx(currentx + 4);
                  }}
                />
              </div>
            </div>
          </div>
        </nav>
        <Switch>
          <div>
            <Route path="/landdetails">
              <LandDetails
                plantId={plantId}
                landTokenId={landTokenId}
                ownerAddress={ownerAddress}
                readContracts={readContracts}
                writeContracts={writeContracts}
                address={address}
                tx={tx}
              />
            </Route>

            <Route path="/plant">
              <Plant
                plantId={plantId}
                landTokenId={landTokenId}
                address={ownerAddress}
                readContracts={readContracts}
                writeContracts={writeContracts}
                tx={tx}
              />
            </Route>
          </div>
        </Switch>
      </BrowserRouter>
    </div>
  );
}
