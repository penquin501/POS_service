var mysql = require('mysql');
var connection = mysql.createPool({
    host: '178.128.80.22',
    user: 'parceldev',
    password: '123456',
    database: 'parcel'
});
console.log("DB INIT");
// connection.connect();

module.exports = connection;