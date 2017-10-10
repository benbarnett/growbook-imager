'use strict';

const AWS = require('aws-sdk');
const Sharp = require('sharp');

exports.handler = function(event, context, callback) {
  const S3 = new AWS.S3({
    signatureVersion: 'v4',
  });
  
  const BUCKET = event.queryStringParameters.bucket;
  const URL = event.queryStringParameters.url;

  const key = event.queryStringParameters.key;

  const widthMatch = key.match(/w_(\d+)/);
  const heightMatch = key.match(/h_(\d+)/);
  const cropMatch = key.match(/c_(.+),(.+),(.+),(.+)\//);
  
  const width = widthMatch && parseInt(widthMatch[1], 10);
  const height = heightMatch && parseInt(heightMatch[1], 10);
  // const [, x, y, cropWidth, cropHeight] = cropMatch && cropMatch;


  const originalKey = key.split('/').pop();
  
  S3.getObject({Bucket: BUCKET, Key: originalKey}).promise()
    .then(data => {
      return Sharp(data.Body)
      .resize(width, height)
      .toFormat('png')
      .toBuffer()
    })
    .then(buffer => S3.putObject({
        Body: buffer,
        Bucket: BUCKET,
        ContentType: 'image/png',
        CacheControl: `max-age=${14 * 24 * 60 * 60}`,
        Key: key,
      }).promise()
    )
    .then(() => callback(null, {
        statusCode: '301',
        headers: {'location': `${URL}/${key}`},
        body: '',
      })
    )
    .catch(err => callback(err))
}
