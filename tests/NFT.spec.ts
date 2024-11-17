import chai, { expect } from "chai";
import asPromised from "chai-as-promised";
import * as dotenv from "dotenv";
import { utils } from "ethers";
dotenv.config();
// @ts-ignore
import { ethers } from "hardhat";
import deploy from "../utils/deployed";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { KoriNFT } from "../typechain";
require("chai").use(require("chai-as-promised")).should();

chai.use(asPromised);

describe("NFT", () => {
  let deployer, guest, guest2: SignerWithAddress;

  let nft: KoriNFT;
  beforeEach(async () => {
    [deployer, guest, guest2] = await ethers.getSigners();
    nft = await deploy.nft(deployer, "Kori NFT", "KORI", 1, 100, deployer.address);
  });

  const setup = async () => {
    await nft.setPriceOne(utils.parseEther("2"));
  };

  it("name", async () => {
    const name = await nft.name();
    expect(name).to.eq("Kori NFT");
  });

  it("symbol", async () => {
    const name = await nft.symbol();
    expect(name).to.eq("KORI");
  });

  it("set price by admin", async () => {
    const price = utils.parseEther("2").toString();
    await nft.setPriceOne(price);
    const priceOne = await nft.priceOne();
    expect(priceOne.toString()).to.eq(price);
  });

  it("throw error when use guest role to change price", async () => {
    const newPrice = utils.parseEther("3");
    const guestNft = await nft.connect(guest);
    await guestNft
      .setPriceOne(newPrice)
      .should.be.rejectedWith("Kori: must have admin role to change price");
  });

  it("throw error when use guest role to change base URI", async () => {
    const newBaseURI = "https://ipfs.io/ipfs/";
    const guestNft = await nft.connect(guest);

    await guestNft
      .setBaseURI(newBaseURI)
      .should.be.rejectedWith("Kori: must have admin role to change base URI");
  });

  it("throw error when the account is not the correct amount", async () => {
    await setup();

    await nft
      .mintOne("QmRVNQxyvmk36fjm3fZfpEP9r8GqqBVNgYvnfi656citBZ", {
        value: utils.parseEther("1"),
      })
      .should.be.rejectedWith("Kori: must send correct price");
  });

  it("mint", async () => {
    await setup();

    await nft.mintOne("QmRVNQxyvmk36fjm3fZfpEP9r8GqqBVNgYvnfi656citBZ", {
      value: utils.parseEther("2"),
    });

    const totalSupply = await nft.totalSupply();

    expect(totalSupply.toNumber()).to.eq(1);
  });

  it("check owner and tokenURI", async () => {
    await setup();
    const newTokenURI1 = "QmRVNQxyvmk36fjm3fZfpEP9r8GqqBVNgYvnfi656citBZ";
    const newBaseURI = "https://ipfs.io/ipfs/";

    await nft.setBaseURI(newBaseURI);

    // mint one
    await nft.mintOne("QmRVNQxyvmk36fjm3fZfpEP9r8GqqBVNgYvnfi656citBZ", {
      value: utils.parseEther("2"),
    });
    const owner1 = await nft.ownerOf(1);
    const tokenURIOwner1 = await nft.tokenURI(1);

    expect(owner1).to.eq(deployer.address);
    expect(tokenURIOwner1).to.eq(`${newBaseURI}${newTokenURI1}`);
  });
});
