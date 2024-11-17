import { JsonRpcProvider } from "@ethersproject/providers";
import { Wallet } from "@ethersproject/wallet";
import * as dotenv from "dotenv";
import * as fs from "fs-extra";
import { ethers, utils } from "ethers";
import deploy from "../utils/deployed";

dotenv.config();

async function main() {
  // Get info
  const addressPath = `${process.cwd()}/info.json`;
  const data = await readConfig(addressPath);

  // // Setup network
  console.log(process.env.RPC_ENDPOINT);
  const provider = new JsonRpcProvider(`${process.env.RPC_ENDPOINT}`);
  const wallet = new Wallet(`0x${process.env.PRIVATE_KEY}`, provider);
  const signer = wallet.connect(provider);

  if (!data.token) {
    console.log("Deploying Token...");
    const result = await deploy.token(wallet, "Kori Token", "KORI", 5000000000);
    const address = result.address;
    console.log("Token deployed at ", address);
    data.token = address;
  }

  // Update config
  await writeConfig(addressPath, data);
}

async function readConfig(addressPath) {
  return JSON.parse(await fs.readFileSync(addressPath));
}

async function writeConfig(addressPath, addressBook) {
  await fs.writeFile(addressPath, JSON.stringify(addressBook, null, 2));
}
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
