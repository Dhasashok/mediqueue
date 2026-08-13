const mysql = require('mysql2');
 
const pool = mysql.createPool({
  host:     process.env.DB_HOST     || 'gateway01.ap-southeast-1.prod.aws.tidbcloud.com',
  port:     process.env.DB_PORT     || 4000,
  user:     process.env.DB_USER     || 'fw776NpSgfpeTyT.root',
  password: process.env.DB_PASSWORD || '8pMHJSp5fkyEzRMR',
  database: process.env.DB_NAME     || 'mediqueue',
  ssl:      process.env.DB_SSL === 'false' ? undefined : { minVersion: 'TLSv1.2', rejectUnauthorized: true },
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});
 
const db = pool.promise();
 
module.exports = db;
 