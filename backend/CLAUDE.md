# Project Information

This is a simple backend API written in Python and Flask. It is deployed to AWS Lambda using the AWS Serverless Application model, and uses the Lambda Web Adapter project to allow an entire Flask web API to run inside the context of Lambda.

It uses DynamoDB as it's persistence layer, and any database modelling you perform should follow the principles of single-table design.