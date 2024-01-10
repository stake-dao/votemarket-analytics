import { IProtocol } from "./interfaces";
import { getClient } from "./jsonRpcUtils";

export const WEEK = 604800;

export const startNextPeriod = async (protocol: IProtocol): Promise<number> => {
    const client = getClient(protocol);
    const blockTimestamp = (await client.getBlock()).timestamp;

    const week = protocol.roundDuration * WEEK;

    const currentPeriodTimestamp = Math.floor((Number(blockTimestamp) / week)) * week;
    return currentPeriodTimestamp + week;
}