const path = require('path');
const fs = require('fs');
const cron = require("node-cron");
const Timestamp = require("timestamp-nano");
const {InfluxDB, Point, HttpError} = require('@influxdata/influxdb-client');
const {hostname} = require('os');

var postTime;

// Environment Variables
const {url, token, org, bucket, payoutsBucket, poolFilePath, userFilesPath, blockFilesPath} = require('./env');

// Every minute "* * * * *" or every 10 seconds "*/10 * * * * *"
cron.schedule("* * * * *", function() {
  const postTime = new Date();
  console.log("Writing Data: ", postTime);
  writePoolData(poolFilePath);
  readUserFiles(userFilesPath);
  readBlockFiles(blockFilesPath);
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
function readUserFiles(directory) {
  getDirectoryFileList(directory, parseUserFiles);
}

function parseUserFiles(fileList) {
  var users = [];
  var workers = [];
  fileList.forEach(function (file) {
    let userData = fs.readFileSync(`${userFilesPath}/${file}`, 'utf8');
    let user = JSON.parse(userData);
    if (parseFloat(user.hashrate1m) > 0) {
      users.push({
        time: user.time,
        username: file,
        userhashrate: toPetahash(user.hashrate1m).toFixed(4),
      });
      user.worker.forEach(function (worker) {
        if (parseFloat(worker.hashrate1m) > 0) {
          workerIdArray = worker.workername.split('.');
          workers.push({
            time: user.time,
            username: file,
            workername: workerIdArray[workerIdArray.length-1],
            workerhashrate: toPetahash(worker.hashrate1m).toFixed(4),
          });
        }
      });
    }
  });
  createUserPoints(users);
  createWorkerPoints(workers);
}

function createUserPoints(users) {
  var userPoints = [];
  users.forEach(function (user){
    if (parseFloat(user.userhashrate) > 0) {
      const userPoint = new Point('user-hashrate')
        .floatField('value', user.userhashrate)
        .tag('user', user.username)
        .timestamp(postTime)
      userPoints.push(userPoint);
    }
  });
  writePoints(userPoints);
}

function createWorkerPoints(workers) {
  var workerPoints = [];
  workers.forEach(function (worker){
    if (parseFloat(worker.workerhashrate) > 0) {
      const userPoint = new Point('worker-hashrate')
        .floatField('value', worker.workerhashrate)
        .tag('user', worker.username)
        .tag('worker', worker.workername)
        .timestamp(postTime)
      workerPoints.push(userPoint);
    }
    writePoints(workerPoints);
  });
}

// Blocks
//---------------------------------
function readBlockFiles(directory) {
  getDirectoryFileList(directory, parseBlockFiles);
}

function parseBlockFiles(fileList) {
  var blocks = [];
  var payouts = [];
  const validFileList = fileList.filter(function(file) {
    return path.extname(file).toLowerCase() === '.confirmed';
  });
  validFileList.forEach(function (file) {
    let blockData = fs.readFileSync(`${blockFilesPath}/${file}`, 'utf8');
    let block = JSON.parse(blockData);
    const isoDateString = block.date.replace(' ','T').replace('[','').replace(']','Z'); // Setting up as ISO UTC format
    const timestamp = Timestamp.fromDate(new Date(isoDateString)).time * 1000000;
    blocks.push({
      time: timestamp,
      hash: block.hash,
      height: block.height,
      reward: block.reward
    });
    Object.keys(block.payouts).forEach(function (key, index) {
      payouts.push({
        time: timestamp,
        username: key,
        amount: block.payouts[key],
        block: block.height,
        hash: block.hash
      });
    });
  });
  createBlockPoints(blocks);
  createPayoutPoints(payouts);
  renameBlockFiles(validFileList);
}

function createBlockPoints(blocks) {
  var blockPoints = [];
  blocks.forEach(function (block){
    const blockPoint = new Point('blocks')
      .floatField('height', block.height)
      .tag('hash', block.hash)
      .tag('amount', block.reward)
      .timestamp(block.time)
    blockPoints.push(blockPoint);
  });
  writePoints(blockPoints);
}

function createPayoutPoints(payouts) {
  var payoutPoints = [];
  payouts.forEach(function (payout){
    const payoutPoint = new Point('payouts')
      .floatField('block', payout.block)
      .tag('user', payout.username)
      .tag('hash', payout.hash)
      .tag('amount', payout.amount)
      .timestamp(payout.time)
    payoutPoints.push(payoutPoint);
  });
  writePayoutPoints(payoutPoints);
}
function renameBlockFiles(validFileList) {
  validFileList.forEach(function (file) {
    const fileWithoutExtension = file.replace(/\.[^/.]+$/, "");
    const oldFilePath = `${blockFilesPath}/${file}`;
    const newFilePath = `${blockFilesPath}/${fileWithoutExtension}.imported`;
    fs.rename(oldFilePath, newFilePath, (error) => {
      if (error) {
        console.log('error naming files: ', error);
      }
    });
  });
}

// Write Points
//---------------------------------
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
function writePayoutPoints(points) {
  const writeApi = new InfluxDB({url, token}).getWriteApi(org, payoutsBucket, 'ns')
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

// Read Files
//---------------------------------
function getDirectoryFileList(directory, callback) {
  const directoryPath = path.join(__dirname, directory);
  fs.readdir(directoryPath, function (err, files) {
    var fileList = [];
    if (err) {
      console.log('Unable to scan directory: ' + err);
    }
    files.forEach(function (file) {
      fileList.push(file);
    });
    callback(fileList);
  });
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
