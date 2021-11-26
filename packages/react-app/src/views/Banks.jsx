import React, { useState } from "react";
import { utils } from "ethers";
import { Button, Card, Col, Collapse, Space } from "antd";
import { FruitSwap } from "../components/";

const _onUpdate = update => {
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
}

import {
  useBalance,
  useContractLoader,
  useContractReader,
  useGasPrice,
  useOnBlock,
  useUserProviderAndSigner,
} from "eth-hooks";

let plantsCount = 0;
function DisplayApproveBtn({
  address,
  readContracts,
  plantAddress,
  setDisplayBuyPlantBtn,
  fruitAllowance,
  tx,
  writeContracts,
}) {
  const allowanceEther = utils.formatEther(fruitAllowance);
  const [approveBtnStr, setApproveBtnStr] = useState("Approve");
  let displayBtn = true;
  console.log("allowanceEther " + Number(allowanceEther));
  if (Number(allowanceEther) > 0) {
    displayBtn = false;
  }
  console.log("displayBtn " + displayBtn);
  return (
    <div>
      {displayBtn ? (
        <Button
          style={{ marginTop: 8, marginBottom: 8 }}
          onClick={async () => {
            setApproveBtnStr("loading...");

            const result = tx(
              writeContracts.Fruit.approve(
                plantAddress,
                "0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff",
              ),
              _onUpdate
            );
            console.log("awaiting metamask/web3 confirm result...", result);
            console.log(await result);
            setApproveBtnStr("Approve");
          }}
        >
          {approveBtnStr}
        </Button>
      ) : (
        setDisplayBuyPlantBtn(true)
      )}
    </div>
  );
}

function GetApproveFruit({ address, readContracts, plantAddress, setDisplayBuyPlantBtn, writeContracts, tx }) {
  // const approveFruits =
  const fruitAllowance = useContractReader(readContracts, "Fruit", "allowance", [address, plantAddress]);
  return (
    <div>
      {fruitAllowance ? (
        <DisplayApproveBtn
          address={address}
          readContracts={readContracts}
          plantAddress={plantAddress}
          setDisplayBuyPlantBtn={setDisplayBuyPlantBtn}
          fruitAllowance={fruitAllowance}
          writeContracts={writeContracts}
          tx={tx}
        />
      ) : (
        "loading..."
      )}
    </div>
  );
}

