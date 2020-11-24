/** InfluxDB v2 URL */
const url = process.env['INFLUXDB_URL'] || 'MY_URL'
/** InfluxDB authorization token */
const token = process.env['INFLUXDB_TOKEN'] || 'MY_INFLUX_TOKEN'
/** Organization within InfluxDB URL  */
const org = process.env['INFLUXDB_ORG'] || 'MY_ORG_NAME'
/** InfluxDB bucket for short term data  */
const bucket = 'MY_BUCKET'
/** InfluxDB bucket for long term data  */
const payoutsBucket = 'MY_PAYOUTS_BUCKET'
/** Path to the pool.status file */
const poolFilePath = 'json/pool.status'
/** Path to the folder with all the user files  */
const userFilesPath = 'json/users'
/** Path to the folder with all the block files  */
const blockFilesPath = 'json/blocks'

module.exports = {
  url,
  token,
  org,
  bucket,
  payoutsBucket,
  poolFilePath,
  userFilesPath,
  blockFilesPath,
}