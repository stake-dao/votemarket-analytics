import * as dotenv from "dotenv";
import { PublicClient, createPublicClient, http } from "viem";
import { IProtocol } from "./interfaces";
import * as chains from 'viem/chains'

dotenv.config();

export const getClient = (protocol: IProtocol): PublicClient | null => {
    for (const chain of Object.values(chains)) {
        if ('id' in chain && chain.id === protocol.protocolChainId) {
            return createPublicClient({
                chain,
                transport: http(),
                batch: {
                    multicall: true,
                },
            });
        }
    }

    return null;
}