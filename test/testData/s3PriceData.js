const priceItemsNoDiff = [
  {
    date: '2021-04-27T12:00+03:00',
    naturalgas: { zone1: '2.99', zone2: '2.99' },
    biogas: { zone1: '1.99', zone2: '1.99' },
  },
];

const priceItemsDiff = [
  {
    date: '2021-04-27T12:00+03:00',
    naturalgas: { zone1: '1.20', zone2: '1.20' },
    biogas: { zone1: '1.20', zone2: '1.20' },
  },
];

module.exports = {
  diff: { Body: JSON.stringify(priceItemsDiff) },
  noDiff: { Body: JSON.stringify(priceItemsNoDiff) },
};
