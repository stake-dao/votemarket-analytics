import fs from "fs"

const DAY = 86400;
const WEEK = 7 * DAY;

const main = async () => {
    for(const protocol of ["curve", "fxn"]) {
        const path = `./analytics/votemarket-analytics/vlcvx/${protocol}`
        const pathRoundsMetadata = `${path}/rounds-metadata.json`
        let roundsMetadata = JSON.parse(fs.readFileSync(pathRoundsMetadata, {encoding: 'utf-8'}));
        
        // Remove one week on each endVoting
        roundsMetadata.map((round) => {
            round.endVoting -= (3 * DAY)
            return round
        });

        fs.writeFileSync(pathRoundsMetadata, JSON.stringify(roundsMetadata));

        // Gauges files
        const gaugeFiles = fs.readdirSync(`${path}/gauges`);
        for(const gaugeFile of gaugeFiles) {
            const pathGaugeFile = `${path}/gauges/${gaugeFile}`;
            const gaugeFileData = JSON.parse(fs.readFileSync(pathGaugeFile, {encoding: 'utf-8'}))

            for(const r of gaugeFileData) {
                r.roundDetails.endTimestamp -= (3 * DAY)
            }

            fs.writeFileSync(pathGaugeFile, JSON.stringify(gaugeFileData));

        }
    }
}

main().catch((e) => console.log(e));