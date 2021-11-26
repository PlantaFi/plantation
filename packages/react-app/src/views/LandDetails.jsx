import React, { useState } from "react";
import { Button, List } from "antd";
import { utils } from "ethers";
import { useContractReader } from "eth-hooks";
import { BrowserRouter, Link, Route, Switch } from "react-router-dom";
import { Address } from "../components";

import fire from "../assets/fire.gif";

function AnalyseData({ plantId }) {
  return;
}

function Getcoordination({ coordination }) {
  // console.log("coordination " + coordination);
  const x = Math.floor(coordination % 32).toString();
  const y = Math.floor(coordination / 32).toString();
  return "(" + y + "," + x + ")";
}

function BuyLand({ writeContracts, landTokenId, address, tx }) {
  const [btnStatus, setBtnStaus] = useState(true);
  const [transactionStatus, setTransactionStatus] = useState("Land is Available!");
  return (
    <div>
      <h4 style={{color: 'white'}}>{transactionStatus}</h4>
      <div>
        {btnStatus ? (
          <Button
            style={{ margin: 5 }}
            className="nes-btn is-success"
            onClick={async () => {
              setBtnStaus(false);
              setTransactionStatus("loading...");
              const result = tx(
                writeContracts.Land.mintAt(address, landTokenId, {
                  value: utils.parseEther("0.0005"),
                }),
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
                    setTransactionStatus("Transcation Succeed! You are the owner the land!");
                  } else {
                    setBtnStaus(true);
                    setTransactionStatus("Land is Available!");
                  }
                },
              );
              console.log("awaiting metamask/web3 confirm result...", result);
              console.log(await result);
            }}
          >
            Buy Land
          </Button>
        ) : (
          ""
        )}
      </div>
    </div>
  );
}

function DisplaySeedsList({ seed, setPlantId }) {
  let data = [];
  data.push(seed._hex);

  return (
    <div>
      <div>
        <List
          bordered
          dataSource={data}
          renderItem={item => <List.Item onClick={() => setPlantId(item)}>{item}</List.Item>}
        />
      </div>
    </div>
  );
}