function Shop({ address, tx, readContracts, writeContracts, setTransferEvents }) {
  const [buyPlantBtnStr, setBuyPlantBtnStr] = useState("Buy Seed");
  const [buyFruitBtnStr, setBuyFruitBtnStr] = useState("Get Free Fruits");
  const [displayBuyPlantBtn, setDisplayBuyPlantBtn] = useState(false);
  const [buyPlantStr, setBuyPlantStr] = useState("");

  const seedPrice = useContractReader(readContracts, "Plant", "currentPrice");
  const fruitBalance = useContractReader(readContracts, "Fruit", "balanceOf", [address]);
  let displayApproveBtn = false;
  let displayBuyFruitBtn = true;
  // let displayBuyPlantBtn = true;

  if (seedPrice != undefined) {
    const plantAddress = readContracts.Plant.address;
    console.log("fruitBalance " + readContracts.Plant.address);

    // if (fruitAllowance != undefined) {
    //     if (fruitAllowance > 0) {
    //       displayBuyPlantBtn = true;
    //       displayApproveBtn = false;
    //     } else {
    //       displayBuyPlantBtn = false;
    //       displayApproveBtn = true;
    //     }
    //   }
  }

  // if (fruitBalance != undefined && seedPrice != undefined) {
  //   if (seedPrice > fruitBalance) {
  //     displayBuyFruitBtn = true;
  //   } else {
  //     displayBuyFruitBtn = false;
  //   }
  // }
  console.log("seedPrice " + seedPrice);
  console.log("fruitBalance " + fruitBalance);
  return (
    <div className="nes-container is-rounded is-dark with-title">
      <p className="title">Market</p>

      <div className="nes-container is-rounded is-dark with-title" style={{maxWidth: 400, display: 'inline-block', verticalAlign: 'top'}}>
        <p className="title">Fruit</p>
        {writeContracts.Fruit ? (<FruitSwap
            address={address}
            tx={tx}
            writeContracts={writeContracts}
            readContracts={readContracts}
        />) : ''}

      </div>
      <div className="nes-container is-rounded is-dark with-title" style={{maxWidth: 400, display: 'inline-block', verticalAlign: 'top'}}>
        <p className="title">Seed</p>
        <div>Fruit Owned:{fruitBalance ? utils.formatEther(fruitBalance) : "loading..."} </div>
        {displayBuyFruitBtn ? (
          <Button
            style={{ marginTop: 8, marginBottom: 8 }}
            onClick={async () => {
              setBuyFruitBtnStr("loading...");

              const result = tx(writeContracts.Fruit.freeFruit(), update => {
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
              setBuyFruitBtnStr("Get Free Fruits");
            }}
          >
            {buyFruitBtnStr}
          </Button>
        ) : (
          ""
        )}
        <br />
        {seedPrice ? (
          <GetApproveFruit
            address={address}
            readContracts={readContracts}
            plantAddress={readContracts.Plant.address}
            setDisplayBuyPlantBtn={setDisplayBuyPlantBtn}
            writeContracts={writeContracts}
            tx={tx}
          />
        ) : (
          ""
        )}
        <br />
        {displayBuyPlantBtn ? (
          <Button
            style={{ marginTop: 8, marginBottom: 8 }}
            onClick={async () => {
              setBuyPlantBtnStr("loading...");
              setBuyPlantStr("");
              const result = tx(writeContracts.Plant.buy(), update => {
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
              setBuyPlantBtnStr("Buy Seed");
              if (setTransferEvents.length > plantsCount) {
                setBuyPlantStr("You bought a seed.");
              }
              plantsCount = setTransferEvents.length;
            }}
          >
            {buyPlantBtnStr}
          </Button>
        ) : (
          ""
        )}
        <h6>{buyPlantStr}</h6>
        <div>Price: {seedPrice ? utils.formatEther(seedPrice) : "loading..."} FRUIT</div>
      </div>
      <div className="nes-container is-rounded is-dark with-title" style={{maxWidth: 400, display: 'inline-block', verticalAlign: 'top'}}>
        <p className="title">Land</p>
        Visit the map and choose a location to purchase LAND.

      </div>
    </div>
  );
}

export default function Banks({
  purpose,
  setTransferEvents,
  address,
  mainnetProvider,
  localProvider,
  yourLocalBalance,
  price,
  tx,
  readContracts,
  writeContracts,
}) {
  const landSupply = useContractReader(readContracts, "Land", "totalSupply");
  const crcBalance = useContractReader(readContracts, "Currency", "balanceOf", [address]);

  const seedBalance = useContractReader(readContracts, "Seed", "balanceOf", [address]);
  const landBalance = useContractReader(readContracts, "Land", "balanceOf", [address]);

  const fruitSupply = useContractReader(readContracts, "Fruit", "totalSupply");

  console.log("setTransferEvents " + setTransferEvents.length + " " + plantsCount);
  // plantsCount = ;

  return (
    <div>
      {/*
      ⚙️ Here is an example UI that displays and sets the purpose in your smart contract:
    */}
      <Shop
        readContracts={readContracts}
        writeContracts={writeContracts}
        tx={tx}
        address={address}
        setTransferEvents={setTransferEvents}
      />
    </div>
  );
  // <table style={{ margin: "auto" }}>
  //   <thead>
  //     <tr>
  //       <th>Token</th>
  //       <th>Balance</th>
  //     </tr>
  //   </thead>
  //   <tbody>
  //     <tr>
  //       <td>CRC</td>
  //       <td>{crcBalance ? utils.formatEther(crcBalance) : "..."}</td>
  //     </tr>
  //     <tr>
  //       <td>SEED</td>
  //       <td>{seedBalance ? seedBalance.toNumber() : "..."}</td>
  //     </tr>
  //     <tr>
  //       <td>LAND</td>
  //       <td>{landBalance ? landBalance.toNumber() : "..."}</td>
  //     </tr>
  //     <tr>
  //       <td>Total LAND Supply</td>
  //       <td>{landSupply ? landSupply.toNumber() : "..."}</td>
  //     </tr>
  //     <tr>
  //       <td>FRUIT</td>
  //       <td>{fruitBalance ? utils.formatEther(fruitBalance) : "..."}</td>
  //     </tr>
  //     <tr>
  //       <td>Total FRUIT Supply</td>
  //       <td>{fruitSupply ? utils.formatEther(fruitSupply) : "..."}</td>
  //     </tr>
  //   </tbody>
  // </table>
}
