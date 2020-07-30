/** InfluxDB v2 URL */
const url = process.env['INFLUXDB_URL'] || 'MY_URL'
/** InfluxDB authorization token */
const token = process.env['INFLUXDB_TOKEN'] || 'MY_INFLUX_TOKEN'
/** Organization within InfluxDB URL  */
const org = process.env['INFLUXDB_ORG'] || 'hellomoon'
/**InfluxDB bucket used in examples  */
const bucket = 'MY_BUCKET'
/** InfluxDB bucket  */
const payoutsBucket = 'MY_PAYOUTS_BUCKET'
/**InfluxDB user  */
const username = 'my-user'
/**InfluxDB password  */
const password = 'my-password'

module.exports = {
  url,
  token,
  org,
  bucket,
  payoutsBucket,
  username,
  password,
}