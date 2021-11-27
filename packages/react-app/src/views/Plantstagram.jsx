import { SyncOutlined } from "@ant-design/icons";
import { utils, BigNumber } from "ethers";
import { Button, Card, DatePicker, Divider, Input, Progress, Slider, Spin, Switch } from "antd";
import React, { useState } from "react";
import { Address, Balance, Events, SendPrizeEvents } from "../components";
import {
  useContractLoader,
  useContractReader,
  useUserProviderAndSigner,
  useOnBlock,
} from "eth-hooks";

import plantBasePng from'../assets/nftportplantbase.png';
const NFTPortContract = '0x6FE73BAcF4b6fd86D5711dEBae714EBEF0f338C0';
const _NFTPORT_API_KEY = 'ee53d0a8-345c-4655-86ac-41554d5ba968';

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


export default function Plantstagram({
  address,
  tx,
  readContracts,
  writeContracts,
}) {
  function draw(dna) {
    const ctx = document.getElementById('canvas').getContext('2d');
    const img = new Image();
    img.src = plantBasePng;
    ctx.drawImage(img, 0, 0);
    ctx.font = '30px PressStart2P';
    ctx.fillText((newDna == "00" ? dna : newDna), 68, 125);
    ctx.fillText(('0000' + newPlantId).slice(-4), 128, 365);
  }
  function mint() {
    // 1. Upload file to IPFS
    const canvas = document.getElementById('canvas');

    canvas.toBlob(async (blob) => {
      let url = 'https://api.nftport.xyz/v0/files';
      const formData = new FormData();
      formData.append('file', blob, `plantstagram-${newPlantId}.png`);
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': _NFTPORT_API_KEY,
        },
        body: formData
      });
      const fileRespJson = await response.json();
      console.log('posted img blog to ipfs: ', fileRespJson);
      setImgIsSaved(true);

      // 2. Create metadata on IPFS
      url = 'https://api.nftport.xyz/v0/metadata';
      const attr = `"attributes": [ { "trait_type": "DNA", "value": "${newDna}" } ]`;
      const metadataJson = `{ "name": "Plantstagram ${newPlantId}", "description": "Plantstagram #${newPlantId}", "file_url": "${fileRespJson.ipfs_url}", ${attr} }`;
      const metadataResponse = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': _NFTPORT_API_KEY,
          'Content-Type': 'application/json',
        },
        body: metadataJson
      });
      // TODO check errors
      const metadataRespJson = await metadataResponse.json();
      if (metadataRespJson.response != 'OK') {
        setNewMintErr(metadataRespJson.error);
      }
      console.log('posted metadata: ', metadataRespJson);
      setMetadataIsSaved(true);

      // 3. Finally mint NFT
      url = 'https://api.nftport.xyz/v0/mints/customizable';
      const chain = 'polygon';
      const nftJson = `{ "chain": "${chain}", "contract_address": "${NFTPortContract}", "metadata_uri": "${metadataRespJson.metadata_uri}", "mint_to_address": "${address}", "token_id": "${1024+newPlantId}" }`;
      const nftResponse = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': _NFTPORT_API_KEY,
          'Content-Type': 'application/json',
        },
        body: nftJson
      });
      // TODO check errors
      const nftRespJson = await nftResponse.json();
      if (nftRespJson.response == 'NOK') {
        setNewMintErr(nftRespJson.error);
      }
      console.log('posted nft: ', nftRespJson);
      setNftIsMinted(true);

      setNewOSUrl(`https://opensea.io/assets/${NFTPortContract}/${newPlantId}`);
      setNewTxUrl(nftRespJson.transaction_external_url);
    });
  }

  const [newPlantId, setNewPlantId] = useState(1);
  const [errNum, setErrNum] = useState(false);
  const [isDrawn, setIsDrawn] = useState(false);
  const [imgIsSaved, setImgIsSaved] = useState(false);
  const [metadataIsSaved, setMetadataIsSaved] = useState(false);
  const [nftIsMinted, setNftIsMinted] = useState(false);
  const [newMintErr, setNewMintErr] = useState('OK');
  const [newOSUrl, setNewOSUrl] = useState('#');
  const [newDna, setNewDna] = useState("00");
  const [newTxUrl, setNewTxUrl] = useState("");

  return (
    <div>
      <h1>NFTPort Plantstagram</h1>
      <div className="nes-container with-title " style={{marginTop: 20, marginBottom: 50}}>
        <div>Minting NFT to: {address}</div>
      </div>

      <h2>NFT Image on IPFS</h2>
      <canvas id='canvas' width='390' height='430' ></canvas>
      <img src={plantBasePng} width='50' />
      <span>Look up your Plant by tokenId:</span>
      <Input value={newPlantId} style={{ width: 250, fontSize: 42 }}
            onChange={e => {
              try {
                setErrNum(false);
                let n = parseInt(e.target.value);
                if (isNaN(n)) {
                  console.log('NaN for ', e.target.value);
                  n = 0;
                }
                if (n < 0) {
                  console.log(`${n} is out of range`);
                  setErrNum(true);
                } else {
                  setNewPlantId(n);
                }
              } catch(err) {
                setErrNum(true);
                console.log("BAD INPUT! ", e.target.vaue);
              }
            }}
      />
      <button className='nes-btn is-warning' onClick={async () => {
        const plantState = await readContracts.Plant.state(newPlantId);
        console.log(plantState);
        setNewDna(plantState.dna.toString(16));

        setIsDrawn(true); draw(plantState.dna.toString(16));
      }} >look up plantId</button>
      <button className={'nes-btn is-' + (isDrawn ? 'success' : 'disabled')} onClick={() => mint()} >mint</button>

      <h3>{newMintErr}</h3>
      <h3>IMG saved: {imgIsSaved ? 'Yes' : 'No'}</h3>
      <h3>metadata saved: {metadataIsSaved ? 'Yes' : 'No'}</h3>
      <h3>NFT minted: {nftIsMinted ? 'Yes' : 'No'}</h3>
      <h2>View on OpenSea</h2>
      <a href={newOSUrl} target="_blank">link to #{newPlantId}</a>
      <a href={newTxUrl} target="_blank">link to polygonscan transaction</a>
    </div>
  );
}

