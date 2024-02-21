import { agnosticFetch } from "./agnosticUtils";
import { getProtocolTokenAddressFromBribeContract } from "./bountyUtils";
import { IBribeReport, IClaimedBribeReport, IPeriodBribeReport, IProtocol, IRolloverBribeReport } from "./interfaces";
import { CLAIMED_REWARDS_QUERY, CLAIMED_REWARDS_QUERY_V3, CLAIMED_REWARDS_QUERY_V3_WITH_ISSUE, INCREASED_QUEUED_EVENTS, PRICE_QUERY, QUERY_BRIBE_CREATED, ROLLOVER_QUERY } from "./queries";
import { BigNumber } from "@ethersproject/bignumber";
import moment from "moment";
import { equals } from "./stringUtils";
import { PROTOCOLS, USEFUL_BLACKLIST_ADDRESSES } from "./bountyConfig";
import { Contract } from "ethers-multicall";
import BribePlateformV5_ABI from '../abis/BribePlateform.json';
import CurveGaugeController_ABI from '../abis/CurveGaugeController.json';
import ERC20_ABI from '../abis/ERC20.json';
import { WEEK } from "./periodUtils";
import { ethers } from "ethers";
import { BAL_ADDRESS, FXS_ADDRESS, SD_FXS_ADDRESS } from "./addresses";
import { formatUnits } from "@ethersproject/units";
import { JsonRpcProvider } from "@ethersproject/providers";
import { getNewDefaultProvider } from "./jsonRpcUtils";
import { getCoingeckoPrice, getHistoricalPricesFromContracts } from "./pricesUtils";
import * as dotenv from "dotenv";

dotenv.config();

