import axios from "axios";
import { request, gql } from "graphql-request";

const getCurveGauges = async (all: boolean = false): Promise<any[]> => {
    try {

        const allGaugesCurve = await axios.get("https://api.curve.fi/api/getAllGauges");

        const gaugeCurveMap: any = {};

        for (const gaugeName of Object.keys(allGaugesCurve.data.data)) {
            const gauge = allGaugesCurve.data.data[gaugeName];
            if (all) {
                gaugeCurveMap[gauge.gauge.toLowerCase()] = gauge;
            } else {
                if (gauge.side_chain || (gauge.gauge_controller && gauge.gauge_controller.get_gauge_weight === "0") || gauge.hasNoCrv) {
                    continue;
                }
                gaugeCurveMap[gauge.gauge.toLowerCase()] = gauge;
            }
        }

        const gaugeAddresses = Object.keys(gaugeCurveMap);

        const result: any[] = [];

        for (let i = 0; i < gaugeAddresses.length; i++) {
            const gaugeAddress: string = gaugeAddresses[i];

            const gauge = gaugeCurveMap[gaugeAddress.toLowerCase()];
            let name: string = gauge?.shortName || "";
            const gaugeWeight = BigInt(gauge?.gauge_controller?.get_gauge_weight || "0");

            const firstIndex = name.indexOf("(");
            if (firstIndex > -1) {
                name = name.substring(0, firstIndex);
            }

            result.push({
                address: gaugeAddress,
                name,
                gaugeWeight,
                hasNoCrv: gauge.hasNoCrv === undefined ? true : gauge.hasNoCrv,
            });
        }

        return result;
    } catch (ex) {
        return [];
    }
}

const getBalancerGauges = async (): Promise<any[]> => {
    const query = gql`{
          veBalGetVotingList
          {
            id
            address
            chain
            type
            symbol
            gauge {
              address
              isKilled
              relativeWeightCap
              addedTimestamp
              childGaugeAddress
            }
            tokens {
              address
              logoURI
              symbol
              weight
            }
          }
    }`;

    const data = (await request("https://api-v3.balancer.fi/", query)) as any;
    const gauges = data.veBalGetVotingList.filter(
        (item: any) =>
            item.network !== 5 && item.network !== 42 && (!item.isKilled || item.isKilled === false),
    );

    const liquidityGauges: any[] = [];
    for (const gauge of gauges) {
        liquidityGauges.push({
            name: gauge.symbol || "",
            address: gauge?.gauge?.address || "",
            streamer: gauge.streamer || "",
        });
    }

    return liquidityGauges;
};

const getFraxGauges = async (): Promise<string[]> => {
    try {
        const response = await axios.get("https://api.governance.services/gauge/frax");
        if (!response?.data) {
            return [];
        }

        return response.data.map((d: any) => {
            return {
                name: d.name,
                address: d.address,
            }
        });
    }
    catch (e) {
        return [];
    }
};

export const getAllGauges = async () => {
    const [crv, bal, fxs] = await Promise.all([
        getCurveGauges(true),
        getBalancerGauges(),
        getFraxGauges()
    ]);

    return {
        crv,
        bal,
        fxs
    };
}