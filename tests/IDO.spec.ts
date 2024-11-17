import chai, { expect } from "chai";
import asPromised from "chai-as-promised";
import * as dotenv from "dotenv";
dotenv.config();
// @ts-ignore
import { MarathonBToken, MarathonBIDO } from "../typechain";
// @ts-ignore
import { ethers } from "hardhat";
import { BigNumber, constants, utils } from "ethers";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import deploy from "../utils/deployed";
import duration from "../utils/duration";

chai.use(asPromised);

describe("IDO", () => {
  let deployer: SignerWithAddress;
  let guest: SignerWithAddress;
  let guest2: SignerWithAddress;
  let admin: SignerWithAddress;
  let fee: SignerWithAddress;
  let sweep: SignerWithAddress;

  let ido: MarathonBIDO;
  let token: MarathonBToken;
  let token2: MarathonBToken;
  let startTime: number, endTime: number, claimTime: number;

  beforeEach(async () => {
    [deployer, guest, guest2, admin, fee, sweep] = await ethers.getSigners();
    token = await deploy.token(deployer, "Test Token", "TEST", 500000000);
    token2 = await deploy.token(deployer, "Test Token", "TEST", 500000000);
    ido = await deploy.ido(
      deployer,
      token.address,
      sweep.address,
      admin.address,
      0.5,
      2,
      0.5,
      2
    );
    const currentTime = Math.floor(Date.now() / 1000);
    startTime = currentTime + duration.days(1);
    endTime = currentTime + duration.days(5);
    claimTime = currentTime + duration.days(15);
    await ido.connect(admin).setClaimTime(claimTime);
  });

  it("change deposit min", async () => {
    await ido
      .connect(guest)
      .setPurchaseCapLimit(utils.parseEther("2"))
      .should.be.rejectedWith("Kori IDO: must have admin role to action");
    await ido.connect(admin).setPurchaseCapLimit(utils.parseEther("2"));
    const result = await ido.purchaseCapLimit();
    expect(result.toString()).to.eq(utils.parseEther("2").toString());
  });

  it("change deposit max", async () => {
    await ido
      .connect(guest)
      .setPurchaseCap(utils.parseEther("200"))
      .should.be.rejectedWith("Kori IDO: must have admin role to action");
    await ido.connect(admin).setPurchaseCap(utils.parseEther("200"));
    const result = await ido.purchaseCapMax();
    expect(result.toString()).to.eq(utils.parseEther("200").toString());
  });

  it("change ido token", async () => {
    await ido
      .connect(guest)
      .setIDOToken(token2.address)
      .should.be.rejectedWith("Kori IDO: must have admin role to action");
    await ido.connect(admin).setIDOToken(token2.address);
    const result = await ido.ido();
    expect(result).to.eq(token2.address);
    await ido.connect(admin).setIDOToken(token.address);
  });

  it("change claim status", async () => {
    await ido
      .connect(guest)
      .setClaimStatus(true)
      .should.be.rejectedWith("Kori IDO: must have admin role to action");
    await ido.connect(admin).setClaimStatus(false);
    const result = await ido.claimStatus();
    expect(result).to.eq(false);
  });

  it("change day start and end", async () => {
    await ido
      .connect(guest)
      .setStartTime(startTime)
      .should.be.rejectedWith("Kori IDO: must have admin role to action");

    await ido.connect(admin).setStartTime(startTime);
    await ido.connect(admin).setEndTime(endTime);
    const result = await ido.listPhase();
    expect(result.title, "Whitelist");
    expect(result.endTime.toString(), endTime.toString());
  });

  it("change deposit price", async () => {
    await ido
      .connect(guest)
      .setIdoPrice(utils.parseEther("0.03"))
      .should.be.rejectedWith("Kori IDO: must have admin role to action");
    await ido.connect(admin).setIdoPrice(utils.parseEther("0.03"));
    const result = await ido.idoPrice();
    expect(result.toString()).to.eq(utils.parseEther("0.03").toString());
  });

  it("change max price", async () => {
    await ido
      .connect(guest)
      .setMaxPurchasedToken(utils.parseEther("1000"))
      .should.be.rejectedWith("Kori IDO: must have admin role to action");
    await ido.connect(admin).setMaxPurchasedToken(utils.parseEther("1000"));
    const result = await ido.maxPurchasedToken();
    expect(result.toString()).to.eq(utils.parseEther("1000").toString());
  });

  it("add white list admin", async () => {
    await ido
      .connect(guest)
      .addWhitelist([guest.address])
      .should.be.rejectedWith("Kori IDO: must have admin role to action");
    await ido.connect(admin).addWhitelist([guest.address]);
    const result = await ido.whitelistedUsers();
    expect(result[0]).to.eq(guest.address);
    await ido.connect(admin).removeWhitelist([guest.address]);
    const resultAfterRemove = await ido.whitelistedUsers();
    expect(resultAfterRemove[0]).to.eq(constants.AddressZero);
  });

  it("purchase and claim token", async () => {
    // Check before purchase
    await ido
      .connect(guest)
      .purchase({ value: utils.parseEther("1") })
      .should.be.rejectedWith("Kori IDO: must excute is deposit active");
    await ido.connect(admin).setStartTime(startTime);
    await ido.connect(admin).setEndTime(endTime);
    await ido.connect(admin).setClaimStatus(false);
    // await ido.connect
    await ido
      .connect(guest)
      .purchase({ value: utils.parseEther("1") })
      .should.be.rejectedWith("Kori IDO: Caller not whitelist");
    await ido.connect(admin).addWhitelist([guest.address]);
    await ido
      .connect(guest)
      .purchase({ value: utils.parseEther("1") })
      .should.be.rejectedWith("Kori IDO: Sale not started");
    await duration.nextBlockTime(1);
    await ido
      .connect(guest)
      .purchase({ value: utils.parseEther("0.2") })
      .should.be.rejectedWith("Kori IDO: Purchase not smaller than cap");
    await ido
      .connect(guest)
      .purchase({ value: utils.parseEther("2.1") })
      .should.be.rejectedWith(
        "Kori IDO: Amount must not bigger than purchase cap"
      );
    await ido.connect(guest).purchase({ value: utils.parseEther("1") });
    await ido.connect(guest).purchase({ value: utils.parseEther("0.6") });
    const resultPurchasedAmounts = await ido.purchasedAmounts(guest.address);
    expect(resultPurchasedAmounts.toString()).to.eq(
      utils.parseEther("1.6").toString()
    );
    const resulIDOAmounts = await ido.idoAmounts(guest.address);
    expect(resulIDOAmounts.toString()).to.eq(
      utils.parseEther("3.2").toString()
    );
    await ido
      .connect(guest2)
      .purchase({ value: utils.parseEther("2") })
      .should.be.rejectedWith("Kori IDO: Caller not whitelist");
    await ido
      .connect(guest)
      .purchase({ value: utils.parseEther("1") })
      .should.be.rejectedWith(
        "Kori IDO: Amount must not bigger than purchase cap"
      );
    await duration.nextBlockTime(10);
    await ido
      .connect(guest)
      .purchase({ value: utils.parseEther("0.4") })
      .should.be.rejectedWith("Kori IDO: Sale is ended");
    const resultIdoAmounts = await ido.idoAmounts(guest.address);
    expect(resultIdoAmounts.toString()).to.eq(
      utils.parseEther("3.2").toString()
    );
    const resultTotalPurchasedAmount = await ido.totalPurchasedAmount();
    expect(resultTotalPurchasedAmount.toString()).to.eq(
      utils.parseEther("1.6").toString()
    );
    const resultBalanceOfIDO = await token.balanceOf(ido.address);
    expect(resultBalanceOfIDO.toString()).to.eq("0");
    const resultBalanceOfGuest = await token.balanceOf(guest.address);
    expect(resultBalanceOfGuest.toString()).to.eq("0");

    // Claim after purchased
    await ido
      .connect(guest)
      .claim()
      .should.be.rejectedWith("Kori IDO: must excute is claim active");
    await duration.setBlockTime(claimTime);
    await ido.connect(admin).setClaimStatus(true);
    await ido
      .connect(guest)
      .claim()
      .should.be.rejectedWith("ERC20: transfer amount exceeds balance");
    await token
      .connect(deployer)
      .transfer(
        ido.address,
        BigNumber.from(500).mul(BigNumber.from(10).pow(18))
      );
    await ido.connect(guest).claim();
    const resultBalanceOfGuestAfterClaim = await token.balanceOf(guest.address);
    expect(resultBalanceOfGuestAfterClaim.toString()).to.eq(
      utils.parseEther("3.2").toString()
    );
    await ido
      .connect(guest)
      .claim()
      .should.be.rejectedWith("Kori IDO: Amount claim invalid");
    const resultBalanceOfIDOAfterClaim = await token.balanceOf(ido.address);
    expect(resultBalanceOfIDOAfterClaim.toString()).to.not.eq(
      utils.parseEther("500").toString()
    );
  });
});
