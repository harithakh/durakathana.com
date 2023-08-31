import mariadb from mariadb;

const pool = mariadb.createPool({
    host: 'localhost', 
    user:'root', 
    password: 'scsci',
    // database: 'database_name',
    connectionLimit: 5
});

module.exports = pool;