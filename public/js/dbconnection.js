// import mysql from 'mysql2';
//database server must have started
import mysql from 'mysql2/promise'; 
import { config } from 'dotenv';

// Load environment variables from a .env file in the same directory
config();

const pool = mysql.createPool({
  host: 'localhost',
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: 'slmobi',
  connectionLimit: 10
});

export default pool;