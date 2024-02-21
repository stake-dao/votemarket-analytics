import { CRV_ADDRESS } from "./addresses";
import { PROTOCOLS } from "./bountyConfig";
import { IProtocol } from "./interfaces";
import { getNewDefaultProvider } from "./jsonRpcUtils";
import { WEEK } from "./periodUtils";
import { equals } from "./stringUtils";
import { BigNumber } from "@ethersproject/bignumber";
import { formatUnits } from "@ethersproject/units";
import { Contract } from "ethers-multicall";
import CRV_ABI from '../abis/CRV.json';
import TokenAdmin_ABI from '../abis/TokenAdmin.json';

export const CRV_INFLATION_CHANGE = 1691877600 // 13-08-2023
export const CRV_WEEKLY_INFLATION_OLD = 3726757 // Weekly inflation before 13-08-2023
const FXS_WEEKLY_INFLATION = 21875; // Weekly inflation
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

    const multiProvider = getNewDefaultProvider(1);

    switch (protocol.key) {
        case "crv":
            const crvContract = new Contract(CRV_ADDRESS, CRV_ABI as any);
            const crvResp = await multiProvider.all([crvContract.rate()]);
            const crvRate = parseFloat(formatUnits(BigNumber.from(crvResp.shift())));
            return Math.round(crvRate * WEEK);
        case "bal":
            const balancerTokenAdminContract = new Contract(BALANCER_TOKEN_ADMIN, TokenAdmin_ABI as any);
            const resp = await multiProvider.all([balancerTokenAdminContract.getInflationRate()]);
            const balInflationRate = parseFloat(formatUnits(BigNumber.from(resp.shift())));
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