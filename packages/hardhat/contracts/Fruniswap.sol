pragma solidity =0.6.6;

//import { ERC721 } from "@openzeppelin/contracts/token/ERC721/ERC721.sol";

import '@uniswap/v2-periphery/contracts/libraries/UniswapV2Library.sol';
import '@uniswap/v2-periphery/contracts/interfaces/IERC20.sol';
import '@uniswap/v2-core/contracts/interfaces/IUniswapV2Pair.sol';
import '@uniswap/v2-periphery/contracts/libraries/SafeMath.sol';

//import "@openzeppelin/contracts/access/Ownable.sol"; 

contract Fruniswap {
  using SafeMath  for uint;

  constructor() public {
    // what should we do on deploy?
  }

  IUniswapV2Pair private v2pair;
  IERC20 public token0; // fruit
  IERC20 public token1; // fmatic
  
  function initialize(address _v2pair) public /* TODO onlyOwner*/ {
    v2pair = IUniswapV2Pair(_v2pair);
    token0 = IERC20(v2pair.token0());
    token1 = IERC20(v2pair.token1());
  }

  function getAmountOutForFruitIn(uint amountIn) public view returns (uint amountOut) {
    (uint112 r0, uint112 r1, ) = v2pair.getReserves();
    return UniswapV2Library.getAmountOut(amountIn, r0, r1);
  }

  function swap(uint fruitIn) public returns (uint) {
    token0.transferFrom(msg.sender, address(v2pair), fruitIn);
    // swap(uint amount0Out, uint amount1Out, address to, bytes calldata data);
    uint fmaticOut = getAmountOutForFruitIn(fruitIn);
    v2pair.swap(0, fmaticOut, address(this), "");
    // receive less 0.3% fee
    token1.transfer(msg.sender, fmaticOut);

    return fmaticOut;
  }
  /*
  function sortTokens() public view returns (address, address) {
    return UniswapV2Library.sortTokens(address(token0), address(token1));
  }
  */
}

