var mysql = require('mysql');
var connection = mysql.createPool({
    connectionLimit : 10,
    host : process.env.MYSQL_HOST,
    user : process.env.MYSQL_USERNAME,
    password : process.env.MYSQL_PASSWORD,
    database : process.env.MYSQL_DATABASE_NAME,
    debug : false,
    timezone : '+07:00'
});
console.log("DB INIT");
// connection.connect();

module.exports = connection;