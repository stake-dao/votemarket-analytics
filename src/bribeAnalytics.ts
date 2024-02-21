import { agnosticFetch } from "./agnosticUtils";
import { getProtocolTokenAddressFromBribeContract } from "./bountyUtils";
import { IBribeReport, IClaimedBribeReport, IPeriodBribeReport, IProtocol, IRolloverBribeReport } from "./interfaces";
import { CLAIMED_REWARDS_QUERY, INCREASED_QUEUED_EVENTS, PRICE_QUERY, QUERY_BRIBE_CREATED, ROLLOVER_QUERY } from "./queries";
import moment from "moment";
import { equals } from "./stringUtils";
import { PROTOCOLS, USEFUL_BLACKLIST_ADDRESSES } from "./bountyConfig";
import BribePlateformV5_ABI from '../abis/BribePlateform.json';
import CurveGaugeController_ABI from '../abis/CurveGaugeController.json';
import CakeGaugeController_ABI from '../abis/CakeGaugeController.json';
import ERC20_ABI from '../abis/ERC20.json';
import { WEEK } from "./periodUtils";
import { BAL_ADDRESS, FXS_ADDRESS, SD_FXS_ADDRESS } from "./addresses";
import { getClient, getRpcUrlFromEnv } from "./jsonRpcUtils";
import { IHistoricalPrice, getHistoricalPricesFromContracts } from "./pricesUtils";
import * as dotenv from "dotenv";
import { formatUnits, parseUnits } from "viem";
import { delay } from "./sleepUtils";

dotenv.config();

type ITokenDataMap = Record<string, ITokenData>;

interface ITokenData {
    decimals: number;
    symbol: string;
}

const cacheTokenData: ITokenDataMap = {};

