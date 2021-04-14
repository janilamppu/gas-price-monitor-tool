'use strict';
const { getDataFromS3 } = require('./services/dataService');

module.exports.handler = async (event, context, callback) => {
  const data = await getDataFromS3();

  const response = {
    statusCode: 200,
    body: JSON.stringify(data),
  };

  callback(null, response);
};
