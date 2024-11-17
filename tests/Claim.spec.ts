import chai, { expect } from "chai";
import asPromised from "chai-as-promised";
import * as dotenv from "dotenv";
dotenv.config();
// @ts-ignore
import { KoriClaim, KoriToken } from "../typechain";
// @ts-ignore
import { ethers } from "hardhat";
import { BigNumber, utils } from "ethers";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import deploy from "../utils/deployed";

chai.use(asPromised);

describe("Claim", () => {
  let deployer: SignerWithAddress;
  let guest: SignerWithAddress;
  let guest2: SignerWithAddress;
  let admin: SignerWithAddress;

  let claim: KoriClaim;
  let token: KoriToken;

  beforeEach(async () => {
    [deployer, guest, guest2, admin] = await ethers.getSigners();
    token = await deploy.token(deployer, "Kori Token", "KORI", 500000000);
    claim = await deploy.claim(deployer, token.address);
    await token
      .connect(deployer)
      .transfer(
        claim.address,
        BigNumber.from(50000).mul(BigNumber.from(10).pow(18))
      );
  });

  it("claim token", async () => {
    const resultBalanceOfClaimContract = await token.balanceOf(claim.address);
    expect(resultBalanceOfClaimContract.toString()).to.eq(
      utils.parseEther("50000").toString()
    );
    await claim.connect(guest).claim();
    const resultBalanceOfGuestAfterClaim = await token.balanceOf(guest.address);
    expect(resultBalanceOfGuestAfterClaim.toString()).to.eq(
      utils.parseEther("20000").toString()
    );
    await claim
      .connect(guest)
      .claim()
      .should.be.rejectedWith("Tiki Game: User is claimed");
    await claim.connect(guest2).claim();
    const resultBalanceOfGuestAfterClaim2 = await token.balanceOf(
      guest2.address
    );
    expect(resultBalanceOfGuestAfterClaim2.toString()).to.eq(
      utils.parseEther("20000").toString()
    );
    const resultBalanceOfIDOAfterClaim = await token.balanceOf(claim.address);
    expect(resultBalanceOfIDOAfterClaim.toString()).to.eq(
      utils.parseEther("10000").toString()
    );
  });
});
