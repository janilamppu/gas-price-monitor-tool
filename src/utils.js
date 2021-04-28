'use strict';
const messages = require('./messages');

function validateEmail(email) {
  const regexp = /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
  return regexp.test(String(email).toLowerCase());
}

const mapChangesToMessageLines = (changes, lang) => {
  const gasTypes = {
    biogas: messages[lang]['biogas'],
    naturalgas: messages[lang]['naturalgas'],
  };
  return changes
    .map(change => {
      const oldPrice = Number(change.oldPrice).toFixed(2);
      const newPrice = Number(change.newPrice).toFixed(2);
      const zone = change.zone.replace('zone', `${messages[lang]['zone']} `);
      const gasType = gasTypes[change.type];
      return `${gasType} (${zone}): ${messages[lang]['oldPrice']}: ${oldPrice}, ${messages[lang]['newPrice']}: ${newPrice}`;
    })
    .join('\r\n');
};

const constructEmailParams = (receiver, msgs, lang) => {
  return {
    Destination: {
      ToAddresses: [receiver],
    },
    Message: {
      Body: {
        Text: {
          Charset: 'UTF-8',
          Data: msgs,
        },
      },
      Subject: {
        Charset: 'UTF-8',
        Data: messages[lang]['changeInPrice'],
      },
    },
    Source: process.env.emailSender,
  };
};

module.exports = {
  validateEmail,
  mapChangesToMessageLines,
  constructEmailParams,
};
