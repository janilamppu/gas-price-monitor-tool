// test dependencies
const AWS = require('aws-sdk-mock');
const poller = require('../src/poller');
const mockedEnv = require('mocked-env');
const axios = require('axios');
const MockAdapter = require('axios-mock-adapter');
const fs = require('fs');
const { expect } = require('chai');
const sinon = require('sinon');

// mock adapter
const mock = new MockAdapter(axios);

// test data
const testDom = fs.readFileSync('test/testData/testDom.txt').toString('utf-8');
const s3PriceData = require('./testData/s3PriceData');
const subscriptionData = require('./testData/subscriptionData');
const gasDataUrl = 'gasDataUrl';

describe('Poller tests', () => {
  let mockEnv;
  let sesStub;

  before(() => {
    // mock environment variables
    mockEnv = mockedEnv({
      gasPriceBucket: 'bucketName',
      subscriptionsTableName: 'tableName',
      gasPriceDataFile: 'gasPriceDataFileName',
      gasDataUrl,
      emailSender: 'emailSender@email.com',
      AWS_REGION: 'us-east-1',
    });

    // mock axios requests
    mock.onGet(gasDataUrl).reply(200, testDom);

    // mock AWS SDK calls
    AWS.mock('S3', 'putObject', (params, callback) => {
      callback(null, null);
    });
  });

  after(() => {
    // restore mocked env
    mockEnv();
  });

  beforeEach(() => {
    sesStub = sinon.stub().returns(Promise.resolve());
    AWS.mock('SES', 'sendEmail', sesStub);
  });

  afterEach(() => {
    AWS.restore('SES', 'sendEmail');
    AWS.restore('S3', 'getObject');
    AWS.restore('DynamoDB.DocumentClient', 'scan');
    sesStub = null;
  });

  it('should run poller, send notification and respond with new entry (send notifications - sub active and price differs)', async () => {
    // mock getObject so that it has different prices than current data = notifications will be sent
    AWS.mock('S3', 'getObject', (params, callback) => {
      callback(null, s3PriceData.diff);
    });

    // mock scan so that correct subscriptions are fetched
    AWS.mock('DynamoDB.DocumentClient', 'scan', (params, callback) => {
      callback(null, subscriptionData.subscribed);
    });
    const response = await poller.handler();
    expect(response).to.haveOwnProperty('biogas');
    expect(response).to.haveOwnProperty('naturalgas');
    expect(response).to.haveOwnProperty('date');
    expect(response.biogas).to.be.an('object');
    expect(response.naturalgas).to.be.an('object');
    expect(response.date).to.be.a('string');
    expect(sesStub.calledOnce).to.be.true;
  });

  it('should run poller, respond with new entry (no notifications - no diff in prices)', async () => {
    // mock getObject so that it has same prices as current data = no notifications
    AWS.mock('S3', 'getObject', (params, callback) => {
      callback(null, s3PriceData.noDiff);
    });

    // mock scan so that correct subscriptions are fetched
    AWS.mock('DynamoDB.DocumentClient', 'scan', (params, callback) => {
      callback(null, subscriptionData.subscribed);
    });
    const response = await poller.handler();
    expect(response).to.haveOwnProperty('biogas');
    expect(response).to.haveOwnProperty('naturalgas');
    expect(response).to.haveOwnProperty('date');
    expect(response.biogas).to.be.an('object');
    expect(response.naturalgas).to.be.an('object');
    expect(response.date).to.be.a('string');
    expect(sesStub.notCalled).to.be.true;
  });

  it('should run poller, respond with new entry (no notifications - no active subscriptions)', async () => {
    // mock getObject so that it has same prices as current data = no notifications
    AWS.mock('S3', 'getObject', (params, callback) => {
      callback(null, s3PriceData.diff);
    });

    // mock scan so that correct subscriptions are fetched
    AWS.mock('DynamoDB.DocumentClient', 'scan', (params, callback) => {
      callback(null, subscriptionData.unsubscribed);
    });
    const response = await poller.handler();
    expect(response).to.haveOwnProperty('biogas');
    expect(response).to.haveOwnProperty('naturalgas');
    expect(response).to.haveOwnProperty('date');
    expect(response.biogas).to.be.an('object');
    expect(response.naturalgas).to.be.an('object');
    expect(response.date).to.be.a('string');
    expect(sesStub.notCalled).to.be.true;
  });
});
