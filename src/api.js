'use strict';
const { getDataFromS3 } = require('./services/dataService');

module.exports.handler = async (event, context, callback) => {
  try {
    const data = await getDataFromS3();

    const response = {
      statusCode: 200,
      body: JSON.stringify(data),
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Credentials': true,
      },
    };

    // print response
    console.log(response);

    callback(null, response);
  } catch (err) {
    const response = {
      statusCode: 500,
      body: err.message,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Credentials': true,
      },
    };

    callback(null, response);
  }
};
