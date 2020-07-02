
This is the repo for ingress into influx db.

# Setup

1. Install [node.js](https://nodejs.org/en/)

2. Run `npm install`

3. Copy "env-sample.js" as "env.js", same env file as the dashboard.

4. To start posting data run `node parse.js`


The script will post to influx every minute using node-cron.

Currently we're using test json. You will not see values change unless you update "json/pool.status" and "json/users/user1" between the the minute long posting periods. I'm using the "hashrate1m" value in the user file. For pool.status I'm consuming the "workers" and "users" values. 