'use strict';

const cheerio = require('cheerio');
const axios = require('axios');
const {
  getDataFromS3,
  writeDataToS3,
  sendEmail,
} = require('./services/dataService');

module.exports.handler = async event => {
  try {
    const data = await getFileOrCreateIfMissing();
    const prices = await fetchAndParsePriceData();
    // check diff
    const naturalGasLastKnownPrice = data?.[0]?.naturalgas
      ? Number(data[0].naturalgas.zone1)
      : 0.0;
    const naturalgasPriceNow = Number(prices.naturalgas.zone1);
    if (naturalgasPriceNow != naturalGasLastKnownPrice) {
      console.log(
        `Naturalgas price has changed from ${naturalGasLastKnownPrice} to ${naturalgasPriceNow}`
      );
      await sendEmail(naturalGasLastKnownPrice, naturalgasPriceNow);
    }
    // construct item
    const item = {
      ...prices,
      date: new Date().toISOString(),
    };
    data.push(item);
    console.log('New entry:', JSON.stringify(item, null, 4));
    await writeDataToS3(data);
  } catch (err) {
    console.error(err);
  }
};

const fetchAndParsePriceData = async () => {
  // fetch data from Gasum site
  const req = await axios.get(process.env.gasDataUrl);

  // load fetched DOM into cheerio for parsing
  const $ = cheerio.load(req.data);

  // parse out gas price
  const naturalGasPrices = [];
  const biogasPrices = [];
  $('.region > .price.naturalgas').each((a, elem) => {
    naturalGasPrices.push($(elem).html());
  });

  $('.region > .price.biogas').each((a, elem) => {
    biogasPrices.push($(elem).html());
  });
  const prices = { biogas: {}, naturalgas: {} };
  const regexp = /\d{1}[.|,]\d{2}(?=\W{0,1}€\W{0,1}\W{0,1}\/\W{0,1}kg)/;
  prices.naturalgas.zone1 = Number(
    naturalGasPrices[1].match(regexp)[0].replace(',', '.')
  );
  prices.naturalgas.zone2 = Number(
    naturalGasPrices[3].match(regexp)[0].replace(',', '.')
  );
  prices.biogas.zone1 = Number(
    biogasPrices[1].match(regexp)[0].replace(',', '.')
  );
  prices.biogas.zone2 = Number(
    biogasPrices[3].match(regexp)[0].replace(',', '.')
  );
  return prices;
};

const getFileOrCreateIfMissing = async () => {
  try {
    return await getDataFromS3();
  } catch (err) {
    if (err.code === 'NoSuchKey') {
      await writeDataToS3([]);
      return [];
    } else {
      throw err;
    }
  }
};
