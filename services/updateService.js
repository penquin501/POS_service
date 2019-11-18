const connection = require('../env/db.js');
const bodyParser = require('body-parser');
const request = require('request');
const moment = require('moment');
moment.locale('th')

module.exports = {
    updateStatusReceiverInfo: (tracking,status,dateTimeString) => {
        return new Promise(function(resolve, reject) {
            let sql = "SELECT status FROM billing_receiver_info where tracking='"+tracking+"'"
            connection.query(sql, (error, results, fields) => {
                // resolve(results);
                if(results[0].status!='success'){
                    let updateReceiverInfo="UPDATE billing_receiver_info SET status='"+status+"',sending_date='"+dateTimeString+"' WHERE tracking='"+tracking+"'"
                    connection.query(updateReceiverInfo, function(err, data) {})
                  }
            });
        })
    },
}