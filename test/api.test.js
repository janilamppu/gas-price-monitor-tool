// test dependencies
const AWS = require('aws-sdk-mock');
const api = require('../src/api');
const mockedEnv = require('mocked-env');
const { expect } = require('chai');
const sinon = require('sinon');

// test data
const s3PriceData = require('./testData/s3PriceData');
const {
  mockEventGetPrices,
  mockEventUnknownRoute,
  mockEventPostSubscription,
} = require('./testData/apiData');

describe('API tests', () => {
  let dynamoWriteStub;

  before(() => {
    // mock environment variables
    mockEnv = mockedEnv({
      gasPriceBucket: 'bucket',
      gasPriceDataFile: 'file',
    });

    // mock AWS SDK calls
    AWS.mock('S3', 'getObject', (params, callback) => {
      callback(null, s3PriceData.noDiff);
    });

    dynamoWriteStub = sinon.stub().returns(Promise.resolve());
    AWS.mock('DynamoDB.DocumentClient', 'put', dynamoWriteStub);
  });

  after(() => {
    // restore mocked env
    mockEnv();
    AWS.restore();
  });

  it('should call GET /get-prices and get data', async () => {
    await api.handler(mockEventGetPrices, null, (error, response) => {
      expect(response.body).to.equal(s3PriceData.noDiff.Body);
    });
  });

  it('should call POST /subscriptions', async () => {
    await api.handler(mockEventPostSubscription, null, (error, response) => {
      expect(response.statusCode).to.equal(200);
      expect(response.body).to.equal(mockEventPostSubscription.body);
    });
  });

  it('should call unknown route and get error', async () => {
    await api.handler(mockEventUnknownRoute, null, (error, response) => {
      const body = JSON.parse(response.body);
      expect(body).to.haveOwnProperty('error');
      expect(response.statusCode).to.equal(404);
      expect(body.error).to.equal(
        `No route match for ${mockEventUnknownRoute.httpMethod} ${mockEventUnknownRoute.path}`
      );
    });
  });
});
