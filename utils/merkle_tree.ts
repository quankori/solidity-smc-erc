import { MerkleTree } from "merkletreejs";
import SHA256 from "crypto-js/sha256";
const merkleTree = {
  hash: function (array: any[]): MerkleTree {
    const leaves = array.map((x) => SHA256(x));
    return new MerkleTree(leaves, SHA256);
  },
  verify: function (address: string, tree: MerkleTree): Boolean {
    const leaf = SHA256(address);
    const proof = tree.getProof(leaf);
    const root = tree.getRoot().toString("hex");
    return tree.verify(proof, leaf, root);
  },
  convert: function (tree: MerkleTree): string {
    return tree.getRoot().toString("hex");
  },
};
export default merkleTree;
