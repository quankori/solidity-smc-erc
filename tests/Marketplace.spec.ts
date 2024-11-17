import chai, { expect } from "chai";
import asPromised from "chai-as-promised";
import * as dotenv from "dotenv";
import { utils } from "ethers";
dotenv.config();
// @ts-ignore
import { ethers } from "hardhat";
import deploy from "../utils/deployed";
import { KoriMarketplace, KoriWrapper, KoriNFT } from "../typechain";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import duration from "../utils/duration";

chai.use(asPromised);

describe("Marketplace", () => {
  let deployer: SignerWithAddress;
  let artists: SignerWithAddress;
  let url: string = "asdasdsadsadasdzxcxzczxczxczxczxcxz";
  let token: string = "0x0000000000000000000000000000000000000000";
  let auction: KoriMarketplace;
  let nft: KoriNFT;
  let nft2: KoriNFT;
  let weth: KoriWrapper;
  let bidder1: SignerWithAddress;

  beforeEach(async () => {
    [deployer, artists, bidder1] = await ethers.getSigners();
    nft = await deploy.nft(deployer, "Kori NFT", "NFT", 1, 100, deployer.address);
    nft2 = await deploy.nft(deployer, "Kori NFT 2", "KORI 2", 1, 100, deployer.address);
    weth = await deploy.wrapper(deployer);
    auction = await deploy.market(deployer, weth.address, deployer.address);
    await nft.mintOne(url, { value: utils.parseEther("1") });
    await nft2.connect(artists).mintOne(url, { value: utils.parseEther("1") });
    await nft.connect(artists).mintOne(url, { value: utils.parseEther("1") });
    await nft.mintOne(url, { value: utils.parseEther("1") });
    await nft.connect(deployer).approve(auction.address, 1);
  });

  it("should not create if reserver price equal 0", async () => {
    await expect(
      auction.connect(deployer).createSale(1, nft.address, 0, 0, token)
    ).eventually.rejectedWith("ReservePrice need to be define!");
  });

  it("should not create if not duration", async () => {
    await expect(
      auction.connect(artists).createSale(1, nft.address, 0, 10, token)
    ).eventually.rejectedWith("Duration need to be define!");
  });

  it("should not create if not owner", async () => {
    await expect(
      auction.connect(artists).createSale(1, nft.address, 10, 10, token)
    ).eventually.rejectedWith("Caller must be approved or owner for token id");
  });

  it("should not create if not approved", async () => {
    await expect(
      auction.connect(artists).createSale(2, nft.address, 10, 10, token)
    ).eventually.rejectedWith(
      "ERC721: transfer caller is not owner nor approved"
    );
  });

  it("should create, if data correct", async () => {
    await nft.connect(artists).approve(auction.address, 2);
    await auction.connect(artists).createSale(2, nft.address, 10, 2000, token);
    const auctionInfo = await auction.auctions(1);
    const tokenOwner = await nft.ownerOf(2);
    expect(tokenOwner).to.eq(auction.address);
    expect(auctionInfo.amount.toNumber()).to.eq(0);
    expect(auctionInfo.auctionCurrency).to.eq(token);
    expect(auctionInfo.bidder).to.eq(
      "0x0000000000000000000000000000000000000000"
    );
    expect(auctionInfo.endTime.toNumber()).to.not.eq(0);
    expect(auctionInfo.reservePrice.toNumber()).to.eq(2000);
    expect(auctionInfo.tokenContract).to.eq(nft.address);
    expect(auctionInfo.tokenId.toNumber()).to.eq(2);
    expect(auctionInfo.tokenOwner).to.eq(artists.address);
  });

  it("should create, if data correct and another nft", async () => {
    await nft2.connect(artists).approve(auction.address, 1);
    await auction.connect(artists).createSale(1, nft2.address, 10, 2000, token);
    const auctionInfo = await auction.auctions(1);
    const tokenOwner = await nft2.ownerOf(1);
    expect(tokenOwner).to.eq(auction.address);
    expect(auctionInfo.amount.toNumber()).to.eq(0);
    expect(auctionInfo.auctionCurrency).to.eq(token);
    expect(auctionInfo.bidder).to.eq(
      "0x0000000000000000000000000000000000000000"
    );
    expect(auctionInfo.endTime.toNumber()).to.not.eq(0);
    expect(auctionInfo.reservePrice.toNumber()).to.eq(2000);
    expect(auctionInfo.tokenContract).to.eq(nft2.address);
    expect(auctionInfo.tokenId.toNumber()).to.eq(1);
    expect(auctionInfo.tokenOwner).to.eq(artists.address);
  });

  it("verify weth address", async () => {
    const wethAddress = await auction.wethAddress();
    expect(wethAddress).to.eq(weth.address);
  });

  it("should not create bid if expire time", async () => {
    await nft.connect(artists).approve(auction.address, 2);
    await auction.connect(artists).createSale(2, nft.address, 10, 1000, token);
    duration.nextBlockTime(800);
    await expect(
      auction.connect(bidder1).createBid(1, 1000, { value: 1000 })
    ).eventually.rejectedWith("Sale expired");
  });

  it("should not create bid if price not correct", async () => {
    await nft.connect(artists).approve(auction.address, 2);
    await auction.connect(artists).createSale(2, nft.address, 10, 1000, token);
    await expect(
      auction.connect(bidder1).createBid(1, 500, { value: 500 })
    ).eventually.rejectedWith("Sale need correct money");
  });

  it("should create bid and transfer to last bidder", async () => {
    await nft.connect(artists).approve(auction.address, 2);
    await auction.connect(artists).createSale(2, nft.address, 10, 1000, token);
    await auction.connect(bidder1).createBid(1, 1000, { value: 1000 });
    const auctionInfo = await auction.auctions(1);
    expect(auctionInfo.bidder).to.eq(
      "0x0000000000000000000000000000000000000000"
    );
    const tokenOwner = await nft.ownerOf(2);
    expect(tokenOwner).to.eq(bidder1.address);
  });

  it("verify weth address", async () => {
    const wethAddress = await auction.wethAddress();
    expect(wethAddress).to.eq(weth.address);
  });

  it("should not end if not author", async () => {
    await nft.connect(artists).approve(auction.address, 2);
    await auction.connect(artists).createSale(2, nft.address, 10, 1000, token);
    await expect(
      auction.connect(deployer).cancelSale(1)
    ).eventually.rejectedWith("Can only be called by auction creator");
  });

  it("should cancel auction", async () => {
    await nft.connect(artists).approve(auction.address, 2);
    await auction.connect(artists).createSale(2, nft.address, 10, 1000, token);
    await auction.connect(artists).cancelSale(1);
    const tokenOwner = await nft.ownerOf(2);
    expect(tokenOwner).to.eq(artists.address);
  });
});
