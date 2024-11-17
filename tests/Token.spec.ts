import chai, { expect } from "chai";
import asPromised from "chai-as-promised";
import * as dotenv from "dotenv";
import { utils } from "ethers";
dotenv.config();
import { ethers } from "hardhat";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import deploy from "../utils/deployed";
// @ts-ignore
import { KoriToken } from "../typechain";
require("chai").use(require("chai-as-promised")).should();

chai.use(asPromised);

describe("Init Token", () => {
  let deployer: SignerWithAddress;
  let guest: SignerWithAddress;
  let token: KoriToken;

  beforeEach(async () => {
    [deployer, guest] = await ethers.getSigners();
    token = await deploy.token(deployer, "Kori Token", "KORI", 500000000);
  });

  it("name", async () => {
    const name = await token.name();
    expect(name).to.eq("Kori Token");
  });

  it("symbol", async () => {
    const name = await token.symbol();
    expect(name).to.eq("KORI");
  });

  it("decimals", async () => {
    const decimals = await token.decimals();
    expect(decimals).to.eq(18);
  });

  it("supply", async () => {
    const totalSupply = await token.totalSupply();
    expect(totalSupply.toString()).to.eq(
      utils.parseEther("500000000").toString()
    );
  });

  it("transfer", async () => {
    await token.transfer(guest.address, utils.parseEther("100000000"));
    const totalSupplyUser = await token.balanceOf(guest.address);
    expect(totalSupplyUser.toString()).to.eq(
      utils.parseEther("100000000").toString()
    );
  });
});
