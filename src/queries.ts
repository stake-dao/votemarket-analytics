export type TABLE = "evm_events_ethereum_mainnet" | "evm_events_bsc_mainnet_v1";

export const QUERY_BRIBES_CREATED = (table: TABLE, contracts: string[]) => `
select
    address,
    timestamp,
    input_0_value_uint256 as id,
    input_1_value_address as gauge,
    input_2_value_address as manager,
    input_3_value_address as rewardToken,
    input_4_value_uint8 as numberOfPeriods,
    input_5_value_uint256 as maxRewardPerVote,
    input_6_value_uint256 as rewardPerPeriod,
    input_7_value_uint256 as totalRewardAmount,
    input_8_value_uint8 as isUpgradable,
    token_name('ethereum', 'mainnet', rewardToken) as token_name
from ${table}
where 
address IN (${contracts.map((c: string) => "'" + c + "'").join(",")}) and
(
    signature = 'BribeCreated(uint256,address,address,address,uint8,uint256,uint256,uint256,bool)'
    OR
    signature = 'BountyCreated(uint256,address,address,address,uint8,uint256,uint256,uint256,bool)'
)`;


export const QUERY_BRIBE_CREATED = (table: TABLE, bribeContract: string, id: string) => `
select
    address,
    timestamp,
    input_0_value_uint256 as id,
    input_1_value_address as gauge,
    input_2_value_address as manager,
    input_3_value_address as rewardToken,
    input_4_value_uint8 as numberOfPeriods,
    input_5_value_uint256 as maxRewardPerVote,
    input_6_value_uint256 as rewardPerPeriod,
    input_7_value_uint256 as totalRewardAmount,
    input_8_value_uint8 as isUpgradable,
    token_name('ethereum', 'mainnet', rewardToken) as token_name
from ${table}
where 
address = '${bribeContract}' and
input_0_value_uint256 = '${id}' and
(
    signature = 'BribeCreated(uint256,address,address,address,uint8,uint256,uint256,uint256,bool)'
    OR
    signature = 'BountyCreated(uint256,address,address,address,uint8,uint256,uint256,uint256,bool)'
)`;

/**
 * Fetch all rollover for a bribe
 */
export const ROLLOVER_QUERY = (table: TABLE, bribeContract: string, id: string, tokenRewardAddress: string) => `
select
    timestamp,
    input_3_value_uint256 as amount,
    token_usd_amount('ethereum', 'mainnet', '${tokenRewardAddress}', toDate(timestamp), amount) as total_usd
from ${table}
where 
address = '${bribeContract}' and
input_0_value_uint256 = '${id}' and
signature = 'PeriodRolledOver(uint256,uint256,uint256,uint256)'
ORDER BY timestamp ASC`;

export const PRICE_QUERY = (table: TABLE, tokenRewardAddress: string, timestamp: number, amount: bigint) => `
select
    token_usd_amount('ethereum', 'mainnet', '${tokenRewardAddress}', toDate(${timestamp}), ${amount.toString()}) as total_usd
from ${table}
LIMIT 1
`;

export const INCREASED_QUEUED_EVENTS = (table: TABLE, bribesContract: string, bribeId: string) => `
select
    input_1_value_uint8 as numberOfPeriods
from ${table}
where
    address = '${bribesContract}' and 
    input_0_value_uint256 = '${bribeId}' and
    (
        signature = 'BribeDurationIncreaseQueued(uint256,uint8,uint256,uint256)'
        OR
        signature = 'BountyDurationIncreaseQueued(uint256,uint8,uint256,uint256)'
    )
ORDER BY timestamp DESC
LIMIT 1
`;

export const CLAIMED_REWARDS_QUERY = (table: TABLE, bribeContract: string, id: string) => `
select
    block_number,
    transaction_index,
    timestamp,
    input_0_value_address as user,
    input_3_value_uint256 as amount
from ${table}
where 
    address = '${bribeContract}' and
    input_2_value_uint256 = '${id}' and
    signature = 'Claimed(address,address,uint256,uint256,uint256,uint256)'
ORDER BY timestamp DESC`;