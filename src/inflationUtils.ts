import { CRV_ADDRESS } from "./addresses";
import { PROTOCOLS } from "./bountyConfig";
import { IProtocol } from "./interfaces";
import { getClient } from "./jsonRpcUtils";
import { WEEK } from "./periodUtils";
import { equals } from "./stringUtils";
import CRV_ABI from '../abis/CRV.json';
import TokenAdmin_ABI from '../abis/TokenAdmin.json';
import { formatUnits } from "viem";

export const CRV_INFLATION_CHANGE = 1691877600 // 13-08-2023
export const CRV_WEEKLY_INFLATION_OLD = 3726757 // Weekly inflation before 13-08-2023
const FXS_WEEKLY_INFLATION = 43750; // Weekly inflation
const ANGLE_WEEKLY_INFLATION = 210376; // Weekly inflation
const CAKE_WEEKLY_INFLATION = 401644;

const BALANCER_TOKEN_ADMIN = "0xf302f9F50958c5593770FDf4d4812309fF77414f";

export const getInflationFromBribeContract = async (bribeContract: string): Promise<number> => {
    const protocol = PROTOCOLS.find((p: IProtocol) => {
        for (const c of p.bribeContract) {
            if (equals(c.bribeContract, bribeContract)) {
                return true;
            }
        }

        return false;
    });

    if (!protocol) {
        return -1;
    }

    const client = getClient(protocol);
    if (!client) {
        return -1;
    }

    switch (protocol.key) {
        case "crv":
            const [rate] = await client.multicall({
                contracts: [
                    {
                        address: CRV_ADDRESS as any,
                        abi: CRV_ABI,
                        functionName: 'rate',
                    }
                ]
            });
            if (!rate.result) {
                return 0;
            }
            const crvRate = parseFloat(formatUnits(rate.result as any, 18));
            return Math.round(crvRate * WEEK);
        case "bal":
            const [inflationRate] = await client.multicall({
                contracts: [
                    {
                        address: BALANCER_TOKEN_ADMIN as any,
                        abi: TokenAdmin_ABI,
                        functionName: 'getInflationRate',
                    }
                ]
            });
            if (!inflationRate.result) {
                return 0;
            }

            const balInflationRate = parseFloat(formatUnits(inflationRate as any, 18));
            return Math.round(balInflationRate * WEEK);
        case "fxs":
            return FXS_WEEKLY_INFLATION;
        case "angle":
            return ANGLE_WEEKLY_INFLATION;
        case "cake":
            return CAKE_WEEKLY_INFLATION;
        default:
            return -1;
    }
}