'use strict';
const AWS = require('aws-sdk');

const getPriceDataFromS3 = async () => {
  try {
    const s3 = new AWS.S3({ region: process.env.AWS_REGION });
    const params = {
      Bucket: process.env.gasPriceBucket,
      Key: process.env.gasPriceDataFile,
    };
    const data = await s3.getObject(params).promise();
    const parsedData = JSON.parse(data.Body.toString('utf-8'));
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

const sendEmail = async (receiver, changes) => {
  const ses = new AWS.SES({ region: process.env.AWS_REGION });
  console.log('Sending email', receiver, changes);
  const gasTypes = {
    biogas: 'Biokaasu',
    naturalgas: 'Maakaasu',
  };
  const messages = changes
    .map(change => {
      const oldPrice = Number(change.oldPrice).toFixed(2);
      const newPrice = Number(change.newPrice).toFixed(2);
      const zone = change.zone.replace('zone', 'alue ');
      const gasType = gasTypes[change.type];
      return `${gasType} (${zone}): vanha hinta: ${oldPrice}, uusi hinta: ${newPrice}`;
    })
    .join('\r\n');
  const params = {
    Destination: {
      ToAddresses: [receiver],
    },
    Message: {
      Body: {
        Text: {
          Charset: 'UTF-8',
          Data: messages,
        },
      },
      Subject: {
        Charset: 'UTF-8',
        Data: 'Muutos kaasun hinnassa',
      },
    },
    Source: process.env.emailSender,
  };
  await ses.sendEmail(params).promise();
};

const writeSubscriptionToDynamo = async (email, subscriptions) => {
  const docClient = new AWS.DynamoDB.DocumentClient({
    region: process.env.AWS_REGION,
  });
  const item = {
    email,
    subscriptions,
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
