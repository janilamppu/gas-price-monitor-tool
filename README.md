# gas-price-monitor-tool

This is a Serverless framework + AWS based project containing:

- a CRON job that polls the prices of natural- and biogas from Gasum price listing. The job stores the prices with timestamps in an AWS DynamoDB table.
- subscription feature: an email address can subscribe to receive events on gas price changes on gas type / station zone level
- REST API that provides the gas prices stored in the DynamoDB table
