'use strict';
const AWS = require('aws-sdk');
const s3 = new AWS.S3();
const ses = new AWS.SES();

const getDataFromS3 = async () => {
  try {
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

const writeDataToS3 = async body => {
  const params = {
    Bucket: process.env.gasPriceBucket,
    Key: process.env.gasPriceDataFile,
    Body: JSON.stringify(body),
  };
  await s3.putObject(params).promise();
};

const sendEmail = async (oldPrice, newPrice) => {
  const params = {
    Destination: {
      ToAddresses: [process.env.emailReceiver],
    },
    Message: {
      Body: {
        Text: {
          Charset: 'UTF-8',
          Data: `Maakaasun hinta on muuttunut. Uusi hinta on ${newPrice} € / kg (vanha hinta oli ${oldPrice} € / kg)`,
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

module.exports = {
  getDataFromS3,
  writeDataToS3,
  sendEmail,
};
