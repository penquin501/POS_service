var mysql = require('mysql');
var billing_connection = mysql.createPool({
    host: '104.155.237.79',
    user: 'userdevapi',
    password: 'PxnJcKJcmJm6Fdl5',
    database: 'database945ffm'
});
console.log("MAIN DB INIT");
// connection.connect();

module.exports = billing_connection;