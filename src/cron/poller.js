'use strict';

const cheerio = require('cheerio');
const axios = require('axios');
const {
  getPriceDataFromS3,
  writePriceDataToS3,
  sendEmail,
  getSubscriptionsFromDynamo,
} = require('../services/dataService');

module.exports.handler = async event => {
  try {
    // fetch data
    const data = await getFileOrCreateIfMissing();
    const prices = await fetchAndParsePriceData().catch(err => {
      throw new Error(`Price fetching/parsing failed: ${err.message}`);
    });

    // send change notifications
    await handleChangeNotifications(data[0], prices);

    // construct item
    const item = {
      ...prices,
      date: new Date().toISOString(),
    };
    data.push(item);

    // write entries to S3
    console.log('New entry:', JSON.stringify(item, null, 4));
    await writePriceDataToS3(data);
    return item;
  } catch (err) {
    console.log(err);
  }
};

const handleChangeNotifications = async (oldPrices, newPrices) => {
  // get subscriptions from DynamoDB table
  const subscriptions = await getSubscriptionsFromDynamo();

  // initialize object for notifications per-receiver
  const notifications = {};

  // construct keys of gas types
  const newPriceKeys = Object.keys(newPrices);
  newPriceKeys.forEach(gasType => {
    // construct keys of zones
    const zones = Object.keys(newPrices[gasType]);

    zones.forEach(zone => {
      // check and compare prices of each zone
      const newPrice = newPrices[gasType][zone];
      const oldPrice = oldPrices[gasType][zone];
      if (newPrice != oldPrice) {
        // price changed, push notifications to object per-receiver
        const subs = subscriptions
          .filter(sub => sub.subscriptions[gasType][zone] === true)
          .map(sub => sub.email);
        subs.forEach(sub => {
          if (!notifications[sub]) notifications[sub] = [];
          notifications[sub].push({ type: gasType, zone, newPrice, oldPrice });
        });
      }
    });
  });

  // send notifications
  const receivers = Object.keys(notifications);
  receivers.forEach(async receiver => {
    const subscription = subscriptions.find(sub => sub.email === receiver);
    const language = subscription.lang;
    await sendEmail(receiver, notifications[receiver], language);
  });
};

const fetchAndParsePriceData = async () => {
  // fetch data from Gasum site
  const req = await axios.get(process.env.gasDataUrl);

  // load fetched DOM into cheerio for parsing
  const $ = cheerio.load(req.data);

  // parse out gas price (TODO: refactor & clean up, a bit dirty solution)
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
    return await getPriceDataFromS3();
  } catch (err) {
    if (err.code === 'NoSuchKey') {
      await writePriceDataToS3([]);
      return [];
    } else {
      throw err;
    }
  }
};
