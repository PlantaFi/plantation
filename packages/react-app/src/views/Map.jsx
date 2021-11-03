import React, { useState } from "react";

export default function Map({
  purpose
}) {

  return (
    <div>
    {/*
      ⚙️ Here is an example UI that displays and sets the purpose in your smart contract:
    */}
    <div style={{ border: "10px solid #fc8c03", borderRadius: '10px', padding: 16, width: 400, margin: "auto", marginTop: 64, backgroundColor: "lightgray" }}>
     <h1>welcome to Map</h1>
     <h4>purpose: {purpose}</h4>
    </div>
</div>
  );
}
