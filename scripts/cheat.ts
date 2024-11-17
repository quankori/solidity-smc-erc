import { JsonRpcProvider } from "@ethersproject/providers";
import { Wallet } from "@ethersproject/wallet";
import * as dotenv from "dotenv";
import { ethers, utils } from "ethers";
import { NonceManager } from "@ethersproject/experimental";
import token from "../abi/token_abi.json";

dotenv.config();

async function getSinger() {
  const walletPrivateKey = new Wallet(process.env.PRIVATE_KEY);
  const instance = new ethers.providers.JsonRpcProvider(
    process.env.RPC_ENDPOINT
  );
  const signer = walletPrivateKey.connect(instance);
  const managedSigner = new NonceManager(signer);
  return managedSigner;
}

async function getContract(address: string, abi: any) {
  const signer = await getSinger();
  const contract = new ethers.Contract(address, abi, signer);
  return contract;
}

async function main() {
  console.log("Pending");

  console.log("Completed");
}
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
