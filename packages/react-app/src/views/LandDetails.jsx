import React, { useState } from "react";
import { Button, List } from "antd";
import { utils } from "ethers";
import { useContractReader } from "eth-hooks";
import { BrowserRouter, Link, Route, Switch } from "react-router-dom";
import { Address } from "../components";

import fire from "../assets/fire.gif";

const POLL_TIME = 15000;

function AnalyseData({ plantIdMain }) {
  return;
}

function Getcoordination({ coordination }) {
  // console.log("coordination " + coordination);
  const x = Math.floor(coordination % 32).toString();
  const y = Math.floor(coordination / 32).toString();
  return "(" + y + "," + x + ")";
}

function BuyLand({ readContracts, writeContracts, landTokenId, address, tx, setOwnerAddressMain }) {
  const [btnStatus, setBtnStaus] = useState(true);
  const [transactionStatus, setTransactionStatus] = useState("Land is Available!");
  // const landPrice = useContractReader(readContracts, "Land", )
  return (
    <div>
      <h4 style={{ color: "white" }}>{transactionStatus}</h4>
      {btnStatus ? (
        <div style={{ backgroundColor: "antiquewhite", padding: 10 }}>
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
                    setTransactionStatus("Congratulations! You are now the owner this land!");
                  } else {
                    setBtnStaus(true);
                    setTransactionStatus("Land is Available!");
                  }
                },
              );
              console.log("awaiting metamask/web3 confirm result...", result);
              console.log(await result);
              setOwnerAddressMain(address);
            }}
          >
            Buy Land
          </Button>

          <span style={{ color: "black" }}> Price: ???</span>
        </div>
      ) : (
        ""
      )}
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
          renderItem={item => (
            <List.Item style={{ color: "white" }} onClick={() => setPlantId(item)}>
              {item}
            </List.Item>
          )}
        />
      </div>
    </div>
  );
}

