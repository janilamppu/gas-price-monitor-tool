'use strict';

function validateEmail(email) {
  const regexp = /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
  return regexp.test(String(email).toLowerCase());
}

const mapChangesToMessageLines = changes => {
  const gasTypes = {
    biogas: 'Biokaasu',
    naturalgas: 'Maakaasu',
  };
  return changes
    .map(change => {
      const oldPrice = Number(change.oldPrice).toFixed(2);
      const newPrice = Number(change.newPrice).toFixed(2);
      const zone = change.zone.replace('zone', 'alue ');
      const gasType = gasTypes[change.type];
      return `${gasType} (${zone}): vanha hinta: ${oldPrice}, uusi hinta: ${newPrice}`;
    })
    .join('\r\n');
};

const constructEmailParams = (receiver, messages) => {
  return {
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
};

module.exports = {
  validateEmail,
  mapChangesToMessageLines,
  constructEmailParams,
};
