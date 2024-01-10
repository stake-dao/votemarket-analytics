import { FXS_ADDRESS, SD_FXS_ADDRESS } from "./addresses";
import { delay } from "./sleepUtils";
import { equals } from "./stringUtils";
import axios from "axios";

const GECKO_TERMINAL_BASE_API = "https://api.geckoterminal.com/api/v2"

const CHUNCK_SIZE = 20;

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

export const getDecimalsFromAddress = (coingeckoLPPrices: any, address: string): number => {
    if (equals(address, "0x7f68662a04744E97bC606790470D9b31e418e614")) {
        return 18;
    }
    let prices = coingeckoLPPrices;
    if (coingeckoLPPrices?.data) {
        prices = coingeckoLPPrices?.data;
    }
    for (const adr of Object.keys(prices)) {
        if (adr.toLowerCase() === address.toLowerCase()) {
            return prices[adr].decimals;
        }
    }

    return 0;
};

export const getSDPrice = (prices: any, address: string): number => {
    try {
        for (const adr of Object.keys(prices)) {
            if (adr.toLowerCase() === address.toLowerCase()) {
                return prices[adr].priceUSD;
            }
        }

        return 0;
    }
    catch (e) {
        return 0;
    }
};

export const getStratUnderlyingTokenPrices = async (strats: any[]): Promise<any> => {
    const addresses: string[] = [];

    for (const strat of strats) {
        if (strat.underlyingToken) {
            addresses.push(strat.underlyingToken.address);
        } else {
            for (const underlyingToken of strat.underlyingTokens) {
                addresses.push(underlyingToken.address);
            }
        }
    }

    return await getPricesFromContracts(addresses.join(","));
}

export const getPricesFromContracts = async (contracts: string, chainId: number | undefined = 1): Promise<any> => {
    let addresses = contracts.split(",");

    // Remove duplicates
    let uniqueAddresses: any = {};
    for (const addr of addresses) {
        let realAddress = addr;
        if (replaceAddress[realAddress.toLowerCase()] !== undefined) {
            realAddress = replaceAddress[realAddress.toLowerCase()];
        }
        if (!uniqueAddresses[realAddress]) {
            uniqueAddresses[realAddress] = true;
        }
    }

    addresses = Object.keys(uniqueAddresses);

    let chunks = [addresses];
    if (addresses.length > CHUNCK_SIZE) {
        chunks = spliceIntoChunks(addresses, CHUNCK_SIZE);
    }

    const resp = {
        data: {}
    };

    let chainName = "";
    switch (chainId) {
        case 1:
            chainName = "ethereum";
            break;
        case 56:
            chainName = "bsc";
            break;
        case 42161:
            chainName = "arbitrum";
            break;
        default:
            chainName = "ethereum";
            break;
    }

    for (const arr of chunks) {

        const str = arr.map((addr: string) => {
            if (addr.indexOf(":") === -1) {
                return chainName + ":" + addr;
            }

            return addr;
        }).join(",");

        const r = await axios.get(`https://coins.llama.fi/prices/current/${str}`);

        const res = removeKey(r.data.coins);

        resp.data = {
            ...resp.data,
            ...res
        };
    }

    return resp;
}

export const getPriceFromTokenPool = async (tokenAddress: string, chainId: number | undefined = 1): Promise<number> => {   
    try { 
        const chainName = chainId === 1 ? "eth" : "arbitrum";

        const poolRequest = await axios.get(`${GECKO_TERMINAL_BASE_API}/networks/${chainName}/tokens/${tokenAddress}?include=top_pools`);
        const poolsData = poolRequest.data.included.sort(
            (a: any, b: any) => (Number(a.attributes.reserve_in_usd) > Number(b.attributes.reserve_in_usd) ? -1 : 1)
        )
        const priceInUsd = Number(poolsData[0].attributes.base_token_price_usd)

        return priceInUsd
    }
    catch {
        return 0
    }
}

export interface IHistoricalPrice {
    address: string;
    timestamp: number;
}

export const getHistoricalPricesFromContracts = async (data: IHistoricalPrice[]): Promise<any> => {

    const calls: any[] = [];
    for (const d of data) {
        const url = `https://coins.llama.fi/prices/historical/${d.timestamp}/ethereum:${d.address}`;
        if (!cacheHistoricalsPrices[url]) {
            calls.push(axios.get(url));
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

    for (const d of data) {
        const url = `https://coins.llama.fi/prices/historical/${d.timestamp}/ethereum:${d.address}`;

        let response = null;
        if (!cacheHistoricalsPrices[url]) {
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

export const getPricesFromIds = async (ids: string[]): Promise<any> => {
    let addresses = ids;

    // Remove duplicates
    let uniqueAddresses: any = {};
    for (const addr of addresses) {
        if (!uniqueAddresses[addr]) {
            uniqueAddresses[addr] = true;
        }
    }

    addresses = Object.keys(uniqueAddresses);

    let chunks = [addresses];
    if (addresses.length > CHUNCK_SIZE) {
        chunks = spliceIntoChunks(addresses, CHUNCK_SIZE);
    }

    const resp = {
        data: {}
    };

    for (const arr of chunks) {
        const str = arr.map((addr: string) => "coingecko:" + addr).join(",");

        const r = await axios.get(`https://coins.llama.fi/prices/current/${str}`);

        const res = removeKey(r.data.coins);
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

export const spliceIntoChunks = (arr: any[], chunkSize: number): any[] => {
    const res: any = [];
    while (arr.length > 0) {
        const chunk = arr.splice(0, chunkSize);
        res.push(chunk);
    }
    return res;
}