function GetSeedsList({
  ownerAddressMain,
  landTokenId,
  readContracts,
  writeContracts,
  tx,
  setIsPlantedMain,
  setPlantIdMain,
}) {
  const ownedUnplantedList = useContractReader(readContracts, "Plant", "unplantedByAddress", [ownerAddressMain], POLL_TIME);
  const [btnStatus, setBtnStaus] = useState(true);
  const [transactionStr, setTransactionStr] = useState("Nothing Planted!");
  const [chooseStr, setChooseStr] = useState("Choose a seed:");
  const [btnStr, setBtnStr] = useState("Plant");
  const [plantId, setPlantId] = useState();
  const [displayList, setDisplayList] = useState(true);
  const [transcationError, setTranscationError] = useState("");

  return (
    <div>
      <h4 style={{ color: "white" }}>{transactionStr}</h4>
      <div>
        {ownedUnplantedList && ownedUnplantedList.length > 0 && displayList ? (
          <div>
            <h4 style={{ color: "white" }}>{chooseStr}</h4>
            {ownedUnplantedList.map(seed => (
              <DisplaySeedsList key={'slist-'+seed._hex} seed={seed} setPlantId={setPlantId} />
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
                  // setTransactionStr(plantId);
                  setDisplayList(false);
                  setTranscationError("");
                  setIsPlantedMain(true);
                  setPlantIdMain(plantId);
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

function IsOwner({
  ownerAddressMain,
  address,
  landTokenId,
  readContracts,
  writeContracts,
  tx,
  setIsPlantedMain,
  setPlantIdMain,
}) {
  let isOwner = false;
  if (ownerAddressMain == address) {
    isOwner = true;
  }
  console.log("isOwner ownerAddress " + ownerAddressMain);
  console.log("isOwner " + address);
  return (
    <div>
      {isOwner ? (
        <GetSeedsList
          ownerAddressMain={ownerAddressMain}
          landTokenId={landTokenId}
          readContracts={readContracts}
          writeContracts={writeContracts}
          tx={tx}
          setIsPlantedMain={setIsPlantedMain}
          setPlantIdMain={setPlantIdMain}
        />
      ) : (
        <h4 style={{ color: "white" }}>Nothing Planted!</h4>
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
  const [ownerAddressMain, setOwnerAddressMain] = useState(ownerAddress);
  const [isPlantedMain, setIsPlantedMain] = useState(isPlanted);
  const [plantIdMain, setPlantIdMain] = useState(plantId);
  const landDetails = useContractReader(readContracts, "Land", "landDetailsByDistance", [landTokenId, 0], POLL_TIME);
  // console.log("landTokenId "+landTokenId);
  // console.log(landDetails);
  console.log("isPlantedMain " + isPlantedMain);

  return (
    <div style={{ position: "relative", top: -20 }}>
      {/*
        ⚙️ Here is an example UI that displays and sets the purpose in your smart contract:
      */}
      <div
        style={{
          backgroundColor: "#212529",
          paddingTop: 5,
          textAlign: "center",
        }}
      >
        <div className="nes-container is-rounded is-dark with-title">
          <p className="title">Chosen location</p>
          <div style={{ display: "block", width: "100%" }}>
            <div style={{ width: "50%", display: "inline-block", verticalAlign: "top" }}>
              <div className="nes-container is-rounded is-dark" style={{ width: "100%", textAlign: "left" }}>
                {isMinted ? (
                  <span>
                    Landowner: <Address address={ownerAddressMain} /*ensProvider={mainnetProvider}*/ fontSize={16} />
                  </span>
                ) : (
                  <BuyLand
                    readContracts={readContracts}
                    writeContracts={writeContracts}
                    landTokenId={landTokenId}
                    address={address}
                    tx={tx}
                    setOwnerAddressMain={setOwnerAddressMain}
                  />
                )}
              </div>

              <div className="nes-container is-rounded is-dark" style={{ width: "100%", textAlign: "left" }}>
                <span>Ideal species: {landDetails ? landDetails[1][0] : "Mican..."} </span>
              </div>
              <div className="nes-container is-rounded is-dark" style={{ width: "100%", textAlign: "left" }}>
                <span>
                  Burn Bonus{" "}
                  {(() => {
                    if (!landDetails) {
                      return "";
                    }
                    const burns = landDetails[2][0];
                    const range = Object.keys([...Array(burns + 1)]);
                    return range.map(idx => <img key={"fire-" + idx} src={fire} />);
                  })()}
                </span>
              </div>
            </div>
            <div style={{ width: "50%", display: "inline-block", verticalAlign: "top" }}>
              {(() => {
                const id = landTokenId;
                const range = Object.keys([...Array(32)]);
                return (
                  <div
                    className="nes-container is-rounded is-dark with-title"
                    style={{ width: "100%", textAlign: "left" }}
                  >
                    <p className="title">Currently viewing</p>
                    <div className="nes-select" style={{ display: "inline-block", width: 150 }}>
                      <span>Latitude:</span>
                      <select defaultValue={parseInt(id / 32)} value={parseInt(id / 32)} required id="default_select" style={{ color: "black" }}>
                        {range.map(idx => (
                          <option key={'lat-'+idx} value={idx}>
                            {idx}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="nes-select" style={{ display: "inline-block", width: 150 }}>
                      <span>Longitude:</span>
                      <select defaultValue={id % 32} value={id % 32} required id="default_select" style={{ color: "black" }}>
                        {range.map(idx => (
                          <option key={'long-'+idx} value={idx}>
                            {idx}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                );
              })()}
              <div
                className="nes-container is-rounded is-dark without-title"
                style={{ width: "100%", textAlign: "left" }}
              >
                <div>
                  {isPlantedMain ? (
                    <div>
                      <h4 style={{ color: "white" }}>{plantIdMain}</h4>
                      <Link className="nes-btn is-success" to="/plantUI">
                        plant Details
                      </Link>
                    </div>
                  ) : (
                    <IsOwner
                      ownerAddressMain={ownerAddressMain}
                      address={address}
                      landTokenId={landTokenId}
                      readContracts={readContracts}
                      writeContracts={writeContracts}
                      tx={tx}
                      setIsPlantedMain={setIsPlantedMain}
                      setPlantIdMain={setPlantIdMain}
                    />
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
