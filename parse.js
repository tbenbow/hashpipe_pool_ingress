const path = require('path');
const fs = require('fs');
const cron = require("node-cron");
const {InfluxDB, Point, HttpError} = require('@influxdata/influxdb-client');
const {url, token, org, bucket} = require('./env');
const {hostname} = require('os');

var postTime;

// Every Minute "* * * * *"
// Every Second "* * * * * *"
cron.schedule("* * * * * *", function() {
  const postTime = new Date();
  console.log("Writing Data: ", postTime);
  writePoolData('json/pool.status');
  directoryFileList('json/users');
});


// Pool Data
//---------------------------------
function writePoolData(file) {
  const writeApi = new InfluxDB({url, token}).getWriteApi(org, bucket, 'ns');
  const poolFile = fs.readFileSync(file, 'utf8');  const poolFileArray = poolFile.split("\n");
  const poolJsonLine1 = JSON.parse(poolFileArray[0]);
  const poolJsonLine2 = JSON.parse(poolFileArray[1]);

  writeApi.useDefaultTags({location: hostname()});

  const poolWorkers = new Point('pool-workers')
  .floatField('value', poolJsonLine1.Workers)
  .timestamp(postTime);
  writeApi.writePoint(poolWorkers);

  const poolUsers = new Point('pool-users')
  .floatField('value', poolJsonLine1.Users)
  .timestamp(postTime);
  writeApi.writePoint(poolUsers);

  const poolHashrate = new Point('pool-hashrate')
  .floatField('value', toPetahash(poolJsonLine2.hashrate1m).toFixed(4))
  .timestamp(postTime);
  writeApi.writePoint(poolHashrate);

  writeApi
  .close()
    .then(() => {
      console.log('FINISHED...')
    })
    .catch(e => {
      console.error(e)
      console.log('\nFinished ERROR')
    });
}

// User Data
//---------------------------------
function directoryFileList(directory) {
  const directoryPath = path.join(__dirname, directory);

  fs.readdir(directoryPath, function (err, files) {
    fileArray = [];
    if (err) {
      console.log('Unable to scan directory: ' + err);
    }
    files.forEach(function (file) {
      fileArray.push(file);
    });

    parseUserFiles(fileArray);
  });
}

function parseUserFiles(fileArray) {
  users = [];
  workers = [];

  fileArray.forEach(function (file) {
    let userData = fs.readFileSync(`json/users/${file}`, 'utf8');
    let user = JSON.parse(userData);

    // users
    users.push({
      time: user.time,
      username: file,
      userhashrate: toPetahash(user.hashrate1m).toFixed(4),
    });

    // workers
    user.worker.forEach(function (worker) {
      workerIdArray = worker.workername.split('.');
      workers.push({
        time: user.time,
        username: file,
        workername: workerIdArray[workerIdArray.length-1],
        workerhashrate: toPetahash(worker.hashrate1m).toFixed(4),
      });
    })
  })

  createUserPoints(users);
  createWorkerPoints(workers);
}

function createUserPoints(users) {
  var userPoints = [];

  users.forEach(function (user){
    const userPoint = new Point('user-hashrate')
      .floatField('value', user.userhashrate)
      .tag('user', user.username)
      .timestamp(postTime)
    userPoints.push(userPoint);

    writePoints(userPoints);
  });
}

function createWorkerPoints(workers) {
  var workerPoints = [];

  workers.forEach(function (worker){
    const userPoint = new Point('worker-hashrate')
      .floatField('value', worker.workerhashrate)
      .tag('user', worker.username)
      .tag('worker', worker.workername)
      .timestamp(postTime)
    workerPoints.push(userPoint);

    writePoints(workerPoints);
  });
}

function writePoints(points) {
  const writeApi = new InfluxDB({url, token}).getWriteApi(org, bucket, 'ns')
  writeApi.useDefaultTags({location: hostname()})
  writeApi.writePoints(points)
  writeApi
    .close()
    .then(() => {
      console.log('FINISHED...')
    })
    .catch(e => {
      console.error(e)
      console.log('\nFinished ERROR')
    })
}


// Conversion
// 1 Gigahash (G) = 1000 Megahash
// 1 Terahash (T) = 1000 Gigahash
// 1 Petahash (P) = 1000 Terahash
// 1 Exahash (E) = 1000 Petahash
//
// Expects a string that ends with a single letter 'G', 'T','P','E'
//-----------------------------------------------------------------
function toPetahash(withUnit) {
  const amount = withUnit.slice(0, -1);
  const unit = withUnit.slice(-1);
  const conversionTable = {
    'G': 1000000,
    'T': 1000,
    'P': 1,
    'E': .001,
  };

  return amount / conversionTable[unit];
}
