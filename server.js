const express = require("express");
const axios = require("axios");
const redis = require("redis");

const app = express();
const port = process.env.PORT || 3000;
let redisClient;

(async () => {
  redisClient = redis.createClient({ legacyMode: true });
  redisClient.on("error", (error) => console.error(`Error : ${error}`));
  await redisClient.connect();
})();

async function fetchApiData(country) {
    const apiResponse = await axios.get(`https://en.wikipedia.org/w/api.php?action=parse&format=json&section=0&page=${country}`);
    console.log("Request sent to the API");
    return apiResponse.data;
}
async function getCountriesData(req, res) {
    const country = req.params.countryName;
    let isCached = false;
    let results;
    try {
        const cacheResults = await redisClient.v4.get(country);
        if (cacheResults) {
            isCached = true;
            results = JSON.parse(cacheResults);
        } else {
            results = await fetchApiData(country);
            if (results.length === 0) {
                throw "API returned an empty array";
            }
            await redisClient.set(`${country}`, JSON.stringify(results));
        }
        res.send({
            fromCache: isCached,
            data: results,
        });
    } catch (error) {
        console.log("here");
        console.error(error);
        res.status(404).send("Data unavailable");
    }
}

app.get("/country/:countryName", getCountriesData);

app.listen(port, () => {
  console.log(`App listening on port ${port}`);
});