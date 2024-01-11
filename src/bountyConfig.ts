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
        table: "evm_events_bsc"
    },
    {
        key: "crv",
        bribeContract: [
            {
                bribeContract: "0x0000000895cB182E6f983eb4D8b4E0Aa0B31Ae4c", // V5
                chainId: 1,
                image: "",
                network: "ethereum",
                active: true,
                curveImageNetwork: "",
            }
        ],
        v3Contract: "0x7D0F747eb583D43D41897994c983F13eF7459e1f",
        claimableContract: "0xA0327b80E3801CfE36708a32740f3FAe570Ff60E", // Only for V4, see getClaimableContract
        atLeastV5Contracts: ["0x0000000895cB182E6f983eb4D8b4E0Aa0B31Ae4c", "0x8180Fc676A54547677752C1234aD8f2073772F1a"],
        label: "Curve",
        gaugeController: "0x2F50D538606Fa9EDD2B11E2446BEb18C9D5846bB",
        image: "https://cryptologos.cc/logos/curve-dao-token-crv-logo.png",
        veContract: "0x5f3b5DfEb7B28CDbD7FAba78963EE202a494e2A2",
        voteLink: "https://dao.curve.fi/gaugeweight",
        protocolTokenAddress: CRV_ADDRESS,
        veTokenAddress: CRV_ADDRESS,
        protocolChainId: 1,
        veMultiplier: 1,
        indexVotePage: 1,
        roundDuration: 1,
        rewardsTokensAvailable: [
            {
                address: CRV_ADDRESS,
                symbol: "CRV",
                decimals: 18,
            },
            {
                address: FXS_ADDRESS,
                symbol: "FXS",
                decimals: 18,
            },
            {
                address: "OTHER",
                symbol: "Other",
                decimals: 0,
            }
        ],
        isAvailableForVBM: true,
        table: "evm_events_ethereum_mainnet"
    },
    {
        key: "angle",
        bribeContract: [
            {
                bribeContract: "0x00000004E4FB0C3017b543EF66cC8A89F5dE74Ff", // V5
                chainId: 1,
                image: "",
                network: "ethereum",
                active: true,
                curveImageNetwork: "",
            }
        ],
        v3Contract: "0x54EED2a27967351ed89B8fF189480cAaC22C8d1D",
        claimableContract: "0x0000000304aAD016bA7a745da3cE64f6198B76B3",
        atLeastV5Contracts: ["0x00000004E4FB0C3017b543EF66cC8A89F5dE74Ff"],
        label: "Angle",
        gaugeController: "0x9aD7e7b0877582E14c17702EecF49018DD6f2367",
        image: "https://raw.githubusercontent.com/AngleProtocol/angle-assets/main/0_tokens/ANGLE-token/ANGLE%20-%20light.svg",
        voteLink: "https://app.angle.money/#/gauge",
        veContract: "0x0C462Dbb9EC8cD1630f1728B2CFD2769d09f0dd5",
        protocolTokenAddress: ANGLE_ADDRESS,
        veTokenAddress: ANGLE_ADDRESS,
        protocolChainId: 1,
        veMultiplier: 1,
        indexVotePage: 4,
        roundDuration: 1,
        rewardsTokensAvailable: [
            {
                address: ANGLE_ADDRESS,
                symbol: "ANGLE",
                decimals: 18,
            },
            {
                address: "OTHER",
                symbol: "Other",
                decimals: 0,
            }
        ],
        isAvailableForVBM: false,
        table: "evm_events_ethereum_mainnet"
    },
    {
        key: "bal",
        bribeContract: [
            {
                bribeContract: "0x0000000446b28e4c90dbf08ead10f3904eb27606", // V6
                chainId: 1,
                image: "",
                network: "ethereum",
                active: true,
                curveImageNetwork: "",
            }
        ],
        v3Contract: "0x47C1eA8A5C70A3762DB4522B9E9b4a52f7f76577",
        atLeastV5Contracts: ["0x00000008eF298e2B6dc47E88D72eeB1Fc2b1CA7f", "0x0000000446b28e4c90dbf08ead10f3904eb27606"],
        label: "Balancer",
        claimableContract: "0xf769F8a57e414d91E06dA702B93587e7e5f31D26",
        gaugeController: "0xC128468b7Ce63eA702C1f104D55A2566b13D3ABD",
        image: "https://cryptologos.cc/logos/balancer-bal-logo.png?v=022",
        voteLink: "https://app.balancer.fi/#/vebal",
        veContract: "0xC128a9954e6c874eA3d62ce62B468bA073093F25",
        protocolTokenAddress: BAL_ADDRESS,
        veTokenAddress: VE_BAL_ADDRESS,
        protocolChainId: 1,
        veMultiplier: 1,
        indexVotePage: 2,
        roundDuration: 1,
        rewardsTokensAvailable: [
            {
                address: BAL_ADDRESS,
                symbol: "BAL",
                decimals: 18,
            },
            {
                address: "OTHER",
                symbol: "Other",
                decimals: 0,
            }
        ],
        isAvailableForVBM: false,
        table: "evm_events_ethereum_mainnet"
    },
    {
        key: "fxs",
        bribeContract: [
            {
                bribeContract: "0x000000060e56DEfD94110C1a9497579AD7F5b254", // V5
                chainId: 1,
                image: "",
                network: "ethereum",
                active: true,
                curveImageNetwork: "",
            }
        ],
        v3Contract: "0xC5B0B727B5447442ffafeB6c254F745691a5eEfD",
        claimableContract: "0x2d57E7EE4B82FFc95469817Eb8BC042dbec33fBF",
        atLeastV5Contracts: ["0x000000060e56DEfD94110C1a9497579AD7F5b254"],
        label: "Frax",
        gaugeController: "0x3669C421b77340B2979d1A00a792CC2ee0FcE737",
        image: "https://raw.githubusercontent.com/curvefi/curve-assets/a3d7691a61d854556a96a9e123295abdbdd267d9/images/assets/0x853d955acef822db058eb8505911ed77f175b99e.png",
        voteLink: "https://app.frax.finance/gauge",
        veContract: "0xc8418aF6358FFddA74e09Ca9CC3Fe03Ca6aDC5b0",
        protocolTokenAddress: FXS_ADDRESS,
        veTokenAddress: FXS_ADDRESS,
        protocolChainId: 1,
        veMultiplier: 4,
        indexVotePage: 3,
        roundDuration: 1,
        rewardsTokensAvailable: [
            {
                address: FXS_ADDRESS,
                symbol: "FXS",
                decimals: 18,
            },
            {
                address: "OTHER",
                symbol: "Other",
                decimals: 0,
            }
        ],
        isAvailableForVBM: false,
        table: "evm_events_ethereum_mainnet"
    },
    {
        key: "lit",
        bribeContract: [
            {
                bribeContract: "0x000000071a273073c824E2a8B0192963e0eEA68b", // V5
                chainId: 1,
                image: "",
                network: "ethereum",
                active: true,
                curveImageNetwork: "",
            }
        ],
        v3Contract: "",
        claimableContract: "",
        atLeastV5Contracts: ["0x000000071a273073c824E2a8B0192963e0eEA68b"],
        label: "Bunni",
        gaugeController: LIT_GAUGE_CONTROLLER,
        image: "https://assets.coingecko.com/coins/images/28714/small/timeless-logo_3x.png?1673575624g",
        voteLink: "https://bunni.pro/velit",
        veContract: "0xf17d23136B4FeAd139f54fB766c8795faae09660",
        protocolTokenAddress: LIT_ADDRESS,
        veTokenAddress: VE_LIT_ADDRESS,
        protocolChainId: 1,
        veMultiplier: 1,
        indexVotePage: 4,
        roundDuration: 1,
        rewardsTokensAvailable: [
            {
                address: LIT_ADDRESS,
                symbol: "LIT",
                decimals: 18,
            },
            {
                address: "OTHER",
                symbol: "Other",
                decimals: 0,
            }
        ],
        isAvailableForVBM: false,
        table: "evm_events_ethereum_mainnet"
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