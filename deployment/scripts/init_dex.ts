import fs from "fs";
import dotenv from "dotenv";
import { init_wasm_code } from "./init_contract";
import { upload_wasm_code } from "./upload_wasm";
import { Network, PrivateKey } from "@routerprotocol/router-chain-sdk-ts";
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

  let wasmSuffix = ".wasm";
  if (process.env.IS_APPLE_CHIPSET == "YES") {
    wasmSuffix = "-aarch64.wasm"
  }
  const dexSetupFilePath = "config/dex.json";
  const dexSetup = JSON.parse(fs.readFileSync(dexSetupFilePath, "utf-8"));

  console.log("\nUploading the routerswap_factory.wasm...");
  const swapFactoryCodeId = await upload_wasm_code(
    network,
    privateKeyHash,
    "../artifacts/routerswap_factory" + wasmSuffix
  );

  console.log("\nUploading the routerswap_pair.wasm...");
  const pairCodeId = await upload_wasm_code(
    network,
    privateKeyHash,
    "../artifacts/routerswap_pair" + wasmSuffix
  );

  console.log("\nUploading the routerswap_router.wasm...");
  const swapRouterCodeId = await upload_wasm_code(
    network,
    privateKeyHash,
    "../artifacts/routerswap_router" + wasmSuffix
  );

  console.log("\nUploading the routerswap_token.wasm...");
  const tokenCodeId = await upload_wasm_code(
    network,
    privateKeyHash,
    "../artifacts/routerswap_token" + wasmSuffix
  );

  const swapFacotryInitMsg = JSON.stringify({
    "pair_code_id": parseInt(pairCodeId),
    "token_code_id": parseInt(tokenCodeId)
  });
  console.log("\nInstantiating the RouterSwap Factory...");
  const swapFactoryAddr = await init_wasm_code(swapFactoryCodeId, "Router Swap Factory", swapFacotryInitMsg);
  console.log("swapFactoryAddr", swapFactoryAddr);

  const swapRouterInitMsg = JSON.stringify({
    "routerswap_factory": swapFactoryAddr
  });
  console.log("\nInstantiating the RouterSwap Router...");
  const swapRouterAddr = await init_wasm_code(swapRouterCodeId, "Router swap Route", swapRouterInitMsg);
  console.log("swapRouteAddr", swapRouterAddr);

  const privateKey = PrivateKey.fromPrivateKey(privateKeyHash);

  if (!dexSetup[network]) {
    dexSetup[network] = {};
  }
  dexSetup[network]["routerSwapFactory"] = {
    "addr": swapFactoryAddr,
    "code_id": swapFactoryCodeId
  };
  dexSetup[network]["routerSwapPair"] = {
    "addr": "",
    "code_id": pairCodeId
  };
  dexSetup[network]["routerSwapRouter"] = {
    "addr": swapRouterAddr,
    "code_id": swapRouterCodeId
  };
  dexSetup[network]["token"] = {
    "addr": "",
    "code_id": tokenCodeId
  };
  fs.writeFileSync(dexSetupFilePath, JSON.stringify(dexSetup));
}

main()
