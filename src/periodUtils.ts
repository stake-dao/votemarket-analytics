import { getNewJsonProvider } from "./jsonRpcUtils";

export const WEEK = 604800;

export const startNextPeriod = async (): Promise<number> => {
    const provider = getNewJsonProvider();
    const currentBlock = await provider.getBlockNumber();
    const blockTimestamp = (await provider.getBlock(currentBlock)).timestamp;
    const currentPeriodTimestamp = Math.floor((blockTimestamp / WEEK)) * WEEK;
    return currentPeriodTimestamp + WEEK;
}