import React, { useState } from "react";
import { Button, List } from "antd";
import { useContractReader } from "eth-hooks";
import { Plant } from "./";
import { BrowserRouter, Link, Route, Switch } from "react-router-dom";

function DisplayPlantsList({ plantId, setPlantId }) {
  let data = [];
  data.push(plantId._hex);

  return (
    <div>
      <div>
        <List
          bordered
          dataSource={data}
          renderItem={item => (
            <List.Item key={item} onClick={() => setPlantId(item)}>
              <Link to="/plant">{item}</Link>
            </List.Item>
          )}
        />
      </div>
    </div>
  );
}

export default function PlantsList({ address, readContracts, writeContracts, tx }) {
  const plantList = useContractReader(readContracts, "Plant", "plantedByAddress", [address]);
  const [plantId, setPlantId] = useState();
  return (
    <div>
      <BrowserRouter>
        <nav>
          {/*
      ⚙️ Here is an example UI that displays and sets the purpose in your smart contract:
    */}
          <div
            style={{
              border: "10px solid #fc8c03",
              borderRadius: "10px",
              padding: 16,
              width: 520,
              margin: "auto",
              marginTop: 64,
              marginBottom: 64,
              backgroundColor: "lightgray",
              textAlign: "center",
            }}
          >
            {plantList ? (
              <div>
                {plantList.length > 0 ? (
                  <div>
                    <h6>Please choose a plant:</h6>
                    {plantList.map(plantId => (
                      <DisplayPlantsList plantId={plantId} setPlantId={setPlantId} />
                    ))}
                  </div>
                ) : (
                  "You have no plant."
                )}
              </div>
            ) : (
              "Loading..."
            )}
          </div>
        </nav>
        <Switch>
          <div>
            <Route path="/plant">
              <Plant
                plantId={plantId}
                address={address}
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
