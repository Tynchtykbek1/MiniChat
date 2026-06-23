require('dotenv').config();

const mysql = require('mysql2/promise');

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10
});

async function testConnection() {
  try {
    const connection = await pool.getConnection();
    console.log('Connected to the MySQL database');
    connection.release();
  } catch (error) {
    console.error('MySQL connection failed:', error.message);
  }
}

testConnection();

module.exports = pool;
