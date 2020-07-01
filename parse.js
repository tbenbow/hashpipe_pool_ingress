const path = require('path');
const fs = require('fs');
const {InfluxDB, Point, HttpError} = require('@influxdata/influxdb-client');
const {url, token, org, bucket} = require('./env');
const {hostname} = require('os');

var testTime = new Date();
console.log(testTime);


// Pool Data
//---------------------------------
let pooldata = fs.readFileSync('json/pool.status', 'utf8');
let pooldataarray = pooldata.split("\n");
let pool = JSON.parse(pooldataarray[0]);

writePoolData(pool);

function writePoolData(pool) {
  const writeApi = new InfluxDB({url, token}).getWriteApi(org, bucket, 'ns')

  writeApi.useDefaultTags({location: hostname()})

  const poolWorkers = new Point('pool-workers')
    .floatField('value', pool.Workers)
    .timestamp(testTime)
    writeApi.writePoint(poolWorkers)

  const poolUsers = new Point('pool-users')
    .floatField('value', pool.Users)
    .timestamp(testTime)
  writeApi.writePoint(poolUsers)

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

// User Data
//---------------------------------
directoryFileList('json/users');

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
      userhashrate: user.hashrate1m,
    });

    // workers
    user.worker.forEach(function (worker) {
      workerIdArray = worker.workername.split('.');
      workers.push({
        time: user.time,
        username: file,
        workername: workerIdArray[workerIdArray.length-1],
        workerhashrate: worker.hashrate1m,
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
      .timestamp(testTime)
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
      .timestamp(testTime)
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
