import {
  getEndpointsForNetwork,
  PrivateKey,
  privateKeyToPublicKeyBase64,
  ChainRestAuthApi,
  createTransaction,
  BigNumberInBase,
  TxRestClient,
  Network,
  TxGrpcClient,
  TxClientSimulateResponse,
  MsgExecuteContract,
  getChainInfoForNetwork,
} from "@routerprotocol/router-chain-sdk-ts";
import dotenv from "dotenv";
import { parseRawLog } from "@cosmjs/stargate/build/logs";
import { logs } from "@cosmjs/stargate";
dotenv.config();

let network = Network.AlphaDevnet;
if (process.env.NETWORK == "devnet") {
  network = Network.Devnet
} else if (process.env.NETWORK == "testnet") {
  network = Network.Testnet
} else if (process.env.NETWORK == "mainnet") {
  network = Network.Mainnet
}
const privateKeyHash = process.env.PRIVATE_KEY;

if (!privateKeyHash) {
  throw new Error("Please set your PRIVATE_KEY in the .env file");
}

const endpoint = getEndpointsForNetwork(network);
const privateKey = PrivateKey.fromPrivateKey(privateKeyHash);

const alice = privateKey.toBech32();

const publicKey = privateKeyToPublicKeyBase64(
  Buffer.from(privateKeyHash, "hex")
);

const restClient = new TxRestClient(endpoint.lcdEndpoint);
const grpcClient = new TxGrpcClient(endpoint.grpcEndpoint);
const chainId = getChainInfoForNetwork(network).chainId;

export const exec_msg = async function (contractAddr: string, action: string, message: Object): Promise<readonly logs.Log[]> {
  /** Get Faucet Accounts details */
  const aliceAccount = await new ChainRestAuthApi(
    endpoint.lcdEndpoint
  ).fetchAccount(alice);

  const executeContractMsg = MsgExecuteContract.fromJSON({
    sender: alice,
    action: action,
    contractAddress: contractAddr,
    msg: message
  });

  let simulationResponse: TxClientSimulateResponse;
  {
    let { txRaw } = createTransaction({
      message: executeContractMsg.toDirectSign(),
      memo: "",
      pubKey: publicKey,
      sequence: parseInt(aliceAccount.account.base_account.sequence, 10),
      accountNumber: parseInt(
        aliceAccount.account.base_account.account_number,
        10
      ),
      chainId: chainId,
    });

    txRaw.setSignaturesList([""]);
    simulationResponse = await grpcClient.simulate(txRaw);
  }

  let gas = parseInt((simulationResponse.gasInfo.gasUsed * 1.3).toString()).toString();
  let amount = new BigNumberInBase(500000001).times(gas).toString();

  const { signBytes, txRaw } = createTransaction({
    message: executeContractMsg.toDirectSign(),
    memo: "",
    fee: {
      amount: [
        {
          amount: amount,
          denom: "route",
        },
      ],
      gas: gas,
    },
    pubKey: publicKey,
    sequence: parseInt(aliceAccount.account.base_account.sequence, 10),
    accountNumber: parseInt(
      aliceAccount.account.base_account.account_number,
      10
    ),
    chainId: chainId,
  });

  /** Sign transaction */
  const signature = await privateKey.sign(signBytes);

  /** Append Signatures */
  txRaw.setSignaturesList([signature]);

  /** Broadcast transaction */
  let txxResponse = await restClient.broadcast(txRaw);
  let txResponse = await restClient.waitTxBroadcast(txxResponse.txhash);
  const parsedLogs = parseRawLog(txResponse.raw_log)

  return parsedLogs;
}

