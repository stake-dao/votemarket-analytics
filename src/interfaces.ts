import { BigNumber } from "@ethersproject/bignumber";

export interface IBribeReport {
    bribeContract: string;
    created: number;
    id: BigNumber;
    gaugeAddress: string;
    gaugeName: string;
    manager: string;
    rewardTokenAddress: string;
    rewardTokenName: string;
    rewardTokenSymbol: string;
    rewardTokenDecimals: number;
    numberOfPeriods: number;
    maxRewardPerVote: BigNumber;
    rewardPerPeriod: BigNumber;
    totalRewardAmount: BigNumber;
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
    allocatedRewards: BigNumber;
    allocatedRewardsUSD: number;
    votesReceived: BigNumber;
    totalWeight: BigNumber;
    incentiveDirectedBN: BigNumber;
    incentiveDirected: number;
    incentiveDirectedUSD: number;
    incentiveBoostAchieved: number;
    incentiveProtocolTokenUSD: number;
    claimedRewards: BigNumber;
    claimedRewardsUSD: number;
    unclaimedRewards: BigNumber;
    realPricePerVoteAchieved: number;
    realPricePerVoteAchievedUSD: number;
    tokenRewardPrice: number;
}

export interface IClaimedBribeReport {
    timestamp: number;
    amountBN: BigNumber;
    amount: number;
}

export interface IRolloverBribeReport {
    timestamp: number;
    amountBN: BigNumber;
    amount: number;
    price: number;
}

export interface IAnalyticsBribe {
    bribeContract: string;
    created: number;
    id: BigNumber;
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
    rewardsTokensAvailable: IRewardsTokensAvailable[];
    isAvailableForVBM: boolean;
}

export type NetworkName = "ethereum" | "arbitrum" | "bsc";
export type CurveImageNetwork = "" | "arbitrum" | "bsc";

export interface IChainBribeContract {
    chainId: number;
    network: NetworkName; // For defillama api price => chain name like ethereum|arbitrum|bsc ...
    curveImageNetwork: CurveImageNetwork;
    bribeContract: `0x${string}`;
    image: string; // Chain image
    active: boolean;
}
