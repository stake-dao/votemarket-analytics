import { ethers } from "ethers";
import { Provider } from "ethers-multicall";
import * as dotenv from "dotenv";

dotenv.config();

export const getNewJsonProvider = (chainId?: number): any => {
    return new ethers.providers.JsonRpcProvider(process.env.RPC_URL, 1);
};

export const getNewDefaultProvider = (chainId: number = -1) => {
    let jsonProvider: any = null;
    if (chainId === -1) {
        jsonProvider = getNewJsonProvider(1);
    } else {
        jsonProvider = getNewJsonProvider(chainId);
    }

    return getNewProvider(jsonProvider, chainId);
}

const getNewProvider = (jsonProvider: ethers.providers.Provider, chainId: number = -1) => {
    if (chainId === -1) {
        chainId = 1;
    }
    return new Provider(jsonProvider, chainId);
}