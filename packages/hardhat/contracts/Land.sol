// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/utils/Counters.sol";

contract Land is ERC721URIStorage {
    using Counters for Counters.Counter;
    Counters.Counter private _tokenIds;


    uint Fee = 0.005 ether ;
    constructor() ERC721("Land", "Land") {}


    modifier fee() {
    require(msg.value == Fee, "must pay fee");
    _;
    }
    function mint(string memory tokenURI) public payable fee returns (uint256){
       
        _tokenIds.increment();
        uint256 newLandId = _tokenIds.current();
         require (newLandId > 1024, "land has reached Max");
        _mint(msg.sender, newLandId);
        _setTokenURI(newLandId, tokenURI);
        return newLandId;
    }
    
}