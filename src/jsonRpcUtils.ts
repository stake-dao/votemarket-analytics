import * as dotenv from "dotenv";
import { PublicClient, createPublicClient, http } from "viem";
import { IProtocol } from "./interfaces";
import * as chains from 'viem/chains'

dotenv.config();

export const getClient = (protocol: IProtocol, url?: string): PublicClient | null => {
    for (const chain of Object.values(chains)) {
        if ('id' in chain && chain.id === protocol.protocolChainId) {

            return createPublicClient({
                chain,
                transport: http(url),
                batch: {
                    multicall: true,
                },
            });
        }
    }

    return null;
}

export const getRpcUrlFromEnv = (protocol: IProtocol): string | undefined => {
    switch (protocol.protocolChainId) {
        case chains.mainnet.id:
            return process.env.RPC_URL;
        case chains.bsc.id:
            return process.env.BSC_RPC_URL;
        default:
            return undefined;
    }
}