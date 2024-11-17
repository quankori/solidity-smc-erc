import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { utils, Wallet } from "ethers";
import {
  ClaimHolder,
  ClaimHolder__factory,
  ClaimVerifier,
  ClaimVerifier__factory,
  KoriAirdrop,
  KoriAirdrop__factory,
  KoriClaim,
  KoriClaim__factory,
  KoriIDO,
  KoriIDO__factory,
  KoriLottery,
  KoriLottery__factory,
  KoriSwap,
  KoriSwap__factory,
  KoriToken,
  KoriToken__factory,
  PancakeERC20,
  PancakeERC20__factory,
  PancakeFactory,
  PancakeFactory__factory,
  PancakePair,
  PancakePair__factory,
  PancakeRouter,
  PancakeRouter__factory,
} from "../typechain";
import { KoriMarketplace__factory } from "../typechain/factories/KoriMarketplace__factory";
import { KoriNFT__factory } from "../typechain/factories/KoriNFT__factory";
import { KoriWrapper__factory } from "../typechain/factories/KoriWrapper__factory";
import { KoriMarketplace } from "../typechain/KoriMarketplace";
import { KoriNFT } from "../typechain/KoriNFT";
import { KoriWrapper } from "../typechain/KoriWrapper";
import * as dotenv from "dotenv";
dotenv.config();

const deploy = {
  // Smart contract token
  async token(
    signer: SignerWithAddress | Wallet,
    name: string,
    symbol: string,
    value: number
  ): Promise<KoriToken> {
    return await (
      await new KoriToken__factory(signer).deploy(
        name,
        symbol,
        utils.parseEther(value.toString())
      )
    ).deployed();
  },
  // Smart contract airdrop
  async airdrop(
    signer: SignerWithAddress | Wallet,
    hash: any
  ): Promise<KoriAirdrop> {
    return await (
      await new KoriAirdrop__factory(signer).deploy(hash)
    ).deployed();
  },
  // Smart contract claim
  async claim(
    signer: SignerWithAddress | Wallet,
    tokenClaim: string
  ): Promise<KoriClaim> {
    return await (
      await new KoriClaim__factory(signer).deploy(
        tokenClaim,
        utils.parseEther("20000")
      )
    ).deployed();
  },
  // Smart contract lottery
  async lottery(
    signer: SignerWithAddress | Wallet,
    adminWallet: string,
    addressToken: string
  ): Promise<KoriLottery> {
    return await (
      await new KoriLottery__factory(signer).deploy(adminWallet, addressToken)
    ).deployed();
  },
  // Smart contract nft
  async nft(
    signer: SignerWithAddress | Wallet,
    name: string,
    symbol: string,
    price: number,
    maximun: number,
    adminWallet: string
  ): Promise<KoriNFT> {
    return await (
      await new KoriNFT__factory(signer).deploy(
        name,
        symbol,
        adminWallet,
        utils.parseEther(price.toString()),
        maximun
      )
    ).deployed();
  },
  // Smart contract wrapper
  async wrapper(signer: SignerWithAddress | Wallet): Promise<KoriWrapper> {
    return await (await new KoriWrapper__factory(signer).deploy()).deployed();
  },
  // Smart contract market
  async market(
    signer: SignerWithAddress | Wallet,
    addressToken: string,
    adminWallet: string
  ): Promise<KoriMarketplace> {
    return await (
      await new KoriMarketplace__factory(signer).deploy(
        adminWallet,
        addressToken
      )
    ).deployed();
  },
  // Smart contract claim holder
  async claimHolder(signer: SignerWithAddress | Wallet): Promise<ClaimHolder> {
    return await (await new ClaimHolder__factory(signer).deploy()).deployed();
  },
  // Smart contract claim verify
  async claimVerify(
    signer: SignerWithAddress | Wallet,
    trustedAddress: string
  ): Promise<ClaimVerifier> {
    return await (
      await new ClaimVerifier__factory(signer).deploy(trustedAddress)
    ).deployed();
  },
  // Smart contract IDO
  async ido(
    signer: SignerWithAddress | Wallet,
    tokenIDO: string,
    sweepAddress: string,
    adminWallet: string,
    tokenIDOPrice: number,
    purchaseCapMax: number,
    purchaseCapMin: number,
    purchaseMaximun: number
  ): Promise<KoriIDO> {
    return await (
      await new KoriIDO__factory(signer).deploy(
        tokenIDO,
        adminWallet,
        utils.parseEther(tokenIDOPrice.toString()),
        utils.parseEther(purchaseCapMax.toString()),
        utils.parseEther(purchaseCapMin.toString()),
        utils.parseEther(purchaseMaximun.toString()),
        sweepAddress
      )
    ).deployed();
  },
  // Pancake ERC20
  async pancakeERC20(
    signer: SignerWithAddress | Wallet
  ): Promise<PancakeERC20> {
    return await (await new PancakeERC20__factory(signer).deploy()).deployed();
  },
  // Pancake Factory
  async pancakeFactory(
    signer: SignerWithAddress | Wallet,
    feeAddress: string
  ): Promise<PancakeFactory> {
    return await (
      await new PancakeFactory__factory(signer).deploy(feeAddress)
    ).deployed();
  },
  // Pancake Pair
  async pancakePair(signer: SignerWithAddress | Wallet): Promise<PancakePair> {
    return await (await new PancakePair__factory(signer).deploy()).deployed();
  },
  // Pancake Router
  async pancakeRouter(
    signer: SignerWithAddress | Wallet,
    factoryAddress: string,
    wethAddress: string
  ): Promise<PancakeRouter> {
    return await (
      await new PancakeRouter__factory(signer).deploy(
        factoryAddress,
        wethAddress
      )
    ).deployed();
  },
  // Internal swap
  async swap(
    signer: SignerWithAddress | Wallet,
    adminAddress: string,
    feeAddress: string,
    routerAddress: string
  ): Promise<KoriSwap> {
    return await (
      await new KoriSwap__factory(signer).deploy(
        adminAddress,
        feeAddress,
        routerAddress
      )
    ).deployed();
  },
};

export default deploy;
