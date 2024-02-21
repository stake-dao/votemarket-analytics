import * as dotenv from "dotenv";
import { IBribeGeneralReport, IBribeReport, IProtocol } from "./interfaces";
import { isArray } from "lodash";
import { getAllGauges } from "./gaugesUtils";
import { getAllAnalyticsBribesByProtocol } from "./bountyUtils";
import { getBribeAnalytics } from "./bribeAnalytics";
import { PROTOCOLS } from "./bountyConfig";
import * as fs from 'fs';
import { startNextPeriod } from "./periodUtils";
import { getInflationFromBribeContract } from "./inflationUtils";
import { formatUnits } from "viem";
import moment from "moment";

dotenv.config();

const MAX_NUMBER_WEEKS = 9;
const ANALYTICS_PROTOCOL = ["cake", "crv", "bal", "fxs"];

const analyticsAvailable = (protocol: IProtocol): boolean => {
    return ANALYTICS_PROTOCOL.some((a) => protocol.key.toLowerCase() === a);
}

(BigInt.prototype as any).toJSON = function () {
    return this.toString();
};

const main = async () => {
    const mapGauges = await getAllGauges();
    const periods: any = {};

    for (const protocol of PROTOCOLS) {
        if (!analyticsAvailable(protocol)) {
            continue;
        }

        let nextPeriod: number = periods[protocol.protocolChainId];

        if (!nextPeriod) {
            nextPeriod = await startNextPeriod(protocol);
            periods[protocol.protocolChainId] = nextPeriod;
        }

        try {
            const bribes = await getAllAnalyticsBribesByProtocol(protocol.key);
            console.log(bribes)
            const gauges = mapGauges[protocol.key.toLowerCase()];

            const bribeAnalytics: IBribeReport[] = [];
            const inflations: any = {};

            for (const bribe of bribes) {
                try {
                    if (!inflations[bribe.bribeContract]) {
                        inflations[bribe.bribeContract] = await getInflationFromBribeContract(bribe.bribeContract);
                    }

                    bribeAnalytics.push(await getBribeAnalytics(bribe.bribeContract, bribe.id.toString(), gauges, nextPeriod, inflations[bribe.bribeContract]));
                }
                catch (e) {
                    console.log(e);
                }
            }

            let data: any = {};

            // We have to sum all data
            for (const ba of bribeAnalytics) {
                // Iterate on each periods to calculate data
                const desiredWeekday = 4; // Thursday
                const currentWeekday = moment.unix(ba.created).isoWeekday();
                let claimedStart = moment.unix(ba.created).startOf('day');

                if (currentWeekday === desiredWeekday) {
                    claimedStart = moment(claimedStart).add(1, "week");
                } else {
                    const missingDays = ((desiredWeekday - currentWeekday) + 7) % 7;
                    claimedStart = claimedStart.add(missingDays, "days");
                }

                let period = claimedStart.unix();

                if (isArray(ba.periods)) {
                    for (const p of ba.periods) {
                        if (!data[period]) {
                            data[period] = [];
                        }

                        if (p.incentiveDirectedUSD > 0) {
                            const votes = parseFloat(formatUnits(p.votesReceived, 18));
                            data[period].push({
                                totalDirectedIncentivesUSD: p.incentiveDirectedUSD || 0,
                                totalAllocatedRewardsUSD: p.allocatedRewardsUSD || 0,
                                realPricePerVoteAchievedUSD: p.realPricePerVoteAchievedUSD || 0,
                                totalIncentiveBoostAchieved: p.incentiveBoostAchieved || 0,
                                totalVoteReceived: votes || 0,
                                totalClaimedUSD: p.claimedRewardsUSD || 0,
                                gaugeName: ba.gaugeName,
                                gaugeAddress: ba.gaugeAddress,
                                bribeContract: ba.bribeContract,
                                tokenRewardAddress: ba.rewardTokenAddress,
                                id: Number(ba.id),
                            });
                        }

                        period = moment.unix(period).add(1, "week").unix();
                    }
                }
            }

            // remove periods where we don't have data
            let dataCloned = { ...data };
            for (const period of Object.keys(data)) {
                if (data[period].length === 0) {
                    delete dataCloned[period];
                }
            }
            data = dataCloned;

            // We keep 4 weeks max
            dataCloned = { ...data };
            const now = moment();
            for (const period of Object.keys(data)) {
                const diff = now.diff(moment.unix(parseInt(period)), "week");
                if (diff > MAX_NUMBER_WEEKS) {
                    delete dataCloned[period];
                }
            }
            data = dataCloned;

            let responses: IBribeGeneralReport[] = [];
            for (const period of Object.keys(data)) {
                for (const p of data[period]) {
                    responses.push({
                        period: parseInt(period),
                        ...p,
                    });
                }
            }

            responses = responses.sort((a: any, b: any) => {
                if (a.period === b.period) {
                    return 0;
                }

                if (a.period < b.period) {
                    return -1;
                }

                return 1;
            });

            console.log(responses)
            fs.writeFileSync(`./analytics/${protocol.key.toLowerCase()}.json`, JSON.stringify(responses));
        }
        catch (e) {
            console.log(e);
        }
    }
};

main().catch((error) => {
    console.error(error);
});