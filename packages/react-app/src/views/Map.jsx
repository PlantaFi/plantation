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

import backSand from "../assets/questwater2.png";
import backGrass from "../assets/questgrass4.png";
import backTree from "../assets/questtreeA3.png";
import windrose from "../assets/windrose.png";

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
  setIsMinted,
  setIsPlanted,
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
            width: 42,
            height: 42,
            backgroundColor: "white",
            display: "inline-flex",
            alignItems: "center",
          }}
        >
          <Link
            onClick={() => {
              console.log("landId " + distanceInfo[0][i]);
              setLandTokenId(distanceInfo[0][i]);
              setOwnerAddress(distanceInfo[1][i]);
              setIsMinted(distanceInfo[2][i]);
              setIsPlanted(distanceInfo[3][i]);
              setPlantId(distanceInfo[4][i]._hex);
            }}
            to="/landdetails/"
          >
            <img
              src={backgroundImg}
              style={{
                objectFit: "fill",
                width: 42,
                height: 42,
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
  const [isMinted, setIsMinted] = useState();
  const [isPlanted, setIsPlanted] = useState();
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
                /*border: "10px solid #fc8c03",
                borderRadius: "10px",*/
                padding: 16,
                width: 720,
                margin: "auto",
                marginTop: 64,
                backgroundColor: "white",
                textAlign: "center",
              }}
            >
              <h1>Plantaland World Map</h1>
              <div style={{ /*overflow: "scroll scroll", height: 550,*/ paddingTop: 50, textAlign: "center", backgroundColor: '#436ee7' }}>
                <img src={windrose} style={{
                      position: 'absolute',
                      top: 2,
                      left: 5,
                      width: 120,
                }}
                />
                <h3 style={{color: 'white', marginTop: -20}}>Location: ({currentx}, {currenty})</h3>
                <div>
                  <button
                    type="button"
                    style={{ margin: 10 }}
                    class="nes-btn"
                    onClick={() => {
                      if (currentx > 4) setCurrentx(currentx - 4);
                    }}
                  >
                    North
                  </button>
                </div>
                <div
                  style={{
                    width: 150,
                    height: 300,
                    float: "left",
                    display: "flex",
                    alignItems: "center",
                  }}
                >
                  <button
                    type="button"
                    style={{ margin: 10 }}
                    class="nes-btn"
                    onClick={() => {
                      if (currenty > 4) setCurrenty(currenty - 4);
                    }}
                  >
                    &lt; West
                  </button>
                </div>
                <div
                  style={{
                    height: 300,
                    float: "right",
                    display: "flex",
                    alignItems: "center",
                  }}
                >
                  <button
                    type="button"
                    style={{ margin: 10 }}
                    class="nes-btn"
                    onClick={() => {
                      if (currenty < 28) setCurrenty(currenty + 4);
                    }}
                  >
                    East &gt;
                  </button>
                </div>
                <div
                  style={{
                    border: "4px solid #54dfff",
                    padding: 4,
                    width: 342,
                    display: "inline-block",
                    backgroundColor: "black",
                  }}
                >

                  <div style={{ border: "4px solid lightgray", padding: 4, backgroundColor: "black" }}>

                    <div style={{ border: "4px solid gray", padding: 4, backgroundColor: "black" }}>
                      {landinfodistance ? (
                        <MapDesign
                          distanceInfo={landinfodistance}
                          distance={distance}
                          readContracts={readContracts}
                          writeContracts={writeContracts}
                          setPlantId={setPlantId}
                          setIsMinted={setIsMinted}
                          setIsPlanted={setIsPlanted}
                          setLandTokenId={setLandTokenId}
                          setOwnerAddress={setOwnerAddress}
                        />
                      ) : (
                        "loading.."
                      )}
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  style={{ margin: 10 }}
                  class="nes-btn"
                  onClick={() => {
                    if (currentx < 28) setCurrentx(currentx + 4);
                  }}
                >
                  South
                </button>
              </div>
            </div>
          </div>
        </nav>
        <Switch>
          <div>
            <Route path="/landdetails">
              <LandDetails
                plantId={plantId}
                isMinted={isMinted}
                isPlanted={isPlanted}
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
