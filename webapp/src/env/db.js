var mysql = require('mysql');
var connection = mysql.createPool({
    connectionLimit : 10,
    host: '178.128.80.22',
    user: 'parceldev',
    password: '123456',
    database: 'parcel',
    debug : false,
    timezone : '+07:00'
});
console.log("DB INIT");
// connection.connect();

module.exports = connection;