function GetSeedsList({ ownerAddress, landTokenId, readContracts, writeContracts, tx }) {
  const ownedUnplantedList = useContractReader(readContracts, "Plant", "unplantedByAddress", [ownerAddress]);
  const [btnStatus, setBtnStaus] = useState(true);
  const [transactionStr, setTransactionStr] = useState("Nothing Planted!");
  const [chooseStr, setChooseStr] = useState("Choose a seed:");
  const [btnStr, setBtnStr] = useState("Plant");
  const [plantId, setPlantId] = useState();
  const [displayList, setDisplayList] = useState(true);
  const [transcationError, setTranscationError] = useState("");

  console.log("ownedUnplanted " + ownedUnplantedList);

  return (
    <div>
      <h4>{transactionStr}</h4>
      <div>
        {ownedUnplantedList && ownedUnplantedList.length > 0 && displayList ? (
          <div>
            <h4>{chooseStr}</h4>
            {ownedUnplantedList.map(seed => (
              <DisplaySeedsList seed={seed} setPlantId={setPlantId} />
            ))}
            <Button
              style={{ margin: 5 }}
              className="nes-btn is-success"
              onClick={async () => {
                if (plantId != undefined) {
                  setBtnStr("loading...");
                  const result = tx(writeContracts.Land.implant(landTokenId, plantId), update => {
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
                  setBtnStr("Plant");
                  setChooseStr("");
                  setTransactionStr(plantId);
                  setDisplayList(false);
                  setTranscationError("");
                } else {
                  setTranscationError("No seed is chosen!");
                }
              }}
            >
              {btnStr}
            </Button>
            <h5 style={{ color: "red" }}>{transcationError}</h5>
          </div>
        ) : (
          <div>{displayList ? "You don't have any seeds. Please buy more seeds from SHOP." : ""}</div>
        )}
      </div>
    </div>
  );
}

function IsOwner({ ownerAddress, address, landTokenId, readContracts, writeContracts, tx }) {
  let isOwner = false;
  if (ownerAddress == address) {
    isOwner = true;
  }
  return (
    <div>
      {isOwner ? (
        <GetSeedsList
          ownerAddress={ownerAddress}
          landTokenId={landTokenId}
          readContracts={readContracts}
          writeContracts={writeContracts}
          tx={tx}
        />
      ) : (
        <h4 style={{color: 'white'}}>Nothing Planted!</h4>
      )}
    </div>
  );
}

export default function LandDetail({
  plantId,
  isMinted,
  isPlanted,
  landTokenId,
  ownerAddress,
  readContracts,
  writeContracts,
  address,
  tx,
}) {
  const landDetails = useContractReader(readContracts, "Land", "landDetailsByDistance", [landTokenId, 0]);

  console.log("plantId " + plantId);
  console.log("isMinted " + isMinted);
  console.log("isPlanted " + isPlanted);
  // if (plantId != 0x00) {
  //   isPlanted = true;
  // }

  console.log("landDetails " + landDetails);
  return (
    <div style={{position:'relative', top: -20}}>
      {/*
        ⚙️ Here is an example UI that displays and sets the purpose in your smart contract:
      */}
      <div
        style={{
          /*
          border: "10px solid #fc8c03",
          borderRadius: "10px",
          padding: 16,
          width: 520,
          margin: "auto",
          marginTop: 64,
          marginBottom: 64,
          */
          backgroundColor: "#212529",
          paddingTop: 5,
          textAlign: "center",
        }}
      >
      <div className="nes-container is-rounded is-dark with-title">
        <p className="title">Chosen location</p>
        <div style={{display: 'block', width: '100%'}}>
          <div style={{width: "50", display: "inline-block", float: "left"}}>
            <div className="nes-container is-rounded is-dark" style={{width: '100%', textAlign: 'left'}}>
              {isMinted ? (
                <span>Landowner: <Address address={ownerAddress} /*ensProvider={mainnetProvider}*/ fontSize={16} /></span>
              ) : (
                <BuyLand writeContracts={writeContracts} landTokenId={landTokenId} address={address} tx={tx} />
              )}
            </div>
            
            <div className="nes-container is-rounded is-dark" style={{width: '100%', textAlign: 'left'}}>
              <span>Ideal species: {landDetails ? landDetails[1][0] : "Mican..."} </span>
            </div>
            <div className="nes-container is-rounded is-dark" style={{width: '100%', textAlign: 'left'}}>
              <span>Burn Bonus {
                (() => {
                  if (!landDetails) { return ''; }
                  const burns = landDetails[2][0];
                  const range = Object.keys([...Array(burns + 1)]);
                  return range.map((idx) => (<img key={'fire-'+idx} src={fire} />))
                })()
              }</span>
            </div>
          </div>
          <div style={{width: "50", display: "inline-block", /*float: "left"*/}}>
            { (() => {
              const id = landTokenId;
              const range = Object.keys([...Array(32)]);
              return (
              <div className="nes-container is-rounded is-dark with-title" style={{width: '100%', textAlign: 'left'}}>
                <p className="title">Currently viewing</p>
                <div className="nes-select" style={{display: "inline-block", width: 150}}>
                  <span>Latitude:</span>
                  <select required id="default_select" style={{color: 'black'}}>
                    {range.map(idx => (<option value={idx} selected={idx == parseInt(id / 32)}>{idx}</option>))}
                  </select>
                </div>
                <div className="nes-select" style={{display: "inline-block", width: 150}}>
                  <span>Longitude:</span>
                  <select required id="default_select" style={{color: 'black'}}>
                    {range.map(idx => (<option value={idx} selected={idx == id % 32}>{idx}</option>))}
                  </select>
                </div>
              </div>
            );})() }
              <div className="nes-container is-rounded is-dark without-title" style={{width: '100%', textAlign: 'left'}}>
                <div>

                {isPlanted ? (
                  <div>
                    <h4>{plantId}</h4>
                    <Link to="/plant"> plant Details </Link>
                  </div>
                ) : (
                  <IsOwner
                    ownerAddress={ownerAddress}
                    address={address}
                    landTokenId={landTokenId}
                    readContracts={readContracts}
                    writeContracts={writeContracts}
                    tx={tx}
                  />
                )}
                </div>
              </div>
          </div>
        </div>
      </div></div>
    {/*
        <h6>{landDetails ? <Getcoordination coordination={landDetails[0][0]} /> : "loading..."}</h6>
        <br />
        <h6>
          {isMinted ? (
            "Owner: " + ownerAddress
          ) : (
            <BuyLand writeContracts={writeContracts} landTokenId={landTokenId} address={address} tx={tx} />
          )}
        </h6>
        <br />
        <h6>
          {isPlanted ? (
            <div>
              <h4>{plantId}</h4>
              <Link to="/plant"> plant Details </Link>
            </div>
          ) : (
            <IsOwner
              ownerAddress={ownerAddress}
              address={address}
              landTokenId={landTokenId}
              readContracts={readContracts}
              writeContracts={writeContracts}
              tx={tx}
            />
          )}
        </h6>
        <br />
        <h6>Land Type: {landDetails ? landDetails[1][0] : "loading..."}</h6>
        <br />
        <h6>Burn Power:{landDetails ? landDetails[2][0] : "loading..."}</h6>
    */}
    </div>
  );
}
