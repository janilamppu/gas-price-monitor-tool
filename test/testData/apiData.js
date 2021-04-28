const subscriptions = require('./subscriptionData');

const mockEventGetPrices = {
  httpMethod: 'GET',
  path: '/get-prices',
  body: null,
};

const mockEventUnknownRoute = {
  httpMethod: 'GET',
  path: '/this-route-does-not-exist',
  body: null,
};

const mockEventPostSubscription = {
  httpMethod: 'POST',
  path: '/subscribe',
  body: JSON.stringify({
    email: 'testemail@email.com',
    subscriptions: {
      naturalgas: { zone1: true, zone2: true },
      biogas: { zone1: true, zone2: true },
    },
    lang: 'fi',
  }),
};

module.exports = {
  mockEventGetPrices,
  mockEventUnknownRoute,
  mockEventPostSubscription,
};