const cacheBlockNumberByChain = {};

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
    const bribes = await agnosticFetch(QUERY_BRIBE_CREATED(protocol.table, bribeContractStr, id as string));
    if (!bribes) {
        return {};
    }

    const bribe = bribes[0];
    if (!bribe) {
        return {};
    }

    const protocolTokenAddress = getProtocolTokenAddressFromBribeContract(bribeContractStr);
    const gaugeName = mapGauges.find((m: any) => equals(m.address, bribe[3]))?.name || "";

    const response: IBribeReport = {
        bribeContract: bribe[0],
        created: moment(bribe[1]).unix(),
        id: BigInt(bribe[2]),
        gaugeAddress: bribe[3],
        gaugeName,
        manager: bribe[4],
        rewardTokenAddress: bribe[5],
        rewardTokenName: bribe[11],
        numberOfPeriods: parseInt(bribe[6]),
        maxRewardPerVote: BigInt(bribe[7]),
        rewardPerPeriod: BigInt(bribe[8]),
        totalRewardAmount: BigInt(bribe[9]),
        isUpgradable: parseInt(bribe[10]) === 1,
        blacklistedAddresses: [],
        periods: [],
        protocolTokenDecimal: 0,
        protocolTokenSymbol: "",
        rewardTokenDecimals: 0,
        rewardTokenSymbol: "",
        weeklyIncentive: 0
    };

    const claimedCall = agnosticFetch(CLAIMED_REWARDS_QUERY(
        protocol.table,
        bribeContractStr,
        id as string
    ));
    const increasedCall = agnosticFetch(INCREASED_QUEUED_EVENTS(protocol.table, bribeContractStr, id as string));
    const rolloverCall = agnosticFetch(ROLLOVER_QUERY(
        protocol.table,
        bribeContractStr,
        id as string,
        response.rewardTokenAddress
    ));

    // Manage blacklist addresses
    const client = getClient(protocol);

    const haveRewardTokenAddress = !!cacheTokenData[response.rewardTokenAddress];
    const haveProtocolRewardTokenAddress = !!cacheTokenData[protocolTokenAddress];

    const tokenCalls: any[] = [
        {
            address: bribeContractStr as any,
            abi: BribePlateformV5_ABI,
            functionName: 'getBlacklistedAddressesPerBounty',
            args: [response.id]
        }
    ];

    if (!haveRewardTokenAddress) {
        tokenCalls.push({
            address: response.rewardTokenAddress as any,
            abi: ERC20_ABI,
            functionName: 'decimals',
        });
        tokenCalls.push({
            address: response.rewardTokenAddress as any,
            abi: ERC20_ABI,
            functionName: 'symbol',
        });
    }

    if(!haveProtocolRewardTokenAddress) {
        tokenCalls.push({
            address: protocolTokenAddress as any,
            abi: ERC20_ABI,
            functionName: 'symbol',
        });
        tokenCalls.push({
            address: protocolTokenAddress as any,
            abi: ERC20_ABI,
            functionName: 'decimals',
        });
    }

    const tokenResponses = await client.multicall({
        contracts: tokenCalls,
    });

    const blacklistedAddressesRes = tokenResponses.shift();
    
    let decimals = 0;
    let protocolTokenDecimal = 0;
    let rewardTokenSymbol = "";
    let protocolTokenSymbol = "";

    if(!haveRewardTokenAddress) {
        let data = tokenResponses.shift();
        decimals = Number(data.result);
        
        data = tokenResponses.shift();
        rewardTokenSymbol = data.result as string;

        cacheTokenData[response.rewardTokenAddress] = {
            decimals,
            symbol: rewardTokenSymbol
        };
    } else {
        decimals = cacheTokenData[response.rewardTokenAddress].decimals;
        rewardTokenSymbol = cacheTokenData[response.rewardTokenAddress].symbol;
    }

    if(!haveProtocolRewardTokenAddress) {
        let data = tokenResponses.shift();
        protocolTokenDecimal = Number(data.result);
        
        data = tokenResponses.shift();
        protocolTokenSymbol = data.result as string;

        cacheTokenData[protocolTokenAddress] = {
            decimals: protocolTokenDecimal,
            symbol: protocolTokenSymbol
        };
    } else {
        protocolTokenDecimal = cacheTokenData[protocolTokenAddress].decimals;
        protocolTokenSymbol = cacheTokenData[protocolTokenAddress].symbol;
    }

    response.rewardTokenDecimals = decimals;
    response.rewardTokenSymbol = rewardTokenSymbol;
    response.protocolTokenSymbol = protocolTokenSymbol;
    response.protocolTokenDecimal = protocolTokenDecimal;

    const blacklistedAddresses = blacklistedAddressesRes.result as string[];
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

    // Get agnostic data
    const [
        claimedResp,
        rolloverResp,
        increasedResp
    ] = await Promise.all([
        claimedCall,
        rolloverCall,
        increasedCall
    ]);

    let claimed: IClaimedBribeReport[] = [];
    if (claimedResp) {
        claimed = claimedResp.map((c: any) => {
            return {
                timestamp: moment(c[2]).unix(),
                amountBN: BigInt(c[4]),
                amount: parseFloat(formatUnits(c[4], decimals))
            }
        });
    }

    // Get rollover
    let rollovers: IRolloverBribeReport[] = [];
    if (rolloverResp) {
        rollovers = rolloverResp.map((r: any) => {
            const amount = parseFloat(formatUnits(r[1], decimals));
            return {
                timestamp: moment(r[0]).unix(),
                amountBN: BigInt(r[1]),
                amount,
                price: parseFloat(r[2]) / amount,
            }
        });
    }

    if (increasedResp && increasedResp.length > 0) {
        response.numberOfPeriods = parseInt(increasedResp[0][0]);
    }

    // Iterate on each periods to calculate data
    while (nextPeriod > response.created) {
        nextPeriod -= WEEK * protocol.roundDuration;
    }

    let claimedStart = moment.unix(nextPeriod + WEEK);

    let blockNumber = cacheBlockNumberByChain[protocol.protocolChainId];
    if (!blockNumber) {
        blockNumber = Number(await client.getBlockNumber());
        cacheBlockNumberByChain[protocol.protocolChainId] = blockNumber;
    }

    const now = moment();
    const tokenHistoricalRewardPriceCalls: IHistoricalPrice[] = [];
    const tokenHistoricalProtocolTokenPriceCalls: IHistoricalPrice[] = [];

    let nextThursdayGaugeData = moment.utc(claimedStart).add(-1 * protocol.roundDuration, "week");

    const fetchHistoricalsDataCall = fetchHistoricalsData(
        protocol,
        response,
        moment.unix(nextThursdayGaugeData.unix()),
        now,
        blockNumber,
        gaugeController
    );

    const calls: any[] = [];
    for (let i = 0; i < response.numberOfPeriods; i++) {
        nextThursdayGaugeData = nextThursdayGaugeData.add(1 * protocol.roundDuration, "week");

        const next = nextThursdayGaugeData.unix();

        calls.push({
            address: gaugeController as any,
            abi: CurveGaugeController_ABI,
            functionName: 'points_weight',
            args: [response.gaugeAddress, moment.unix(next).unix()]
        });

        tokenHistoricalRewardPriceCalls.push({
            address: getRealTokenRewardAddress(response.rewardTokenAddress),
            timestamp: next
        });

        tokenHistoricalProtocolTokenPriceCalls.push({
            address: getRealTokenRewardAddress(protocolTokenAddress),
            timestamp: next
        });
    }

    const callsResp = await client.multicall({ contracts: calls });

    const weights = await fetchHistoricalsDataCall;

    for (let i = 0; i < response.numberOfPeriods; i++) {
        weights[i].gaugeWeight = callsResp[i].result[0];
    }

    const protocolTokenPrices = await getHistoricalPricesFromContracts(protocol, tokenHistoricalProtocolTokenPriceCalls);
    const tokenRewardPrices = await getHistoricalPricesFromContracts(protocol, tokenHistoricalRewardPriceCalls);

    response.weeklyIncentive = inflation;

    const claimStartClone = moment(claimedStart);

    for (let i = 0; i < response.numberOfPeriods; i++) {

        // Get claimed during period
        const claimedEnd = moment(claimedStart).add(1 * protocol.roundDuration, "week");
        const claimedPeriod: IClaimedBribeReport[] = claimed.filter((c: IClaimedBribeReport) => {
            return claimedStart.unix() <= c.timestamp && claimedEnd.unix() >= c.timestamp;
        });

        const totalClaimed = claimedPeriod.reduce((acc: bigint, c: IClaimedBribeReport) => acc + c.amountBN, 0n);

        const period: IPeriodBribeReport = {
            allocatedRewards: 0n,
            allocatedRewardsUSD: 0,
            periodNumber: i + 1,
            claimedRewards: totalClaimed,
            claimedRewardsUSD: 0,
            startClaim: claimedStart.unix(),
            endClaim: claimedEnd.unix(),
            activePeriod: moment().isBefore(claimedEnd),
            unclaimedRewards: 0n,
            votesReceived: 0n,
            totalWeight: 0n,
            incentiveDirectedBN: 0n,
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
            const rollover = rollovers.find((r: IClaimedBribeReport) => r.timestamp > period.startClaim && r.timestamp < moment.unix(period.startClaim).add(6 * protocol.roundDuration, "days").unix());
            let isActivePeriod = false;
            if (rollover) {
                period.allocatedRewards = rollover.amountBN;
                isActivePeriod = true;
            } else if (i === 0) {
                period.allocatedRewards = response.rewardPerPeriod;
                isActivePeriod = true;
            } else {
                period.allocatedRewards = 0n;
            }

            if (isActivePeriod) {
                period.unclaimedRewards = period.allocatedRewards - totalClaimed;
                period.votesReceived = BigInt(weights[i].gaugeWeight);
                period.totalWeight = BigInt(Math.floor(parseInt(formatUnits(weights[i].totalWeight, 18))));

                // Remove weight from blacklisted address
                let total = 0n;
                for (const w of weights[i].usersWeight) {
                    const veCRVVoted = BigInt(w.slope) * (BigInt(w.end) - BigInt((claimedStart.utc().valueOf() / 1000)));
                    total += veCRVVoted;
                }

                // Check neg
                if (total <= period.votesReceived) {
                    period.votesReceived = period.votesReceived - total;
                }

                let inflationBN = parseUnits(inflation.toString(), decimals);
                if (equals(protocolTokenAddress, BAL_ADDRESS)) {
                    inflationBN = BigInt(inflation);
                }

                const protocolTokenPrice = protocolTokenPrices[i];

                period.incentiveDirectedBN = inflationBN * period.votesReceived / period.totalWeight;
                period.incentiveDirected = parseFloat(formatUnits(period.incentiveDirectedBN, decimals));
                period.incentiveProtocolTokenUSD = protocolTokenPrice;
                period.incentiveDirectedUSD = period.incentiveDirected * period.incentiveProtocolTokenUSD;
                
                const tokenRewardPrice = tokenRewardPrices[i];

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
    protocol: IProtocol,
    response: IBribeReport,
    nextThursdayGaugeData: moment.Moment,
    now: moment.Moment,
    blockNumber: number,
    gaugeController: string
): Promise<IUserWeightMap> => {
    try {
        return await fetchHistoricals(
            protocol,
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
            protocol,
            response,
            moment.unix(nextThursdayGaugeData.unix()),
            now,
            blockNumber,
            gaugeController
        );
    }

};

const fetchHistoricals = async (
    protocol: IProtocol,
    response: IBribeReport,
    nextThursdayGaugeData: moment.Moment,
    now: moment.Moment,
    blockNumber: number,
    gaugeController: string
): Promise<IUserWeightMap> => {
    
    const client = getClient(protocol, getRpcUrlFromEnv(protocol));

    const isCake = protocol.key === "cake";
    const abi = isCake ? CakeGaugeController_ABI : CurveGaugeController_ABI;

    const callsPointWeight: any[] = [];
    for (let i = 0; i < response.numberOfPeriods; i++) {
        nextThursdayGaugeData = nextThursdayGaugeData.add(1 * protocol.roundDuration, "week");

        let next = nextThursdayGaugeData.unix();
        next = moment.unix(next).add(0, "hour").unix();

        let numberOfBlockSince = Math.max(Math.round((now.unix() - next) / 12), 0);
        const block = blockNumber - numberOfBlockSince;

        callsPointWeight.push(client.multicall({
            contracts: [
                {
                    address: gaugeController as any,
                    abi,
                    functionName: isCake ? "getTotalWeight" : "get_total_weight",
                    args: isCake ? [false] : []
                }
            ],
            blockNumber: BigInt(block),
        }));
        

        for (const blacklist of response.blacklistedAddresses) {
            callsPointWeight.push(client.multicall({
                contracts: [
                    {
                        address: gaugeController as any,
                        abi,
                        functionName: isCake ? "voteUserSlopes" : "vote_user_slopes",
                        args: [blacklist.address, response.gaugeAddress]
                    }
                ],
                blockNumber: BigInt(block),
            }));

            // Unit rate limit on Alchemy
            await delay(500);
        }
    }

    const callsRespPointWeight = await Promise.all(callsPointWeight);

    return computeHistoricalData(
        response,
        callsRespPointWeight
    )
}

export type IUserWeightMap = Record<number, IUserWeight>;

export interface IUserWeight {
    totalWeight: bigint;
    usersWeight: IWeight[];
    gaugeWeight: bigint;
}

export interface IWeight {
    slope: bigint;
    power: bigint;
    end: bigint;
}

const computeHistoricalData = (
    response: IBribeReport,
    calls: any[]
): IUserWeightMap => {
    const weights: IUserWeightMap = {};
    for (let i = 0; i < response.numberOfPeriods; i++) {
        const weight: IUserWeight = {
            totalWeight: 0n,
            usersWeight: [],
            gaugeWeight: 0n,
        };

        const data = calls.shift();
        const totalWeightResp = data[0].result;
        weight.totalWeight = BigInt(Math.floor(parseInt(formatUnits(totalWeightResp, 18))));

        for (const blacklist of response.blacklistedAddresses) {
            const blacklistData = calls.shift();
            const pointWeight = blacklistData[0].result;
            weight.usersWeight.push({
                slope: pointWeight[0],
                power: pointWeight[1],
                end: pointWeight[2]
            });
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