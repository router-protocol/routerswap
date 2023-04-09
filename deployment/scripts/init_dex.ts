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
  const chainId = process.env.CHAIN_ID;
  if (!chainId) {
    throw new Error("Please set your CHAIN_ID in the .env file");
  }

  if (!privateKeyHash) {
    throw new Error("Please set your PRIVATE_KEY in the .env file");
  }

  
  const dexSetupFilePath = "config/dex.json";
  const dexSetup = JSON.parse(fs.readFileSync(dexSetupFilePath, "utf-8"));
  console.log(dexSetup)

  const swapFactoryCodeId = await upload_wasm_code(
    network,
    privateKeyHash,
    chainId,
    "../artifacts/routerswap_factory.wasm"
  );
  const pairCodeId = await upload_wasm_code(
    network,
    privateKeyHash,
    chainId,
    "../artifacts/routerswap_pair.wasm"
  );
  const swapRouterCodeId = await upload_wasm_code(
    network,
    privateKeyHash,
    chainId,
    "../artifacts/routerswap_router.wasm"
  );
  const tokenCodeId = await upload_wasm_code(
    network,
    privateKeyHash,
    chainId,
    "../artifacts/routerswap_token.wasm"
  );

  const swapFacotryInitMsg = JSON.stringify({
    "pair_code_id": parseInt(pairCodeId),
    "token_code_id": parseInt(tokenCodeId)
  });
  const swapFactoryAddr = await init_wasm_code(swapFactoryCodeId, "Router Swap Factory", swapFacotryInitMsg);
  console.log("swapFactoryAddr", swapFactoryAddr);

  const swapRouterInitMsg = JSON.stringify({
    "routerswap_factory": swapFactoryAddr
  });
  const swapRouterAddr = await init_wasm_code(swapRouterCodeId, "Router swap Route", swapRouterInitMsg);
  console.log("swapRouteAddr", swapRouterAddr);

  const privateKey = PrivateKey.fromPrivateKey(privateKeyHash);

  const alice = privateKey.toBech32();

  console.log("admin ->", alice);
  console.log("RouterSwapFactoryCodeId -> code_id-", swapFactoryCodeId, "addr-", swapFactoryAddr);
  console.log("RouterSwapPairCodeId -> code_id-", pairCodeId);
  console.log("RouterSwapRouterCodeId -> code_id-", swapRouterCodeId, "addr-", swapRouterAddr);
  console.log("TokenCodeId -> code_id-", tokenCodeId);

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
