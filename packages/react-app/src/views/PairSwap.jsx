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
  console.log(readContracts);
  const [newFruitAmount, setNewFruitAmount] = useState("loading...");
  const reserves = useContractReader(readContracts, "UniswapV2Pair", "getReserves");
  const fmaticOut = useContractReader(readContracts, "Fruniswap", "getAmountOutFor1FruitIn");
  const fruniswapFruitAllow = useContractReader(readContracts, "Fruit", "allowance", [address, writeContracts.Fruniswap.address]);


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
            {/*
            <h2>x*y=k</h2>
            <code>
            (x+1)(y-n)=x*y
                  y-n =x*y/(x+1)
                   -n =x*y/(x+1) - y
                    n = y - x*y/(x+1)
            </code> */}
    <div>
            1 FRUIT gets {reserves ? utils.formatEther( reserves[1].sub(reserves[0].mul(reserves[1]).div(reserves[0].add(utils.parseEther("1")))) ) : ''} FMATIC
    </div>
    <div>
            1 FRUIT gets {fmaticOut ? fmtEth(fmaticOut) : ''} FMATIC
    </div>
          </div>
          <Input
            onChange={e => {
              setNewFruitAmount(e.target.value);
            }}
          />
    <div>check {fruniswapFruitAllow ? fmtEth(fruniswapFruitAllow) : '...'} &gt;= {newFruitAmount} </div>
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
              const result = tx(writeContracts.Fruniswap.swap(parseEth(newFruitAmount)), _onUpdate);
              console.log("awaiting metamask/web3 confirm result...", result);
              console.log(await result);
            }}
          >
            Sell Fruit
          </Button>
        </div>
        <Divider />
      </div>
    </div>
  );
}
