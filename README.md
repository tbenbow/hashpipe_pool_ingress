
This is the repo for ingress into influx db.

# Setup

1. Install [node.js](https://nodejs.org/en/)

2. Run `npm install`

3. Copy "env-sample.js" as "env.js". Fill in influx credentials - same env file as the dashboard.

4. To start posting data run `node parse.js`


The script will post to influx every minute using node-cron. Values are stores as Petahash with a maximum of 6 decimal places.