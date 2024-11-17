import chai, { expect } from "chai";
import asPromised from "chai-as-promised";
import { utils } from "ethers";
import { MerkleTree } from "merkletreejs";
import { ethers } from "hardhat";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import deploy from "../utils/deployed";
// @ts-ignore
import { KoriAirdrop } from "../typechain";
require("chai").use(require("chai-as-promised")).should();

chai.use(asPromised);

describe("Airdrop", () => {
  let deployer: SignerWithAddress;
  let guest: SignerWithAddress;
  let guest2: SignerWithAddress;
  let token: KoriAirdrop;

  beforeEach(async () => {
    const keccak256 = utils.keccak256;
    [deployer, guest, guest2] = await ethers.getSigners();
    const leaves = [guest].map((account) => keccak256(account.address));
    const tree = new MerkleTree(leaves, keccak256, { sort: true });
    const merkleRoot = tree.getHexRoot();
    token = await deploy.airdrop(deployer, merkleRoot);
  });

  it("allow only whitelisted accounts to mint", async () => {
    const keccak256 = utils.keccak256;
    const leaves = [guest].map((account) => keccak256(account.address));
    const tree = new MerkleTree(leaves, keccak256, { sort: true });
    const merkleProof = tree.getHexProof(keccak256(guest.address));
    const invalidMerkleProof = tree.getHexProof(keccak256(guest2.address));

    await expect(token.connect(guest).mint(merkleProof)).to.not.be.rejected;
    await expect(token.connect(guest).mint(merkleProof)).to.be.rejectedWith(
      "already claimed"
    );
    await expect(
      token.connect(guest2).mint(invalidMerkleProof)
    ).to.be.rejectedWith("Kori: Invalid merkle proof");
  });
});
