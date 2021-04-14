'use strict';

const AWS = require('aws-sdk');
const s3 = new AWS.S3();
const ses = new AWS.SES();
const cheerio = require('cheerio');
const axios = require('axios');

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
    await writeToFile(data);
  } catch (err) {
    console.error(err);
  }
};

const getPriceChange = (oldPrice, newPrice) => {
  return oldPrice != 0
    ? (Number(newPrice) - Number(oldPrice)).toFixed(2)
    : 'unknown';
};

const sendEmail = async (oldPrice, newPrice) => {
  const params = {
    Destination: {
      ToAddresses: ['jani.lamppu@gmail.com'],
    },
    Message: {
      Body: {
        Text: {
          Charset: 'UTF-8',
          Data: `Maakaasun hinta on muuttunut. Uusi hinta on ${newPrice} € / kg (vanha hinta oli ${oldPrice} € / kg)`,
        },
      },
      Subject: {
        Charset: 'UTF-8',
        Data: 'Muutos kaasun hinnassa',
      },
    },
    Source: 'jani.lamppu@gmail.com',
  };
  const r = await ses.sendEmail(params).promise();
  console.log(r);
};

const writeToFile = async body => {
  const params = {
    Bucket: process.env.gasPriceBucket,
    Key: process.env.gasPriceDataFile,
    Body: JSON.stringify(body),
  };
  await s3.putObject(params).promise();
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
    const params = {
      Bucket: process.env.gasPriceBucket,
      Key: process.env.gasPriceDataFile,
    };
    const data = await s3.getObject(params).promise();
    const parsedData = JSON.parse(data.Body.toString('utf-8'));
    return parsedData.sort(function (a, b) {
      return new Date(b.date) - new Date(a.date);
    });
  } catch (err) {
    if (err.code === 'NoSuchKey') {
      await writeToFile([]);
      return [];
    } else {
      throw err;
    }
  }
};
