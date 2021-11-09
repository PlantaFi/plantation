//SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;
import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/utils/Counters.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract Land is ERC721, Ownable {
  using Counters for Counters.Counter;
  Counters.Counter private _tokenIds;

  constructor() public ERC721("Land", "Land") {
   // _setBaseURI("https://ipfs.io/ipfs/");
  }

  function mintItem(address to /*, string memory tokenURI*/)
      public
      onlyOwner
      returns (uint256)
  {
      _tokenIds.increment();

      uint256 id = _tokenIds.current();
      _mint(to, id);
     // _setTokenURI(id, tokenURI);

      return id;
  }

  uint256[4] private _mapMinted = [2**256 - 0xFFFF, 0xF0F, 255, 1023];
  uint256[4] private _mapPlanted = [2**256 - 0x0f0f0f0f0f0f0f0f, 0xFFFF, 1024, 2**256-1];

  // 0b0000... 0001 <- most sig 32 bits of 256 is 1st row
  //   01010...0000 <- next 32 bits, 2nd row... 4 rows of 32 for _mapMinted[0]
  function intIdx(uint16 landTokenId) public view returns (uint8) {
    require(landTokenId < 1024);
    return uint8(landTokenId / 256);
  }
  function bitIdx(uint16 landTokenId) public view returns (uint8) {
    require(landTokenId < 1024);
    return uint8(landTokenId % 256);
  }
  // Select 1 of 4 ints of 256 bits, mask single bit in relative position, shift to least sig position to compare
  function isMinted(uint16 landTokenId) public view returns (bool) {
    return 1 == (_mapMinted[intIdx(landTokenId)] &
                 (2**255 >> bitIdx(landTokenId))
                ) >> (255 - bitIdx(landTokenId));
  }
  function isPlanted(uint16 landTokenId) public view returns (bool) {
    return 1 == (_mapPlanted[intIdx(landTokenId)] &
                 (2**255 >> bitIdx(landTokenId))
                ) >> (255 - bitIdx(landTokenId));
  }
  // TODO This should be only for internal, permissioned use
  // This makes the bit at position of id be 1. Unsetting to 0 needs another function.
  function setMinted(uint16 landTokenId) public {
    _mapMinted[intIdx(landTokenId)] |= 2**255 >> bitIdx(landTokenId);
  }
  function setPlanted(uint16 landTokenId) public {
    _mapPlanted[intIdx(landTokenId)] |= 2**255 >> bitIdx(landTokenId);
  }

  // returns 1024 bits in order of tokenId where 1 if land there is claimed/owned already
  function mapMinted() external view returns (uint256[4] memory) {
    return _mapMinted;
  }
  // like mapMinted but for locations which are occupied with a plant
  function mapPlanted() external view returns (uint256[4] memory) {
    return _mapPlanted;
  }
  function implant(uint16 landTokenId, uint256 plantTokenId) public {
    // require that the mapping for this landTokenId is empty

    setPlanted(landTokenId);

    // TODO
    // save plantTokenId to mapping for landTokenId
  }
  // Reverse of implant. AKA burn the plant.
  function unplant(uint16 landTokenId, uint256 plantTokenId) public {
    // remove above mapping
  }
  function plantByLand(uint16 landTokenId) public returns (uint256) {
    // return from mapping
    return 1;
  }
  function landInfo(uint16 landTokenId) public view returns (uint16) {
    return 1;
  }
  
}
