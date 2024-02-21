import { agnosticFetch } from "./agnosticUtils";
import { PROTOCOLS } from "./bountyConfig";
import { getAllGauges } from "./gaugesUtils";
import { IAnalyticsBribe, IProtocol } from "./interfaces";
import { QUERY_BRIBES_CREATED } from "./queries";
import { equals } from "./stringUtils";

export const getProtocolTokenAddressFromBribeContract = (bribeContract: string): string => {
    const protocol = PROTOCOLS.find((p: IProtocol) => {
        for (const b of p.bribeContract) {
            if (equals(b.bribeContract, bribeContract)) {
                return true;
            }
        }

        return false;
    });
    if (!protocol) {
        return "";
    }

    return protocol.protocolTokenAddress;
}


export const getAllAnalyticsBribesByProtocol = async (protocolKey: string): Promise<IAnalyticsBribe[]> => {
    const protocol = PROTOCOLS.find((protocol: IProtocol) => equals(protocol.key, protocolKey));
    if (!protocol) {
        return [];
    }

    const contracts = protocol.bribeContract.map((b) => b.bribeContract);
    console.log(QUERY_BRIBES_CREATED(protocol.table, contracts))
    const bribes = await agnosticFetch(QUERY_BRIBES_CREATED(protocol.table, contracts));
    return await getAnalyticsBribes(bribes);
}


const getAnalyticsBribes = async (bribes: any[]): Promise<IAnalyticsBribe[]> => {
    if (!bribes) {
        return [];
    }

    const mapGauges = await getAllGauges();

    const responses: IAnalyticsBribe[] = [];

    for (const bribe of bribes) {
        responses.push({
            bribeContract: bribe[0],
            created: bribe[1],
            id: BigInt(bribe[2]),
            gaugeAddress: bribe[3],
            gaugeName: mapGauges[bribe[3].toLowerCase()] || ""
        });
    }

    return responses;
}