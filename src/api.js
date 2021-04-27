'use strict';
const router = require('./router');

module.exports.handler = async (event, context, callback) => {
  try {
    const route = `${event.httpMethod} ${event.path}`;
    const handlerFunction = router[route];
    if (handlerFunction) {
      const parsedBody = JSON.parse(event.body);
      const returnValue = await handlerFunction(parsedBody);
      const response = generateResponse(200, returnValue);
      callback(null, response);
    } else {
      const errorBody = {
        error: `No route match for ${route}`,
      };
      const response = generateResponse(404, errorBody);
      callback(null, response);
    }
  } catch (err) {
    const errorBody = {
      error: err.message,
    };
    const response = generateResponse(err.statusCode || 500, errorBody);
    callback(null, response);
  }
};

const generateResponse = (statusCode, body) => {
  return {
    statusCode,
    body: JSON.stringify(body),
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Credentials': true,
    },
  };
};
