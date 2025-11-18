# Backend API

A simple Python web API using Flask.

### Build and Deploy

Run the following commands to build and deploy the application to lambda. 

```bash
sam build --use-container
sam deploy --guided
```
When the deployment completes, take note of FlaskApi's Value. It is the API Gateway endpoint URL. 

### Verify it works

Open FlaskApi's URL in a browser, you should see "hello world" on the page. 

