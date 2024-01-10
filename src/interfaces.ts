import { TABLE } from "./queries";

export interface IBribeReport {
    bribeContract: string;
    created: number;
    id: bigint;
    gaugeAddress: string;
    gaugeName: string;
    manager: string;
    rewardTokenAddress: string;
    rewardTokenName: string;
    rewardTokenSymbol: string;
    rewardTokenDecimals: number;
    numberOfPeriods: number;
    maxRewardPerVote: bigint;
    rewardPerPeriod: bigint;
    totalRewardAmount: bigint;
    weeklyIncentive: number;
    protocolTokenSymbol: string;
    protocolTokenDecimal: number;
    isUpgradable: boolean;
    blacklistedAddresses: IBlacklistBribeReport[],
    periods: IPeriodBribeReport[],
};

export interface IBlacklistBribeReport {
    name: string;
    address: string;
}

export interface IPeriodBribeReport {
    periodNumber: number;
    startClaim: number;
    endClaim: number;
    activePeriod: boolean;
    allocatedRewards: bigint;
    allocatedRewardsUSD: number;
    votesReceived: bigint;
    totalWeight: bigint;
    incentiveDirectedBN: bigint;
    incentiveDirected: number;
    incentiveDirectedUSD: number;
    incentiveBoostAchieved: number;
    incentiveProtocolTokenUSD: number;
    claimedRewards: bigint;
    claimedRewardsUSD: number;
    unclaimedRewards: bigint;
    realPricePerVoteAchieved: number;
    realPricePerVoteAchievedUSD: number;
    tokenRewardPrice: number;
}

export interface IClaimedBribeReport {
    timestamp: number;
    amountBN: bigint;
    amount: number;
}

export interface IRolloverBribeReport {
    timestamp: number;
    amountBN: bigint;
    amount: number;
    price: number;
}

export interface IAnalyticsBribe {
    bribeContract: string;
    created: number;
    id: bigint;
    gaugeAddress: string;
    gaugeName: string;
}

export interface IBribeGeneralReport {
    totalIncentivesUSD: number;
    totalAllocatedRewardsUSD: number;
    realPricePerVoteAchievedUSD: number;
    totalIncentiveBoostAchieved: number;
    totalVoteReceived: number;
    totalClaimedUSD: number;
    gaugeName: string;
    gaugeAddress: string;
    bribeContract: string;
    period: number;
    tokenRewardAddress: string;
}


export interface IRewardsTokensAvailable {
    address: string;
    symbol: string;
    decimals: number;
}

export interface IProtocol {
    key: string;
    bribeContract: IChainBribeContract[];
    curveImageNetwork?: string;
    v3Contract: string;
    atLeastV5Contracts: string[];
    claimableContract: string;
    veContract: string;
    label: string;
    gaugeController: string;
    image: string;
    voteLink: string;
    protocolTokenAddress: string;
    veTokenAddress: string;
    protocolChainId: number;
    veMultiplier: number;
    indexVotePage: number;
    roundDuration: number;
    rewardsTokensAvailable: IRewardsTokensAvailable[];
    isAvailableForVBM: boolean;
    table: TABLE;
}

export type NetworkName = "ethereum" | "arbitrum" | "bsc";
export type CurveImageNetwork = "" | "arbitrum" | "bsc";

export interface IChainBribeContract {
    chainId: number;
    network: NetworkName; // For defillama api price => chain name like ethereum|arbitrum|bsc ...
    curveImageNetwork: CurveImageNetwork;
    claimBribeContract?: `0x${string}`;
    bribeContract: `0x${string}`;
    image: string; // Chain image
    active: boolean;
}
