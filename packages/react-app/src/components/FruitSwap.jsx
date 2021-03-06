import { utils } from "ethers";
import { Button, Divider, Input } from "antd";
import React, { useState } from "react";
import { useContractReader } from "eth-hooks";

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

function FMaticOut({ fruitIn, readContracts }) {
  const fmaticOut = useContractReader(readContracts, "Fruniswap", "getAmountOutForFruitIn", [parseEth(fruitIn)], POLL_TIME);
  return <span>{fmaticOut ? fmtEth(fmaticOut) : "..."}</span>;
}

export default function FruitSwap({ address, tx, readContracts, writeContracts }) {
  const [newFruitAmount, setNewFruitAmount] = useState("1");
    const [fruitIn, setFruitIn] = useState("1");
  const [newFMaticAmount, setNewFMaticAount] = useState(parseEth("0"));
  const fruniswapFruitAllow = useContractReader(readContracts, "Fruit", "allowance", [
    address,
    writeContracts.Fruniswap.address,
  ], POLL_TIME);
  const fruniswapFMaticAllow = useContractReader(readContracts, "FMatic", "allowance", [
    address,
    writeContracts.Fruniswap.address,
  ], POLL_TIME);
  const fmaticOut = useContractReader(readContracts, "Fruniswap", "getAmountOutForFruitIn", [parseEth(newFruitAmount)], POLL_TIME);

  return (
    <div>
      {/*
        ⚙️ Here is an example UI that displays and sets the purpose in your smart contract:
      */}
      <div style={{}}>
        <div>
          <div>
            {newFruitAmount} FRUIT gets <span>{fmaticOut ? fmtEth(fmaticOut) : "..."}</span> FMATIC
          </div>
        </div>
        <Input
        placeholder="Enter Number of Fruits"
          defaultValue={newFruitAmount}
          onChange={async e => {
            try {
              parseEth(e.target.value);
              setNewFruitAmount(e.target.value);

            } catch (err) {}}}
        />
        {/*
          <div>
            check FRUIT allowance {fruniswapFruitAllow ? fmtEth(fruniswapFruitAllow) : '...'} &gt;= {newFruitAmount}
          </div>
     */}
        {fruniswapFruitAllow > 0 ? (
          <Button
            className="nes-btn is-error"
            style={{ marginTop: 8 }}
            onClick={async () => {
              const result = tx(writeContracts.Fruniswap.sellFruit(parseEth(newFruitAmount)), _onUpdate);
              console.log(await result);
            }}
          >
            Sell Fruit
          </Button>
        ) : (
          <Button
            style={{ marginTop: 8 }}
            onClick={async () => {
              const result = tx(
                writeContracts.Fruit.approve(writeContracts.Fruniswap.address, parseEth(newFruitAmount)),
                _onUpdate,
              );
              console.log(await result);
            }}
          >
            Approve Fruit
          </Button>
        )}
      </div>
      <div>
        {/*
          <div>
            check FMATIC allowance {fruniswapFMaticAllow ? fmtEth(fruniswapFMaticAllow) : '...'} &gt;= {fmtEth(newFMaticAmount)} (cost in FMATIC to buy FRUIT amount entered)
          </div>
     */}
        {fruniswapFMaticAllow > 0 ? (
          <Button
            className="nes-btn is-success"
            style={{ marginTop: 8 }}
            onClick={async () => {
              console.log(fmtEth(newFMaticAmount));
              const result = tx(writeContracts.Fruniswap.buyFruit(parseEth(newFruitAmount)), _onUpdate);
              console.log("awaiting metamask/web3 confirm result...", result);
              console.log(await result);
            }}
          >
            Buy Fruit
          </Button>
        ) : (
          <Button
            style={{ marginTop: 8 }}
            onClick={async () => {
              const result = tx(
                writeContracts.FMatic.approve(writeContracts.Fruniswap.address, parseEth("10000") /*newFMaticAmount*/),
                _onUpdate,
              );
              console.log("awaiting metamask/web3 confirm result...", result);
              console.log(await result);
            }}
          >
            Approve FMATIC
          </Button>
        )}
      </div>
    </div>
  );
}
/*
{async e => {
  try {
    parseEth(e.target.value);
    setNewFruitAmount(e.target.value);

    setNewFMaticAount(await readContracts.Fruniswap.getAmountInForFruitOut(parseEth(e.target.value)));
    console.log(x);
  } catch (err) {}
}}

<FMaticOut fruitIn={newFruitAmount} readContracts={readContracts} />
*/
