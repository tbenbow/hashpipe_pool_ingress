/** InfluxDB v2 URL */
const url = process.env['INFLUXDB_URL'] || 'MY_URL'
/** InfluxDB authorization token */
const token = process.env['INFLUXDB_TOKEN'] || 'MY_INFLUX_TOKEN'
/** Organization within InfluxDB URL  */
const org = process.env['INFLUXDB_ORG'] || 'MY_ORGANIZATION_NAME'
/**InfluxDB bucket used in examples  */
const bucket = 'MY_BUCKET'
/** Path to the pool.status file */
const poolFilePath = 'json/pool.status'
/** Path to the folder with all the user files  */
const userFilesPath = 'json/users'

module.exports = {
  url,
  token,
  org,
  bucket,
  poolFilePath,
  userFilesPath
}