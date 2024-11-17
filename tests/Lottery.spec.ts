import chai, { expect } from "chai";
import asPromised from "chai-as-promised";
import * as dotenv from "dotenv";
import { utils } from "ethers";
dotenv.config();
import { ethers } from "hardhat";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import deploy from "../utils/deployed";
// @ts-ignore
import { IceToken, IceWheel } from "../typechain";
import duration from "../utils/duration";
require("chai").use(require("chai-as-promised")).should();

chai.use(asPromised);

describe("Lottery", () => {
  let deployer: SignerWithAddress;
  let guest: SignerWithAddress;
  let guest2: SignerWithAddress;
  let holder: SignerWithAddress;
  let token: IceToken;
  let wheel: IceWheel;

  beforeEach(async () => {
    [deployer, guest, guest2, holder] = await ethers.getSigners();
    token = await deploy.token(deployer, "Kori Token", "KORI", 500000000);
    wheel = await deploy.lottery(deployer, deployer.address, token.address);
    await token
      .connect(deployer)
      .transfer(holder.address, utils.parseEther("500000000"));
    await token.connect(holder).transfer(guest.address, utils.parseEther("5"));
    await token.connect(holder).transfer(guest2.address, utils.parseEther("5"));
  });

  it("create wheel", async () => {
    // Get current wheel
    let current = await wheel.currentWheel();
    expect(current.toString()).to.eq("0".toString());

    // Create current wheel
    await wheel
      .connect(guest)
      .createWheel()
      .should.be.rejectedWith("Tiki Game: must have admin role to action");
    await wheel.createWheel();
    current = await wheel.currentWheel();
    expect(current.toString()).to.eq("1".toString());
    await wheel
      .connect(deployer)
      .createWheel()
      .should.be.rejectedWith("Tiki Game: Current wheel is active");
  });

  it("info wheel", async () => {
    const tokenAddress = await wheel.tokenAddress();
    expect(tokenAddress).to.eq(token.address);
    const price = await wheel.price();
    expect(price.toString()).to.eq(utils.parseEther("1").toString());
    const feeIfLose = await wheel.communityFeePercentage();
    expect(feeIfLose.toString()).to.eq("10");
    await wheel
      .connect(guest)
      .setCommunityFeePercentage(13)
      .should.be.rejectedWith("Tiki Game: must have admin role to actio");
    await wheel.connect(deployer).setCommunityFeePercentage(13);
    const feeAfterEdit = await wheel.communityFeePercentage();
    expect(feeAfterEdit.toString()).to.eq("13");
  });

  it("betting wheel", async () => {
    await wheel
      .connect(guest)
      .betWheel(13)
      .should.be.rejectedWith("Tiki Game: Wheel doesn't active");
    await wheel.createWheel();
    await wheel
      .connect(guest)
      .betWheel(13)
      .should.be.rejectedWith("ERC20: insufficient allowance");
    await token.connect(guest).approve(wheel.address, utils.parseEther("1"));
    await token.connect(deployer).approve(wheel.address, utils.parseEther("1"));
    await wheel
      .connect(guest)
      .betWheel(103)
      .should.be.rejectedWith(
        "Tiki Game: Number bigger than 0 and smaller than 100"
      );
    await wheel
      .connect(deployer)
      .betWheel(13)
      .should.be.rejectedWith("Tiki Game: Admin cannot play game");
    await wheel.connect(guest).betWheel(13);
    let balanceOf = await token.balanceOf(guest.address);
    expect(balanceOf.toString()).to.eq(utils.parseEther("4").toString());
    balanceOf = await token.balanceOf(wheel.address);
    expect(balanceOf.toString()).to.eq(utils.parseEther("1").toString());
    const current = await wheel.currentWheel();
    expect(current.toString()).to.eq("1");
    let list = await wheel.list();
    expect(list[0].choose).to.eq(13);
    expect(list[0].userAddress).to.eq(guest.address);
    await wheel
      .connect(guest)
      .betWheel(14)
      .should.be.rejectedWith("Tiki Game: User was bet");
    await token.connect(guest2).approve(wheel.address, utils.parseEther("1"));
    await wheel.connect(guest2).betWheel(15);
    list = await wheel.list();
    expect(list[1].choose).to.eq(15);
    expect(list[1].userAddress).to.eq(guest2.address);
    balanceOf = await token.balanceOf(wheel.address);
    expect(balanceOf.toString()).to.eq(utils.parseEther("2").toString());
  });

  it("stop betting", async () => {
    await wheel
      .connect(guest)
      .stopWheel()
      .should.be.rejectedWith("Tiki Game: Wheel doesn't active");
    await wheel.createWheel();
    await token.connect(guest).approve(wheel.address, utils.parseEther("1"));
    await wheel.connect(guest).betWheel(13);
    await token.connect(guest2).approve(wheel.address, utils.parseEther("1"));
    await wheel.connect(guest2).betWheel(15);
    await wheel
      .connect(guest)
      .stopWheel()
      .should.be.rejectedWith("Tiki Game: must have admin role to actio");
    duration.setBlockTime(1684610784);
    await wheel.stopWheel();
    let result = await wheel.resultWheel(1);
    expect(result).to.eq(84);
    let balanceOf = await token.balanceOf(deployer.address);
    expect(balanceOf.toString()).to.eq(utils.parseEther("2").toString());
    await wheel
      .connect(guest)
      .stopWheel()
      .should.be.rejectedWith("Tiki Game: Wheel doesn't active");
    await wheel.createWheel();
    await token.connect(guest).approve(wheel.address, utils.parseEther("1"));
    await wheel.connect(guest).betWheel(15);
    await token.connect(guest2).approve(wheel.address, utils.parseEther("1"));
    await wheel.connect(guest2).betWheel(12);
    duration.setBlockTime(1684610915);
    await wheel.stopWheel();
    result = await wheel.resultWheel(2);
    expect(result).to.eq(15);
    balanceOf = await token.balanceOf(deployer.address);
    expect(balanceOf.toString()).to.eq(utils.parseEther("2.2").toString());
  });
});
