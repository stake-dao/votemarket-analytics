import axios from "axios";
import * as dotenv from "dotenv";
import fs from 'fs';

dotenv.config();

const main = async () => {
    const { data: { rounds } } = await axios.get('https://api.llama.airforce/bribes/votium/cvx-crv/rounds')

    const lastRound = rounds[rounds.length - 1]

    const { data } = await axios.get(`https://api.llama.airforce/bribes/votium/cvx-crv/${lastRound}`)
    fs.writeFileSync(`./llamaairforce/${lastRound}.json`, JSON.stringify(data));
};

main().catch((error) => {
    console.error(error);
});