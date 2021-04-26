'use strict';
const { getPriceData, subscribe } = require('./controller');

module.exports = {
  'GET /get-prices': getPriceData,
  'POST /subscribe': subscribe,
};
