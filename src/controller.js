'use strict';

const {
  getPriceDataFromS3,
  writeSubscriptionToDynamo,
} = require('./services/dataService');
const { validateEmail } = require('./utils');

const getPriceData = async () => {
  const data = await getPriceDataFromS3();
  return data;
};

const subscribe = async body => {
  const email = body.email;
  const subscriptions = body.subscriptions;

  if (!email || !subscriptions) {
    throw new Error('Missing either email or subscriptions from payload');
  }

  if (!validateEmail(email)) {
    throw new Error('Email address is invalid');
  }

  await writeSubscriptionToDynamo(email, subscriptions);
  return { email, subscriptions };
};

module.exports = {
  subscribe,
  getPriceData,
};
