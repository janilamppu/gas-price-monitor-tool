const subscribedItems = [
  {
    email: 'testemail@email.com',
    subscriptions: {
      naturalgas: { zone1: true, zone2: true },
      biogas: { zone1: true, zone2: true },
    },
  },
];

const unsubscribedItems = [
  {
    email: 'testemail@email.com',
    subscriptions: {
      naturalgas: { zone1: false, zone2: false },
      biogas: { zone1: false, zone2: false },
    },
  },
];

module.exports = {
  unsubscribed: { Items: unsubscribedItems },
  subscribed: { Items: subscribedItems },
};
