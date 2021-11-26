import React, { useState } from "react";
import { utils } from "ethers";
import { Button, Card, Col, Collapse, Space } from "antd";
import { FruitSwap, PlantaWallet } from "../components/";

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
};

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
  // const allowanceEther = utils.formatEther(fruitAllowance);
  const [approveBtnStr, setApproveBtnStr] = useState("Approve");

  return (
    <div>
      {fruitAllowance > 0 ? (
        setDisplayBuyPlantBtn(true)
      ) : (
        <Button
          style={{ marginTop: 8, marginBottom: 8 }}
          onClick={async () => {
            setApproveBtnStr("loading...");

            const result = tx(
              writeContracts.Fruit.approve(
                plantAddress,
                "0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff",
              ),
              _onUpdate,
            );
            console.log("awaiting metamask/web3 confirm result...", result);
            console.log(await result);
            setApproveBtnStr("Approve");
          }}
        >
          {approveBtnStr}
        </Button>
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
  const [displayBuyPlantBtn, setDisplayBuyPlantBtn] = useState(false);
  const [buyPlantStr, setBuyPlantStr] = useState("");

  const seedPrice = useContractReader(readContracts, "Plant", "currentPrice");
  const fruitBalance = useContractReader(readContracts, "Fruit", "balanceOf", [address]);
  let displayApproveBtn = false;

  return (
    <div className="nes-container is-rounded is-dark with-title">
      <p className="title">Market</p>

      <div
        className="nes-container is-rounded is-dark with-title"
        style={{ maxWidth: 400, display: "inline-block", verticalAlign: "top" }}
      >
        <p className="title">Fruit</p>
        {writeContracts.Fruit != undefined ? (
          <FruitSwap address={address} tx={tx} writeContracts={writeContracts} readContracts={readContracts} />
        ) : (
          ""
        )}
      </div>
      <div
        className="nes-container is-rounded is-dark with-title"
        style={{ maxWidth: 400, display: "inline-block", verticalAlign: "top" }}
      >
        <p className="title">Seed</p>
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
        <h6 style={{ color: "white" }}>{buyPlantStr}</h6>
        <div>Price: {seedPrice ? utils.formatEther(seedPrice) : "loading..."} FRUIT</div>
      </div>
      <div
        className="nes-container is-rounded is-dark with-title"
        style={{ maxWidth: 400, display: "inline-block", verticalAlign: "top" }}
      >
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
  return (
    <div>
      {/*
      ⚙️ Here is an example UI that displays and sets the purpose in your smart contract:
    */}

      {writeContracts.Fruit != undefined ? (
        <PlantaWallet readContracts={readContracts} writeContracts={writeContracts} tx={tx} address={address} />
      ) : (
        ""
      )}
      <Shop
        readContracts={readContracts}
        writeContracts={writeContracts}
        tx={tx}
        address={address}
        setTransferEvents={setTransferEvents}
      />
    </div>
  );
}