export const getBribeAnalytics = async (bribeContract: string, id: string, mapGauges: any[], nextPeriod: number, inflation: number): Promise<IBribeReport | any> => {
    const bribeContractStr = bribeContract as string;

    if (!bribeContractStr || !id) {
        return {};
    }

    // Get gauge controller
    const protocol = PROTOCOLS.find((p: IProtocol) => {
        for (const contract of p.bribeContract) {
            if (equals(contract.bribeContract, bribeContractStr)) {
                return true;
            }
        }

        return false;
    });
    const gaugeController = protocol?.gaugeController;

    if (!gaugeController) {
        return {};
    }

    // Fetch bribes data
    const bribes = await agnosticFetch(QUERY_BRIBE_CREATED(bribeContractStr, id as string));
    if (!bribes) {
        return {};
    }

    // Fetch ve contract
    const multiProvider = getNewDefaultProvider(1);

    const claimedCall = agnosticFetch(CLAIMED_REWARDS_QUERY(
        bribeContractStr,
        id as string
    ));

    const claimedV3Call = agnosticFetch(CLAIMED_REWARDS_QUERY_V3(
        bribeContractStr,
        id as string
    ));

    const claimedV3IssueCall = agnosticFetch(CLAIMED_REWARDS_QUERY_V3_WITH_ISSUE(
        bribeContractStr,
        id as string
    ));

    const protocolTokenAddress = getProtocolTokenAddressFromBribeContract(bribeContractStr);

    const bribe = bribes[0];
    if (!bribe) {
        return {};
    }

    const gaugeName = mapGauges.find((m: any) => equals(m.address, bribe[3]))?.name || "";

    const response: IBribeReport = {
        bribeContract: bribe[0],
        created: moment(bribe[1]).unix(),
        id: BigNumber.from(bribe[2]),
        gaugeAddress: bribe[3],
        gaugeName,
        manager: bribe[4],
        rewardTokenAddress: bribe[5],
        rewardTokenName: bribe[11],
        numberOfPeriods: parseInt(bribe[6]),
        maxRewardPerVote: BigNumber.from(bribe[7]),
        rewardPerPeriod: BigNumber.from(bribe[8]),
        totalRewardAmount: BigNumber.from(bribe[9]),
        isUpgradable: parseInt(bribe[10]) === 1,
        blacklistedAddresses: [],
        periods: [],
        protocolTokenDecimal: 0,
        protocolTokenSymbol: "",
        rewardTokenDecimals: 0,
        rewardTokenSymbol: "",
        weeklyIncentive: 0
    };

    // Check if we have an increased
    const increased = await agnosticFetch(INCREASED_QUEUED_EVENTS(bribeContractStr, id as string));
    if (increased && increased.length > 0) {
        response.numberOfPeriods = parseInt(increased[0][0]);
    }

    const rolloverCall = agnosticFetch(ROLLOVER_QUERY(
        bribeContractStr,
        id as string,
        response.rewardTokenAddress
    ));

    // Manage blacklist addresses
    const contract = new Contract(bribeContractStr, BribePlateformV5_ABI);
    const erc20 = new Contract(response.rewardTokenAddress, ERC20_ABI);
    const erc20ProtocolToken = new Contract(protocolTokenAddress, ERC20_ABI);
    const [
        blacklistedAddresses,
        decimals,
        symbol,
        protocolTokenSymbol,
        protocolTokenDecimal
    ] = await multiProvider.all([
        contract.getBlacklistedAddressesPerBounty(response.id),
        erc20.decimals(),
        erc20.symbol(),
        erc20ProtocolToken.symbol(),
        erc20ProtocolToken.decimals()
    ]);

    response.rewardTokenDecimals = decimals;
    response.rewardTokenSymbol = symbol;
    response.protocolTokenSymbol = protocolTokenSymbol;
    response.protocolTokenDecimal = protocolTokenDecimal;

    response.blacklistedAddresses = blacklistedAddresses.map((address: string) => {
        let name = "Unknown voter";
        const usefulBlacklist = USEFUL_BLACKLIST_ADDRESSES.find((b: any) => equals(b.address, address));
        if (usefulBlacklist) {
            name = usefulBlacklist.name;
        }

        return {
            name,
            address,
        };
    });

    // Get claimed data
    const [claimedResp, claimedV3Resp, claimedV3IssueResp] = await Promise.all([
        claimedCall,
        claimedV3Call,
        claimedV3IssueCall
    ]);

    let claimed: IClaimedBribeReport[] = [];
    if (claimedResp) {
        claimed = claimedResp.map((c: any) => {
            return {
                timestamp: moment(c[2]).unix(),
                amountBN: BigNumber.from(c[4]),
                amount: BigNumber.from(c[4]).div(BigNumber.from(10).pow(decimals)).toNumber()
            }
        });
    }

    if (claimedV3Resp) {
        claimed = claimed.concat(claimedV3Resp.map((c: any) => {
            return {
                timestamp: moment(c[2]).unix(),
                amountBN: BigNumber.from(c[4]),
                amount: BigNumber.from(c[4]).div(BigNumber.from(10).pow(decimals)).toNumber()
            }
        }));
    }

    if (claimedV3IssueResp) {
        claimed = claimed.concat(claimedV3IssueResp.map((c: any) => {
            return {
                timestamp: moment(c[2]).unix(),
                amountBN: BigNumber.from(c[4]),
                amount: BigNumber.from(c[4]).div(BigNumber.from(10).pow(decimals)).toNumber()
            }
        }));
    }

    // Get rollover
    const rolloverResp = await rolloverCall;
    let rollovers: IRolloverBribeReport[] = [];
    if (rolloverResp) {
        rollovers = rolloverResp.map((r: any) => {
            const amount = BigNumber.from(r[1]).div(BigNumber.from(10).pow(decimals)).toNumber();
            return {
                timestamp: moment(r[0]).unix(),
                amountBN: BigNumber.from(r[1]),
                amount,
                price: parseFloat(r[2]) / amount,
            }
        });
    }

    // Iterate on each periods to calculate data

    while (nextPeriod > response.created) {
        nextPeriod -= WEEK;
    }

    let claimedStart = moment.unix(nextPeriod + WEEK);

    const calls: any[] = [];
    const prov = new JsonRpcProvider(
        {
            url: "https://rpc.ankr.com/eth",
        },
        1,
    );
    const blockNumber = await prov.getBlockNumber();
    const now = moment();
    const protocolTokenPriceCall: any[] = [];
    const tokenRewardPriceCall: any[] = [];
    const gaugeControllerContract = new Contract(gaugeController, CurveGaugeController_ABI as any);

    let iface = new ethers.utils.Interface(CurveGaugeController_ABI as any);
    let nextThursdayGaugeData = moment.utc(claimedStart).add(-1, "week");

    const fetchHistoricalsDataCall = fetchHistoricalsData(
        iface,
        response,
        moment.unix(nextThursdayGaugeData.unix()),
        now,
        blockNumber,
        gaugeController
    );

    for (let i = 0; i < response.numberOfPeriods; i++) {
        nextThursdayGaugeData = nextThursdayGaugeData.add(1, "week");

        const next = nextThursdayGaugeData.unix();
        calls.push(gaugeControllerContract.points_weight(response.gaugeAddress, moment.unix(next).unix()));

        protocolTokenPriceCall.push(agnosticFetch(PRICE_QUERY(protocolTokenAddress, next, BigNumber.from(1).mul(BigNumber.from(10).pow(protocolTokenDecimal)))));

        tokenRewardPriceCall.push(getHistoricalPricesFromContracts([{
            address: getRealTokenRewardAddress(response.rewardTokenAddress),
            timestamp: next
        }]));
    }

    const callsResp = await multiProvider.all(calls);
    const weights = await fetchHistoricalsDataCall;

    for (let i = 0; i < response.numberOfPeriods; i++) {
        weights[i].gaugeWeight = callsResp[i].bias;
    }

    const protocolTokenPrices = await Promise.all(protocolTokenPriceCall);
    const tokenRewardPrices = await Promise.all(tokenRewardPriceCall);

    response.weeklyIncentive = inflation;

    const claimStartClone = moment(claimedStart);

    for (let i = 0; i < response.numberOfPeriods; i++) {

        // Get claimed during period
        const claimedEnd = moment(claimedStart).add(1, "week");
        const claimedPeriod: IClaimedBribeReport[] = claimed.filter((c: IClaimedBribeReport) => {
            return claimedStart.unix() <= c.timestamp && claimedEnd.unix() >= c.timestamp;
        });

        const totalClaimed = claimedPeriod.reduce((acc: BigNumber, c: IClaimedBribeReport) => acc.add(c.amountBN), BigNumber.from(0));

        const period: IPeriodBribeReport = {
            allocatedRewards: BigNumber.from(0),
            allocatedRewardsUSD: 0,
            periodNumber: i + 1,
            claimedRewards: totalClaimed,
            claimedRewardsUSD: 0,
            startClaim: claimedStart.unix(),
            endClaim: claimedEnd.unix(),
            activePeriod: moment().isBefore(claimedEnd),
            unclaimedRewards: BigNumber.from(0),
            votesReceived: BigNumber.from(0),
            totalWeight: BigNumber.from(0),
            incentiveDirectedBN: BigNumber.from(0),
            incentiveDirected: 0,
            realPricePerVoteAchieved: 0,
            realPricePerVoteAchievedUSD: 0,
            tokenRewardPrice: 0,
            incentiveProtocolTokenUSD: 0,
            incentiveBoostAchieved: 0,
            incentiveDirectedUSD: 0,
        };

        // Find allocated rewards during the period
        if (now.isAfter(claimStartClone)) {
            const rollover = rollovers.find((r: IClaimedBribeReport) => r.timestamp > period.startClaim && r.timestamp < moment.unix(period.startClaim).add(6, "days").unix());
            let isActivePeriod = false;
            if (rollover) {
                period.allocatedRewards = BigNumber.from(rollover.amountBN);
                isActivePeriod = true;
            } else if (i === 0) {
                period.allocatedRewards = BigNumber.from(response.rewardPerPeriod);
                isActivePeriod = true;
            } else {
                period.allocatedRewards = BigNumber.from(0);
            }

            if (isActivePeriod) {
                period.unclaimedRewards = BigNumber.from(period.allocatedRewards).sub(totalClaimed);
                period.votesReceived = BigNumber.from(weights[i].gaugeWeight);
                period.totalWeight = BigNumber.from(weights[i].totalWeight);

                // Remove weight from blacklisted address
                let total = BigNumber.from(0);
                for (const w of weights[i].usersWeight) {
                    const veCRVVoted = BigNumber.from(w.slope).mul(BigNumber.from(w.end).sub(claimedStart.utc().valueOf() / 1000));
                    total = total.add(veCRVVoted);
                }

                // Check neg
                if (total.lte(period.votesReceived)) {
                    period.votesReceived = BigNumber.from(period.votesReceived).sub(total);
                }

                let inflationBN = BigNumber.from(inflation).mul(BigNumber.from(10).pow(decimals));
                if (equals(protocolTokenAddress, BAL_ADDRESS)) {
                    inflationBN = BigNumber.from(inflation);
                }
                period.incentiveDirectedBN = inflationBN.mul(period.votesReceived).div(period.totalWeight);
                period.incentiveDirected = parseFloat(formatUnits(period.incentiveDirectedBN, decimals));
                period.incentiveProtocolTokenUSD = parseFloat(protocolTokenPrices[i][0][0]);
                period.incentiveDirectedUSD = period.incentiveDirected * period.incentiveProtocolTokenUSD;

                if (equals(protocol.key, 'fxs')) {
                    period.incentiveDirectedUSD /= 4;
                }

                const tokenRewardPrice = getCoingeckoPrice(tokenRewardPrices[i]?.data || {}, getRealTokenRewardAddress(response.rewardTokenAddress), false);

                const totalClaimedNumber = parseFloat(formatUnits(totalClaimed, decimals));
                const voteReceivedNumber = parseFloat(formatUnits(period.votesReceived, 18));
                period.allocatedRewardsUSD = parseFloat(formatUnits(period.allocatedRewards, decimals)) * tokenRewardPrice;
                period.realPricePerVoteAchieved = totalClaimedNumber / checkDiv(voteReceivedNumber);
                period.realPricePerVoteAchievedUSD = tokenRewardPrice * period.realPricePerVoteAchieved;
                period.tokenRewardPrice = tokenRewardPrice;
                period.claimedRewardsUSD = totalClaimedNumber * tokenRewardPrice;
                period.incentiveBoostAchieved = period.incentiveDirectedUSD / checkDiv(period.claimedRewardsUSD);
            }
        }

        response.periods.push(period);

        claimedStart = claimedEnd;
    }

    return response;
}

