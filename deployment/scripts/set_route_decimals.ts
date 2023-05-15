import fs from "fs";
import dotenv from "dotenv";
import { Network, PrivateKey } from "@routerprotocol/router-chain-sdk-ts";
import { exec_msg } from "./execute_msg";
import { send_native_coin } from "./send_coin";
dotenv.config();

async function main() {
    let network = Network.AlphaDevnet;
    if (process.env.NETWORK == "devnet") {
        network = Network.Devnet
    } else if (process.env.NETWORK == "testnet") {
        network = Network.Testnet
    } else if (process.env.NETWORK == "mainnet") {
        network = Network.Mainnet
    } else if (process.env.NETWORK && process.env.NETWORK != "alpha-devnet") {
        throw new Error("Please set your NETWORK in the .env file");
    }

    const privateKeyHash = process.env.PRIVATE_KEY;

    if (!privateKeyHash) {
        throw new Error("Please set your PRIVATE_KEY in the .env file");
    }

    const privateKey = PrivateKey.fromPrivateKey(privateKeyHash);
    const alice = privateKey.toBech32();

    const dexSetupFilePath = "config/dex.json";
    const dexSetup = JSON.parse(fs.readFileSync(dexSetupFilePath, "utf-8"));


    const routerSwapFactoryAddr = dexSetup[network]["routerSwapFactory"]["addr"];
    if (!routerSwapFactoryAddr) {
        throw new Error("Not able to find 'routerSwapFactoryAddr' in dex Setup file");
    }

    await send_native_coin(routerSwapFactoryAddr);
    let add_native_token_decimals = {
        "denom": "route",
        "decimals": 18
    };
    let logs = await exec_msg(routerSwapFactoryAddr, "add_native_token_decimals", add_native_token_decimals);
    console.log(logs);
}

main()
