import { SyncOutlined } from "@ant-design/icons";
import { utils } from "ethers";
import { Button, Card, DatePicker, Divider, Input, List, Progress, Slider, Spin, Switch } from "antd";
import React, { useState } from "react";
import { Address, Balance } from "../components";
import {
  useContractLoader,
  useContractReader,
  useUserProviderAndSigner,
} from "eth-hooks";

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

function FMaticOut({ fruitIn, readContracts, }) {
  const fmaticOut = useContractReader(readContracts, "Fruniswap", "getAmountOutForFruitIn", [parseEth(fruitIn)]);
  return (<span>{fmaticOut ? fmtEth(fmaticOut) : '...'}</span>);
}
export default function PairSwap({
  address,
  mainnetProvider,
  localProvider,
  yourLocalBalance,
  price,
  tx,
  readContracts,
  writeContracts,
}) {
  const [newFruitAmount, setNewFruitAmount] = useState("1");
  const [newFMaticAmount, setNewFMaticAount] = useState(parseEth("0"));
  const reserves = useContractReader(readContracts, "UniswapV2Pair", "getReserves");
  const fruitBal = useContractReader(readContracts, "Fruit", "balanceOf", [address]);
  const fmaticBal = useContractReader(readContracts, "FMatic", "balanceOf", [address]);
  const fruniswapFruitAllow = useContractReader(readContracts, "Fruit", "allowance", [address, writeContracts.Fruniswap.address]);
  const fruniswapFMaticAllow = useContractReader(readContracts, "FMatic", "allowance", [address, writeContracts.Fruniswap.address]);


  return (
    <div>
      {/*
        ⚙️ Here is an example UI that displays and sets the purpose in your smart contract:
      */}
      <div style={{ border: "1px solid #cccccc", padding: 16, width: 400, margin: "auto", marginTop: 64 }}>
        <div style={{ margin: 8 }}>
          <div>
            <h2>Reserves</h2>
            {reserves ? `FRUIT: ${utils.formatEther(reserves[0])} / FMATIC: ${utils.formatEther(reserves[1])}` : '...'}
            <Divider />
            <h2>Your Balances</h2>
            <div>FRUIT: {fruitBal ? fmtEth(fruitBal) : '...'}</div>
            <div>FMATIC: {fmaticBal ? fmtEth(fmaticBal) : '...'}</div>
            <Divider />
            <h2>FRUNISWAP</h2>
    {/*    <div>
            1 FRUIT gets {reserves ? utils.formatEther( reserves[1].sub(reserves[0].mul(reserves[1]).div(reserves[0].add(utils.parseEther("1")))) ) : ''} FMATIC
    </div> */}
            <div>
              {newFruitAmount} FRUIT gets <FMaticOut fruitIn={newFruitAmount} readContracts={readContracts} /> FMATIC
            </div>
          </div>
          <Input
            value={newFruitAmount}
            onChange={async(e) => {
              try {
                parseEth(e.target.value);
                setNewFruitAmount(e.target.value);

                setNewFMaticAount(await readContracts.Fruniswap.getAmountInForFruitOut(parseEth(e.target.value)));
                console.log(x);
              } catch(err) {
              }
            }}
          />
          <div>
            check FRUIT allowance {fruniswapFruitAllow ? fmtEth(fruniswapFruitAllow) : '...'} &gt;= {newFruitAmount}
          </div>
          <Button
            style={{ marginTop: 8 }}
            onClick={async () => {
              const result = tx(writeContracts.Fruit.approve(writeContracts.Fruniswap.address, parseEth(newFruitAmount)), _onUpdate);
              console.log("awaiting metamask/web3 confirm result...", result);
              console.log(await result);
            }}
          >
            Approve Fruit
          </Button>
          <Button
            style={{ marginTop: 8 }}
            onClick={async () => {
              const result = tx(writeContracts.Fruniswap.sellFruit(parseEth(newFruitAmount)), _onUpdate);
              console.log("awaiting metamask/web3 confirm result...", result);
              console.log(await result);
            }}
          >
            Sell Fruit
          </Button>
        </div>
        <Divider />
        <div>
          <div>
            check FMATIC allowance {fruniswapFMaticAllow ? fmtEth(fruniswapFMaticAllow) : '...'} &gt;= {fmtEth(newFMaticAmount)} (cost in FMATIC to buy FRUIT amount entered)
          </div>
          <Button
            style={{ marginTop: 8 }}
            onClick={async () => {
              const result = tx(writeContracts.FMatic.approve(writeContracts.Fruniswap.address, newFMaticAmount), _onUpdate);
              console.log("awaiting metamask/web3 confirm result...", result);
              console.log(await result);
            }}
          >
            Approve FMATIC
          </Button>
          <Button
            style={{ marginTop: 8 }}
            onClick={async () => {
              const result = tx(writeContracts.Fruniswap.buyFruit(parseEth(newFruitAmount)), _onUpdate);
              console.log("awaiting metamask/web3 confirm result...", result);
              console.log(await result);
            }}
          >
            Buy Fruit
          </Button>
        </div>
        <Divider />
      </div>
    </div>
  );
}
