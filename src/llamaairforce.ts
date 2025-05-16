import axios from "axios";
import * as dotenv from "dotenv";
import fs from 'fs';

dotenv.config();

const protocols = ["crv", "fxn"];
const protocols_votemarket: Record<string, string> = {
    "crv": "curve",
    "fxn": "fxn"
};

const main = async () => {
    const datas: any = {};

    for (const protocol of protocols) {
        const { data: { rounds } } = await axios.get(`https://api.llama.airforce/bribes/votium/cvx-${protocol}/rounds`)

        const lastRound = rounds[rounds.length - 1]

        const { data } = await axios.get(`https://api.llama.airforce/bribes/votium/cvx-${protocol}/${lastRound}`)
        datas[protocols_votemarket[protocol]] = data;
    }
    fs.writeFileSync(`./llamaairforce/latest.json`, JSON.stringify(datas));
};

main().catch((error) => {
    console.error(error);
});