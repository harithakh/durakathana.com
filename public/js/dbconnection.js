// import mysql from 'mysql2';
//database server must have started
import mysql from 'mysql2/promise'; 

const pool = mysql.createPool({
  host: 'localhost',
  user: 'root',
  password: 'scsci',
  database: 'slmobi',
  connectionLimit: 10
});

export default pool;