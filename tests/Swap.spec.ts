import chai, { expect } from "chai";
import asPromised from "chai-as-promised";
import * as dotenv from "dotenv";
dotenv.config();
// @ts-ignore
import {
  KoriClaim,
  KoriSwap,
  KoriToken,
  KoriWrapper,
  PancakeERC20,
  PancakeFactory,
  PancakePair,
  PancakeRouter,
} from "../typechain";
// @ts-ignore
import { ethers, waffle } from "hardhat";
import { BigNumber, constants, Contract, utils } from "ethers";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import deploy from "../utils/deployed";
import pairJson from "../artifacts/contracts/pancake/PancakePair.sol/PancakePair.json";

chai.use(asPromised);

describe("Swap", () => {
  let deployer: SignerWithAddress;
  let guest: SignerWithAddress;
  let admin: SignerWithAddress;

  let token: KoriToken;
  let token2: KoriToken;
  let weth: KoriWrapper;
  let factory: PancakeFactory;
  let pair: Contract;
  let router: PancakeRouter;
  let swap: KoriSwap;

  beforeEach(async () => {
    [deployer, guest, admin] = await ethers.getSigners();
    token = await deploy.token(deployer, "Kori 1", "KORI", 100000);
    token2 = await deploy.token(deployer, "Kori 2", "KORI2", 100000);
    weth = await deploy.wrapper(deployer);
    factory = await deploy.pancakeFactory(deployer, admin.address);
    await factory.createPair(token.address, token2.address);
    const addressPair = await factory.getPair(token.address, token2.address);
    pair = new Contract(
      addressPair,
      JSON.stringify(pairJson.abi),
      waffle.provider
    ).connect(deployer);
    router = await deploy.pancakeRouter(
      deployer,
      factory.address,
      weth.address
    );
    swap = await deploy.swap(
      deployer,
      admin.address,
      admin.address,
      router.address
    );
  });

  const addLiquidity = async (
    token0Amount: BigNumber,
    token1Amount: BigNumber
  ) => {
    await token.transfer(pair.address, token0Amount);
    await token2.transfer(pair.address, token1Amount);
    await pair.mint(deployer.address);
  };

  it("swap exact tokens for tokens", async () => {
    const token0Amount = utils.parseEther("5");
    const token1Amount = utils.parseEther("10");
    const swapAmount = utils.parseEther("1");
    // const expectedOutputAmount = BigNumber.from("1662497915624478906");
    await addLiquidity(token0Amount, token1Amount);
    await token.approve(router.address, constants.MaxUint256);

    const tx = await router.swapExactTokensForTokens(
      swapAmount,
      0,
      [token.address, token2.address],
      deployer.address,
      constants.MaxUint256
    );
    const receipt = await tx.wait();
    expect(receipt.status).eq(1);
  });
});
