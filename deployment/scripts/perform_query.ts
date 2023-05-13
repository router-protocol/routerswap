import {
    getEndpointsForNetwork,
    PrivateKey,
    privateKeyToPublicKeyBase64,
    ChainRestAuthApi,
    createTransaction,
    BigNumberInBase,
    TxRestClient,
    Network,
    MsgStoreCode,
    TxGrpcClient,
    TxClientSimulateResponse,
    ChainGrpcWasmApi,
    toUtf8,
    ChainGrpcBankApi,
} from "@routerprotocol/router-chain-sdk-ts";
import fs from "fs";
import dotenv from "dotenv";
import { parseRawLog } from "@cosmjs/stargate/build/logs";
import { logs } from "@cosmjs/stargate";
dotenv.config();

export const query_balance = async function (network: Network, account: string): Promise<number> {
    const endpoint = getEndpointsForNetwork(network);

    const bankClient = new ChainGrpcBankApi(endpoint.grpcEndpoint);

    const routersBalances = await bankClient.fetchBalance({
        accountAddress: account,
        denom: "route",
    });
    const bal = parseInt(routersBalances.amount.slice(0, -18));
    if (Number.isNaN(bal)) {
        return 0;
    }
    return bal;
}

export const perform_query = async function (network: Network, contract: string, msg: Object): Promise<any> {
    const endpoint = getEndpointsForNetwork(network);

    const wasmClient = new ChainGrpcWasmApi(endpoint.grpcEndpoint);
    const queryObject = toUtf8(JSON.stringify(msg));
    const fetchSmartContractStateResult = await wasmClient.fetchSmartContractState(
        contract,
        queryObject
    );
    return fetchSmartContractStateResult;
}
