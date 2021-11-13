//SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;
import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import { ERC721Enumerable } from "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
import { Counters } from "@openzeppelin/contracts/utils/Counters.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract Land is ERC721, ERC721Enumerable, Ownable {

  using Counters for Counters.Counter;
  mapping(uint16 => uint8) private _species;
  struct LandProp {
    uint8 species;
    Counters.Counter burns;
    uint256 plantTokenId;
  }
  mapping(uint16 => LandProp) private landProps;

uint fee = 0.0005 ether; // fee in Matic Token
  constructor() public ERC721("Land", "Land") {
   // _setBaseURI("https://ipfs.io/ipfs/");
  }

  uint256[4] private _mapMinted = [0,0,0,0];// Example: [2**256 - 0xFFFF, 0xF0F, 255, 1023];
  uint256[4] private _mapPlanted = [0,0,0,0];//2**256 - 0x0f0f0f0f0f0f0f0f, 0xFFFF, 1024, 2**256-1];
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
    landProps[landTokenId].species = _newSpecies();
    // _setTokenURI(id, tokenURI);

    return landTokenId;
  }
  // Returns 0-7 using entropy from blockhash but after ~85 (1/3 of 255) mints per block entropy will collide
  function _newSpecies() public view returns (uint8) {
    // Cycle through supply which increases per mint even w/in a block,
    // get a number from 0 to 84 (84*3=252) and shift to get 3 lsb by masking 0b111
    return uint8((uint256(blockhash(block.number - 1)) >> (uint16(3) * uint16(totalSupply()) % 85)) & uint8(0x7));
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
    landProps[landTokenId].plantTokenId = plantTokenId;
    // TODO coordinate with Plant contract when implanting/unplanting
  }
  // Reverse of implant.
  function handleBurn(uint16 landTokenId) public {
    require(isPlanted(landTokenId), "Land had no Plant");
    clearPlanted(landTokenId);
    // NOTE: landProps.plantTokenId remains, it does not become 0 (a valid tokenId)
    landProps[landTokenId].burns.increment();
  }
  // Returns a plantTokenId but will is UNDEFINED if unplanted. Check isPlanted.
  function plantByLand(uint16 landTokenId) public view returns (uint256) {
    return landProps[landTokenId].plantTokenId;
  }
  // Returns list of landTokenIds, isPlanted status, plantTokenIds if land isPlanted (o/w undefined)
  function landOverviewByAddress(address addr) external view returns (uint16[] memory, bool[] memory, uint256[] memory) {
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
  // Returns list of landTokenIds, species, and burns count
  function landDetailsByAddress(address addr) external view returns (uint16[] memory, uint8[] memory, uint32[] memory) {
    uint16 balance = uint16(balanceOf(addr));
    uint16[] memory landTokenIds = new uint16[](balance);
    uint8[] memory species = new uint8[](balance);
    uint32[] memory burns = new uint32[](balance);
    for (uint16 i; i < balance; i++) {
      landTokenIds[i] = uint16(tokenOfOwnerByIndex(addr, i));
      species[i] = landProps[landTokenIds[i]].species;
      burns[i] = uint32(landProps[landTokenIds[i]].burns.current());
    }
    return (landTokenIds, species, burns);
  }
  // Returns (landTokenIds, owners, isMinteds, isPlanteds, plantTokenIds) - split functions because stack limit
  // The arrays represent a square of the land +/- distance from given id in x/y coordinates, from top/left.
  function landOverviewByDistance(uint16 landTokenId, uint8 distance) external view returns (uint16[] memory, address[] memory, bool[] memory, bool[] memory, uint256[] memory) {
    uint16 length = distance + 1 + distance;
    int16 _id = int16(landTokenId);
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
  // Returns  (landTokenIds, species, burns)
  // The arrays represent a square of the land +/- distance from given id in x/y coordinates, from top/left.
  function landDetailsByDistance(uint16 landTokenId, uint8 distance) external view returns (uint16[] memory, uint8[] memory, uint32[] memory) {
    uint16 length = distance + 1 + distance;
    int16 _id = int16(landTokenId); // Prevents: CompilerError: Stack too deep, try removing local variables.
    int8 _dist = int8(distance);
    // Return land as a helper. Ids are predictable and sequential based on function args.
    uint16[] memory landTokenIds = new uint16[](length**2);
    uint8[] memory species = new uint8[](length**2);
    uint32[] memory burns = new uint32[](length**2);
    uint16 i = 0;
    for (int16 y = _id / 32 - _dist; y <= _id / 32 + _dist; y++) {
      for (int16 x = _id % 32 - _dist; x <= _id % 32 + _dist; x++) {
        if (y >= 0 && y < 32 && x >= 0 && x < 32) {
          landTokenIds[i] = uint16(y * 32 + x);
          species[i] = landProps[landTokenIds[i]].species;
          burns[i] = uint32(landProps[landTokenIds[i]].burns.current());
        }
        i++; // when distance is off map then array value is initial/undefined
      }
    }
    return (landTokenIds, species, burns);
    
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
