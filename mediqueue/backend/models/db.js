const mysql = require('mysql2');
 
const pool = mysql.createPool({
  host:     process.env.DB_HOST     || 'kx1s-e.h.filess.io',
  port:     process.env.DB_PORT     || 3307,
  user:     process.env.DB_USER     || 'mediqueue_worejoined',
  password: process.env.DB_PASSWORD || '0f7d313db08394d30d7c8b2fce657ecdc50e93a6',
  database: process.env.DB_NAME     || 'mediqueue_worejoined',
  waitForConnections: true,
  connectionLimit: 3,
  queueLimit: 0
});
 
const db = pool.promise();
 
module.exports = db;
 