import { arbitrum, bsc, mainnet } from "viem/chains";
import { FXS_ADDRESS, SD_FXS_ADDRESS } from "./addresses";
import { IProtocol } from "./interfaces";
import { delay } from "./sleepUtils";
import { equals } from "./stringUtils";
import axios from "axios";

const replaceAddress: any = {
    [SD_FXS_ADDRESS.toLowerCase()]: FXS_ADDRESS,
    ["0xA1f82E14bc09A1b42710dF1A8a999B62f294e592".toLowerCase()]: "coingecko:conflux-token",
    ["0x559b7bfC48a5274754b08819F75C5F27aF53D53b".toLowerCase()]: "coingecko:qi-dao"
}

const cacheHistoricalsPrices: any = {};

export const getCoingeckoPrice = (coingeckoLPPrices: any, address: string, replace: boolean = true): number => {
    if(equals(address, "0x4F7796928Bc83D29e66A58D0D3C1346F5E4DB2Fd")) {
        return 1;
    }

    let realAddress = address;
    if (replace) {
        if (replaceAddress[realAddress.toLowerCase()] !== undefined) {
            realAddress = replaceAddress[realAddress.toLowerCase()];
            if (realAddress.indexOf(":") > -1) {
                realAddress = realAddress.split(":")[1];
            }
        }
    }

    let prices = coingeckoLPPrices;
    if (coingeckoLPPrices?.data) {
        prices = coingeckoLPPrices?.data;
    }

    for (const adr of Object.keys(prices)) {
        if (equals(adr, realAddress)) {
            let price = prices[adr].usd;
            if (!price) {
                price = prices[adr].priceUSD;
            }

            return price;
        }
    }

    return 0;
};

export interface IHistoricalPrice {
    address: string;
    timestamp: number;
}

export const getHistoricalPricesFromContracts = async (protocol: IProtocol, data: IHistoricalPrice[]): Promise<any> => {

    const chainName = getChainName(protocol);
    const calls: any[] = [];
    const ids: any = {};

    for (let i = 0; i < data.length; i++) {
        const d = data[i];
        const url = `https://coins.llama.fi/prices/historical/${d.timestamp}/${chainName}:${d.address}`;
        if (!cacheHistoricalsPrices[url]) {
            calls.push(axios.get(url));
            ids[i] = true;
            await delay(1000);
        }
    }

    let callsResp: any[] = [];
    if (calls.length > 0) {
        callsResp = await Promise.all(calls);
    }

    const resp = {
        data: {}
    };

    for (let i = 0; i < data.length; i++) {
        const d = data[i];
        const url = `https://coins.llama.fi/prices/historical/${d.timestamp}/${chainName}:${d.address}`;

        let response = null;
        if (ids[i]) {
            response = callsResp.shift();
            cacheHistoricalsPrices[url] = response;
        } else {
            console.log("Dans le cache ", url )
            response = cacheHistoricalsPrices[url];
        }
        
        const res = removeKey(response.data.coins);
        resp.data = {
            ...resp.data,
            ...res
        };
    }

    return resp;
}

const removeKey = (data: any): any => {
    const response: any = {};
    for(const key of Object.keys(data)) {
        const d = data[key];
        d.priceUSD = d.price;
        d.usd = d.priceUSD;
        response[key.split(":")[1]] = d;
    }

    return response;
}

const getChainName = (protocol: IProtocol): string => {
    switch (protocol.protocolChainId) {
        case mainnet.id:
            return "ethereum";
        case bsc.id:
            return "bsc";
        case arbitrum.id:
            return "arbitrum";
        default:
            throw new Error("Protocol unknow");
    }
}