import { utils } from "ethers";
import { Button, Divider, Input } from "antd";
import React, { useState } from "react";
import {
  useContractReader,
} from "eth-hooks";

const POLL_TIME = 15000;

const fmtEth = utils.formatEther;
const parseEth = utils.parseEther;


function _onUpdate(update) {
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

/*
function FMaticOut({ fruitIn, readContracts, }) {
  const fmaticOut = useContractReader(readContracts, "Fruniswap", "getAmountOutForFruitIn", [parseEth(fruitIn)]);
  return (<span>{fmaticOut ? fmtEth(fmaticOut) : '...'}</span>);
}
*/
export default function PlantaWallet({
  address,
  tx,
  readContracts,
  writeContracts,
}) {
  const fruitBalance = useContractReader(readContracts, "Fruit", "balanceOf", [address], POLL_TIME);
  const fmaticBalance = useContractReader(readContracts, "FMatic", "balanceOf", [address], POLL_TIME);
  const plantBalance = useContractReader(readContracts, "Plant", "balanceOf", [address], POLL_TIME);
  const landBalance = useContractReader(readContracts, "Land", "balanceOf", [address], POLL_TIME);

  return (
    <div className="nes-container is-rounded is-dark with-title">
      <p className="title">Bank Account</p>
      <div style={{maxWidth: 350, width: '50%', display: 'inline-block'}}>
        <div>FRUIT {fruitBalance && fmtEth(fruitBalance)}</div>
        <div>FMATIC {fmaticBalance && fmtEth(fmaticBalance)}</div>
        <div>Plants {plantBalance && plantBalance.toString()}</div>
        <div>Land {landBalance && landBalance.toString()}</div>
      </div>
      <div style={{maxWidth: 350, width: '50%', display: 'inline-block', verticalAlign: 'top'}}>
        <Button
         style={{ marginTop: 8, marginBottom: 8 }}
         onClick={async () => {
           const result = tx(writeContracts.Fruit.freeFruit(), _onUpdate);
           console.log(await result);
         }}
        >
          Free Fruit
        </Button>
        <Button
         style={{ marginTop: 8, marginBottom: 8 }}
         onClick={async () => {
           const result = tx(writeContracts.FMatic.freeFMatic(), _onUpdate);
           console.log(await result);
         }}
        >
          Free FMatic
        </Button>
      </div>
    </div>
  );
}
