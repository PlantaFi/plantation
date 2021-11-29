import { PageHeader } from "antd";
import React from "react";

// displays a page header

export default function Header() {
  return (
    <a href="/" >
      <span className="buchs-long-dark" style={{
            fontFamily: "P0T-NOoDLE",
            display: 'inline-block',
            padding: '2px 16px',
            margin: 20,
            color: '#626011',
            fontSize: 48,
            fontWeight: 600,
            lineHeight: '1em',
          }}
      > PLANTATION </span>
    </a>
  );
}