const checkDiv = (d: number): number => {
    return d === 0 ? 1 : d;
}

const fetchHistoricalsData = async (
    iface: ethers.utils.Interface,
    response: IBribeReport,
    nextThursdayGaugeData: moment.Moment,
    now: moment.Moment,
    blockNumber: number,
    gaugeController: string
) => {
    try {
        return await fetchHistoricals(
            process.env.RPC_URL,
            iface,
            response,
            moment.unix(nextThursdayGaugeData.unix()),
            now,
            blockNumber,
            gaugeController
        );

    }
    catch (e) {
        // Retry
        return await fetchHistoricals(
            process.env.RPC_URL,
            iface,
            response,
            moment.unix(nextThursdayGaugeData.unix()),
            now,
            blockNumber,
            gaugeController
        );
    }

};

const fetchHistoricals = async (
    url: string,
    iface: ethers.utils.Interface,
    response: IBribeReport,
    nextThursdayGaugeData: moment.Moment,
    now: moment.Moment,
    blockNumber: number,
    gaugeController: string
) => {
    const prov = new JsonRpcProvider(
        {
            url,
        },
        1,
    );

    const callsPointWeight: any[] = [];
    for (let i = 0; i < response.numberOfPeriods; i++) {
        nextThursdayGaugeData = nextThursdayGaugeData.add(1, "week");

        let next = nextThursdayGaugeData.unix();
        next = moment.unix(next).add(0, "hour").unix();

        let numberOfBlockSince = Math.max(Math.round((now.unix() - next) / 12), 0);

        const data = iface.encodeFunctionData("get_total_weight");
        callsPointWeight.push(prov.call({
            to: gaugeController,
            data
        },
            blockNumber - numberOfBlockSince));

        for (const blacklist of response.blacklistedAddresses) {
            const data = iface.encodeFunctionData("vote_user_slopes", [blacklist.address, response.gaugeAddress]);

            callsPointWeight.push(prov.call({
                to: gaugeController,
                data
            },
                blockNumber - numberOfBlockSince));
        }
    }

    const callsRespPointWeight = await Promise.all(callsPointWeight);

    return await computeHistoricalData(
        response,
        callsRespPointWeight,
        iface
    )
}

const computeHistoricalData = async (
    response: IBribeReport,
    calls: any[],
    iface: ethers.utils.Interface,
) => {
    let indexPointWeight = 0;
    const weights: any = {};
    for (let i = 0; i < response.numberOfPeriods; i++) {
        const weight = {
            totalWeight: BigNumber.from(0),
            usersWeight: [],
        };

        const totalWeightResp = calls[indexPointWeight];
        indexPointWeight++;
        const data = iface.decodeFunctionResult("get_total_weight", totalWeightResp);
        weight.totalWeight = BigNumber.from(data[0]).div(BigNumber.from(10).pow(18));

        for (const blacklist of response.blacklistedAddresses) {
            const pointWeight = calls[indexPointWeight];
            indexPointWeight++;

            const data = iface.decodeFunctionResult("vote_user_slopes", pointWeight);
            (weight.usersWeight as any[]).push(data);
        }

        weights[i] = weight;
    }

    return weights;
}

const getRealTokenRewardAddress = (tokenReward: string): string => {
    if (equals(tokenReward, SD_FXS_ADDRESS)) {
        return FXS_ADDRESS;
    }

    return tokenReward;
}