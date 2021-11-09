//SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;
import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import { ERC721Enumerable } from "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract Land is ERC721, ERC721Enumerable, Ownable {

  constructor() public ERC721("Land", "Land") {
   // _setBaseURI("https://ipfs.io/ipfs/");
  }

  // TODO initialize to [0, 0, 0, 0]
  uint256[4] private _mapMinted = [2**256 - 0xFFFF, 0xF0F, 255, 1023];
  uint256[4] private _mapPlanted = [2**256 - 0x0f0f0f0f0f0f0f0f, 0xFFFF, 1024, 2**256-1];
  mapping(uint16 => uint256) public land2Plant;

  function mintAt(address to, uint16 landTokenId)
      public
      returns (uint16)
  {
    // TODO need to pay to mint
    require(!isMinted(landTokenId), "Land is already minted");
    _mint(to, landTokenId);
    setMinted(landTokenId);
    // _setTokenURI(id, tokenURI);

    return landTokenId;
  }

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
    require(!isPlanted(landTokenId), "Land is already occupied by Plant");
    // TODO are we allowed by the Plant to plant here?
    setPlanted(landTokenId);
    land2Plant[landTokenId] = plantTokenId;
    // TODO coordinate with Plant contract when implanting/unplanting
  }
  // Reverse of implant. AKA burn the plant.
  function unplant(uint16 landTokenId, uint256 plantTokenId) public {
    // remove above mapping
  }
  function plantByLand(uint16 landTokenId) public view returns (uint256) {
    return land2Plant[landTokenId];
  }
  // Returns list of landTokenIds, isPlanted status, and plantTokenIds if land isPlanted
  function landInfoByAddress(address addr) external view returns (uint16[] memory, bool[] memory, uint256[] memory) {
    uint16 balance = uint16(balanceOf(addr));
    uint16 count;
    uint16[] memory landTokenIds = new uint16[](balance);
    bool[] memory isPlanteds = new bool[](balance);
    uint256[] memory plantTokenIds = new uint256[](balance);
    for (uint16 i; i < balance; i++) {
      landTokenIds[i] = uint16(tokenOfOwnerByIndex(addr, i));
      isPlanteds[i] = isPlanted(landTokenIds[i]);
      plantTokenIds[i] = plantByLand(landTokenIds[i]);
    }
    return (landTokenIds, isPlanteds, plantTokenIds);
  }

  /* --- Other functions --- */

  // The following functions are overrides required by Solidity.

  function _beforeTokenTransfer(address from, address to, uint256 tokenId)
    internal
    override(ERC721, ERC721Enumerable)
  {
    super._beforeTokenTransfer(from, to, tokenId);
  }

  function supportsInterface(bytes4 interfaceId)
    public
    view
    override(ERC721, ERC721Enumerable)
    returns (bool)
  {
    return super.supportsInterface(interfaceId);
  }

}
