'use strict';
const AWS = require('aws-sdk');
const { mapChangesToMessageLines, constructEmailParams } = require('../utils');

const getPriceDataFromS3 = async () => {
  try {
    const s3 = new AWS.S3({ region: process.env.AWS_REGION });
    const params = {
      Bucket: process.env.gasPriceBucket,
      Key: process.env.gasPriceDataFile,
    };
    // get data from S3 bucket
    const data = await s3.getObject(params).promise();

    // parse contents as JSON
    const parsedData = JSON.parse(data.Body.toString('utf-8'));

    // sort parsed data by date
    return parsedData.sort(function (a, b) {
      return new Date(b.date) - new Date(a.date);
    });
  } catch (err) {
    return {
      error: err.message,
    };
  }
};

const writePriceDataToS3 = async body => {
  const s3 = new AWS.S3({ region: process.env.AWS_REGION });
  const params = {
    Bucket: process.env.gasPriceBucket,
    Key: process.env.gasPriceDataFile,
    Body: JSON.stringify(body),
  };
  await s3.putObject(params).promise();
};

const sendEmail = async (receiver, changes, lang) => {
  const ses = new AWS.SES({ region: process.env.AWS_REGION });
  console.log('Sending email', receiver, changes);
  const messages = mapChangesToMessageLines(changes, lang);
  const params = constructEmailParams(receiver, messages, lang);
  await ses.sendEmail(params).promise();
};

const writeSubscriptionToDynamo = async (email, subscriptions, lang) => {
  const docClient = new AWS.DynamoDB.DocumentClient({
    region: process.env.AWS_REGION,
  });
  const item = {
    email,
    subscriptions,
    lang,
  };
  const params = {
    TableName: process.env.subscriptionsTableName,
    Item: item,
  };
  await docClient.put(params).promise();
};

const getSubscriptionsFromDynamo = async () => {
  const docClient = new AWS.DynamoDB.DocumentClient({
    region: process.env.AWS_REGION,
  });
  const params = {
    TableName: process.env.subscriptionsTableName,
  };
  const response = await docClient.scan(params).promise();
  return response.Items;
};

module.exports = {
  getPriceDataFromS3,
  writePriceDataToS3,
  sendEmail,
  writeSubscriptionToDynamo,
  getSubscriptionsFromDynamo,
};
