//SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;
import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import { ERC721Enumerable } from "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
import { Counters } from "@openzeppelin/contracts/utils/Counters.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract Land is ERC721, ERC721Enumerable, Ownable {

  using Counters for Counters.Counter;
  mapping(uint16 => Counters.Counter) private _burns;

uint fee = 0.0005 ether; // fee in Matic Token
  constructor() public ERC721("Land", "Land") {
   // _setBaseURI("https://ipfs.io/ipfs/");
  }

  uint256[4] private _mapMinted = [0,0,0,0];// Example: [2**256 - 0xFFFF, 0xF0F, 255, 1023];
  uint256[4] private _mapPlanted = [0,0,0,0];//2**256 - 0x0f0f0f0f0f0f0f0f, 0xFFFF, 1024, 2**256-1];
  mapping(uint16 => uint256) private _land2plant;
  mapping  (address => uint) public feeBalance;

modifier hasFee() {
        require(msg.value >= fee ,"must pay fee");
        feeBalance[msg.sender]=msg.value;
        _;
    }

  function mintAt(address to, uint16 landTokenId) public payable  hasFee returns (uint16){
    // TODO need to pay to mint
    require(!isMinted(landTokenId), "Land is already minted");
    _mint(to, landTokenId);
    setMinted(landTokenId);
    // _setTokenURI(id, tokenURI);

    return landTokenId;
  }

  function changeFee (uint newFee ) public onlyOwner {
	  fee = newFee;
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
  function clearPlanted(uint16 landTokenId) public {
    _mapPlanted[intIdx(landTokenId)] &= ~(uint16(1) << bitIdx(landTokenId));
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
    _land2plant[landTokenId] = plantTokenId;
    // TODO coordinate with Plant contract when implanting/unplanting
  }
  // Reverse of implant.
  function handleBurn(uint16 landTokenId) public {
    // remove above mapping
    require(isPlanted(landTokenId), "Land had no Plant");
    clearPlanted(landTokenId);
    delete(_land2plant[landTokenId]);
    _burns[landTokenId].increment();
  }
  // Returns a plantTokenId but will return 0 if unplanted. Check isPlanted.
  function plantByLand(uint16 landTokenId) public view returns (uint256) {
    return _land2plant[landTokenId];
  }
  // Returns list of landTokenIds, isPlanted status, and plantTokenIds if land isPlanted
  function landInfoByAddress(address addr) external view returns (uint16[] memory, bool[] memory, uint256[] memory) {
    uint16 balance = uint16(balanceOf(addr));
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
  // will return a square of the land +/- distance from given id in x/y coordinates
  function landInfoByDistance(uint16 landTokenId, uint8 distance) external view returns (uint16[] memory, address[] memory, bool[] memory, bool[] memory, uint256[] memory) {
    uint16 length = distance + 1 + distance;
    int16 _id = int16(landTokenId); // Prevents: CompilerError: Stack too deep, try removing local variables.
    int8 _dist = int8(distance);
    // Return land as a helper. Ids are predictable and sequential based on function args.
    uint16[] memory landTokenIds = new uint16[](length**2);
    address[] memory owners = new address[](length**2);
    bool[] memory isMinteds = new bool[](length**2);
    bool[] memory isPlanteds = new bool[](length**2);
    uint256[] memory plantTokenIds = new uint256[](length**2);
    uint16 i = 0;
    for (int16 y = _id / 32 - _dist; y <= _id / 32 + _dist; y++) {
      for (int16 x = _id % 32 - _dist; x <= _id % 32 + _dist; x++) {
        if (y >= 0 && y < 32 && x >= 0 && x < 32) {
          landTokenIds[i] = uint16(y * 32 + x);
          isMinteds[i] = isMinted(landTokenIds[i]);
          owners[i] = isMinteds[i] ? ownerOf(landTokenIds[i]) : address(0);
          isPlanteds[i] = isPlanted(landTokenIds[i]);
          plantTokenIds[i] = plantByLand(landTokenIds[i]);
        }
        i++; // when distance is off map then array value is initial/undefined
      }
    }
    return (landTokenIds, owners, isMinteds, isPlanteds, plantTokenIds);
    
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
