import chai, { expect } from "chai";
import asPromised from "chai-as-promised";
import * as dotenv from "dotenv";
import { utils } from "ethers";
import Web3 from "web3";
dotenv.config();
// @ts-ignore
import { ethers } from "hardhat";
import { ClaimSchemes, ClaimTypes, KeyPurposes, KeyType } from "../utils/enum";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { ClaimVerifier, ClaimHolder } from "../typechain";
import deploy from "../utils/deployed";
require("chai").use(require("chai-as-promised")).should();

chai.use(asPromised);

describe("Testing Identity BEP-725 and BEP-735", () => {
  let deployer: SignerWithAddress,
    fractalUser1: SignerWithAddress,
    fractalUser2: SignerWithAddress,
    investor: SignerWithAddress;
  let claimContactFractal: ClaimHolder;
  let claimContactInvestor: ClaimHolder;
  let claimVerifier: ClaimVerifier;

  beforeEach(async () => {
    [deployer, fractalUser1, fractalUser2, investor] =
      await ethers.getSigners();
    claimContactFractal = await deploy.claimHolder(fractalUser1);
    claimContactInvestor = await deploy.claimHolder(investor);
    claimVerifier = await deploy.claimVerify(
      deployer,
      claimContactFractal.address
    );
  });

  it("get info key", async () => {
    const keyByRole = await claimContactFractal.getKeysByPurpose(
      KeyPurposes.MANAGEMENT_KEY
    );
    const infoKey = await claimContactFractal.getKey(keyByRole[0]);
    expect(infoKey["key"]).to.eq(utils.keccak256(fractalUser1.address));
    expect(infoKey["purpose"].toNumber()).to.eq(KeyPurposes.MANAGEMENT_KEY);
    expect(infoKey["keyType"].toNumber()).to.eq(KeyType.ECDSA);
  });

  it("add another fractal user", async () => {
    await claimContactFractal
      .connect(fractalUser1)
      .addKey(
        fractalUser2.address,
        KeyPurposes.CLAIM_SIGNER_KEY,
        KeyType.ECDSA
      );
    const keyByRole = await claimContactFractal.getKeysByPurpose(
      KeyPurposes.CLAIM_SIGNER_KEY
    );
    const infoKey = await claimContactFractal.getKey(keyByRole[0]);
    expect(infoKey["key"]).to.eq(utils.keccak256(fractalUser2.address));
    expect(infoKey["purpose"].toNumber()).to.eq(KeyPurposes.CLAIM_SIGNER_KEY);
    expect(infoKey["keyType"].toNumber()).to.eq(KeyType.ECDSA);
  });

  it("add kyc user", async () => {
    // signing fractal's kyc claim
    const hexedData = Web3.utils.asciiToHex("Hello, World");
    const hashedDataToSign = Web3.utils.soliditySha3(
      claimContactInvestor.address,
      ClaimTypes.KYC,
      hexedData
    );
    const signature = await fractalUser2.signMessage(hashedDataToSign);

    // adding fractal's kyc claim on investor
    await claimContactInvestor
      .connect(investor)
      .addClaim(
        ClaimTypes.KYC,
        ClaimSchemes.ECDSA,
        claimContactFractal.address,
        signature,
        hexedData,
        "http://"
      );
    const claimId = await claimContactInvestor.getClaimIdsByType(
      ClaimTypes.KYC
    );
    const claim = await claimContactInvestor.getClaim(claimId[0]);
    expect(claim["claimType"].toNumber()).to.eq(ClaimTypes.KYC);
    expect(claim["scheme"].toNumber()).to.eq(ClaimTypes.KYC);
    expect(claim["issuer"]).to.eq(claimContactFractal.address);
    expect(claim["signature"]).to.eq(signature);
    expect(claim["data"]).to.eq(hexedData);
    expect(claim["uri"]).to.eq("http://");
    expect(utils.toUtf8String(claim["data"])).to.eq("Hello, World");
    const verify = await claimVerifier.checkClaim(
      claimContactInvestor.address,
      ClaimTypes.KYC
    );
  });
});
