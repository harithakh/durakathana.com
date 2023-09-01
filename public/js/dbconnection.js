import * as mariadb from 'mariadb';
//database server must have started

const pool = mariadb.createPool({
    host: 'localhost', 
    user:'root', 
    password: 'scsci',
    database: 'slmobi',
    connectionLimit: 5
});

export default pool;