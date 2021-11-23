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
              setPlantId(distanceInfo[4][i]._hex);
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

  let landinfodistance = useContractReader(readContracts, "Land", "landOverviewByDistance", [
    countLandTokenId(currentx, currenty),
    distance,
  ]);

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
