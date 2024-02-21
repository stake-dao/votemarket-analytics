import { ANGLE_ADDRESS, BAL_ADDRESS, CAKE_ADDRESS, CAKE_GAUGE_CONTROLLER_2, CRV_ADDRESS, FXS_ADDRESS, LIT_ADDRESS, LIT_GAUGE_CONTROLLER, VE_BAL_ADDRESS, VE_CAKE_ADDRESS, VE_LIT_ADDRESS } from "./addresses";
import { IProtocol } from "./interfaces";

export const PROTOCOLS: IProtocol[] = [
    {
        key: "cake",
        bribeContract: [
            {
                bribeContract: "0x62c5D779f5e56F6BC7578066546527fEE590032c", // V5
                chainId: 56,
                image: "",
                network: "bsc",
                active: true,
                curveImageNetwork: "bsc",
            },
            {
                bribeContract: "0xa77889DA8fEDC7FD65D37Af60d0744B954E3bAf0", // V5
                chainId: 56,
                image: "",
                network: "bsc",
                active: false,
                curveImageNetwork: "bsc",
                claimBribeContract: "0x0bb31c617420907db54817B13EE3fe022c803c16"
            }
        ],
        curveImageNetwork: "bsc",
        v3Contract: "",
        claimableContract: "", // Only for V4, see getClaimableContract
        atLeastV5Contracts: [],
        label: "PancakeSwap",
        gaugeController: CAKE_GAUGE_CONTROLLER_2,
        image: "https://bscscan.com/token/images/pancake_32.png?=v1",
        veContract: VE_CAKE_ADDRESS,
        voteLink: "https://pancakeswap.finance/gauges-voting",
        protocolTokenAddress: CAKE_ADDRESS,
        veTokenAddress: CAKE_ADDRESS,
        protocolChainId: 56,
        veMultiplier: 1,
        indexVotePage: 5,
        roundDuration: 2,
        rewardsTokensAvailable: [
            {
                address: CAKE_ADDRESS,
                symbol: "CAKE",
                decimals: 18,
            },
            {
                address: "OTHER",
                symbol: "Other",
                decimals: 0,
            }
        ],
        isAvailableForVBM: false,
        table: "evm_events_bsc_mainnet_v1"
    }
];

const AURA_VOTER = "0xaF52695E1bB01A16D33D7194C28C42b10e0Dbec2";
const CONVEX_VOTER = "0x989aeb4d175e16225e39e87d0d97a3360524ad80";
const YEARN_VOTER = "0xF147b8125d2ef93FB6965Db97D6746952a133934";
const STAKE_DAO_VOTER = "0x52f541764E6e90eeBc5c21Ff570De0e2D63766B6";
const STAKE_DAO_VOTER_ANGLE = "0xD13F8C25CceD32cdfA79EB5eD654Ce3e484dCAF5";
const STAKE_DAO_VOTER_BAL = "0xea79d1A83Da6DB43a85942767C389fE0ACf336A5";
const STAKE_DAO_VOTER_FXS = "0xCd3a267DE09196C48bbB1d9e842D7D7645cE448f";

export const USEFUL_BLACKLIST_ADDRESSES = [
    {
        address: CONVEX_VOTER,
        name: "Convex's locker"
    },
    {
        address: YEARN_VOTER,
        name: "yCRV holders"
    },
    {
        address: STAKE_DAO_VOTER,
        name: "sdCRV-gauge holders",
        protocol: "crv",
    },
    {
        address: STAKE_DAO_VOTER_BAL,
        name: "sdBAL-gauge holders",
        protocol: "bal",
    },
    {
        address: STAKE_DAO_VOTER_FXS,
        name: "sdFXS-gauge holders",
        protocol: "fxs",
    },
    {
        address: STAKE_DAO_VOTER_ANGLE,
        name: "sdANGLE-gauge holders",
        protocol: "angle",
    },
    {
        address: AURA_VOTER,
        name: "vlAURA holders"
    }
];