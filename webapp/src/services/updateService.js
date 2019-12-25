const connection = require("../env/db.js");
const bodyParser = require("body-parser");
const request = require("request");
const moment = require("moment");

const events = require("events");
const bus = new events.EventEmitter();

require("../events/verify")(bus);
// require('../events/sendApi')(bus2);

moment.locale("th");

module.exports = {
  updateStatusReceiverInfo: (tracking, status, dateTimeString) => {
    return new Promise(function(resolve, reject) {
      let sql =
        "SELECT status FROM billing_receiver_info where tracking='" +
        tracking +
        "'";
      connection.query(sql, (error, results, fields) => {
        // resolve(results);
        if (results[0].status != "success") {
          let updateReceiverInfo =
            "UPDATE billing_receiver_info SET status='" +
            status +
            "',sending_date='" +
            dateTimeString +
            "' WHERE tracking='" +
            tracking +
            "'";
          connection.query(updateReceiverInfo, function(err, data) {});
        }
      });
    });
  },
  selectBillingNotSend: () => {
    var sqlBillingNotSend =
      "SELECT billing_no FROM billing WHERE status is null";
    return new Promise(function(resolve, reject) {
      connection.query(sqlBillingNotSend, (error, results, fields) => {
        resolve(results);
      });
    });
  },
  selectDataInBillNo: bill_no => {
    var sqlBilling =
      "SELECT user_id,mer_authen_level,member_code,carrier_id,billing_no,branch_id,total,img_url FROM billing WHERE billing_no= ?";
    var dataBilling = [bill_no];

    let sqlBillingItem =
    "SELECT bItem.tracking,bItem.size_id,bItem.size_price,bItem.parcel_type as bi_parcel_type,bItem.zipcode as bi_zipcode,bItem.cod_value," +
    "br.sender_name,br.sender_phone,br.sender_address,br.receiver_name,br.phone,br.receiver_address,d.DISTRICT_CODE," +
    "br.district_name,a.AMPHUR_CODE,br.amphur_name,p.PROVINCE_CODE,br.province_name,br.parcel_type as br_parcel_type,br.zipcode as br_zipcode,br.remark," +
    "s.location_zone,s.alias_size,gSize.product_id,gSize.product_name,g.GEO_ID,g.GEO_NAME " +
    "FROM billing_item bItem " +
    "LEFT JOIN billing_receiver_info br ON bItem.tracking=br.tracking " +
    "LEFT JOIN size_info s ON bItem.size_id=s.size_id " +
    "LEFT JOIN global_parcel_size gSize ON s.location_zone = gSize.area AND s.alias_size =gSize.alias_name AND bItem.parcel_type= gSize.type " +
    "LEFT JOIN postinfo_district d ON br.district_id=d.DISTRICT_ID and br.amphur_id=d.AMPHUR_ID and br.province_id=d.PROVINCE_ID " +
    "LEFT JOIN postinfo_amphur a ON br.amphur_id=a.AMPHUR_ID " +
    "LEFT JOIN postinfo_province p ON br.province_id=p.PROVINCE_ID " +
    "LEFT JOIN postinfo_geography g ON d.GEO_ID=g.GEO_ID " +
    "WHERE bItem.billing_no=?";
    var dataBillItem = [bill_no];
    return new Promise(function(resolve, reject) {
      connection.query(sqlBilling, dataBilling, (err, resultBilling) => {
        if (!resultBilling) {
          resolve(false);
        } else {
          connection.query(
            sqlBillingItem,
            dataBillItem,
            (err, resultBillingItem) => {
              // if (!resultBillingItem) {
              //     resolve(false)
              // } else {
              //     var check_pass
              //     for (i = 0; i < resultBillingItem.length; i++) {
              //         if(!resultBilling[0].user_id ||!resultBilling[0].mer_authen_level ||!resultBilling[0].member_code||
              //             !resultBilling[0].carrier_id||!resultBilling[0].billing_no||!resultBilling[0].branch_id){
              //             check_pass = false;
              //         } else if (!resultBillingItem[i].bi_parcel_type || !resultBillingItem[i].size_price || !resultBillingItem[i].receiver_name ||
              //             !resultBillingItem[i].phone || !resultBillingItem[i].receiver_address || !resultBillingItem[i].DISTRICT_CODE ||
              //             !resultBillingItem[i].AMPHUR_CODE || !resultBillingItem[i].PROVINCE_CODE || !resultBillingItem[i].br_zipcode ||
              //             !resultBillingItem[i].product_id || !resultBillingItem[i].product_name || !resultBillingItem[i].GEO_ID || !resultBillingItem[i].tracking
              //         ) {
              //             check_pass = false;
              //         } else if(resultBillingItem[i].bi_parcel_type!=resultBillingItem[i].br_parcel_type || resultBillingItem[i].bi_zipcode!=resultBillingItem[i].br_zipcode){
              //             check_pass = false;
              //         } else {
              //             check_pass = true;
              //         }
              //     }
              //     if (check_pass) {
              var dataResult = {
                billingInfo: resultBilling,
                billingItem: resultBillingItem
              };
              //         resolve(dataResult);
              //     }
              // }
              resolve(dataResult);
            }
          );
        }
      });
    });
  },
  updatePending: (status, billingNo) => {
    let updateBilling = "UPDATE billing SET status=? WHERE billing_no=?";
    let data = [status, billingNo];
    return new Promise(function(resolve, reject) {
      connection.query(updateBilling, data, (err, results) => {
        bus.emit("verify", billingNo);
      });
    });
  },
  prepareRawData: () => {
    let selectJson =
      "SELECT prepare_raw_data,billing_no FROM billing_test WHERE status = ? AND prepare_raw_data is not null LIMIT 1";
    let data = ['pending'];
    return new Promise(function(resolve, reject) {
      connection.query(selectJson, data, (err, results) => {
        if (results.length==0) {
          resolve(false);
        } else {
          resolve(results);
        }
      });
    });
  },
  updateStatusBilling: (bill_no, status) => {
    let sql = "UPDATE billing SET status=? WHERE billing_no=?";
    var data = [status, bill_no];
    return new Promise(function(resolve, reject) {
      connection.query(sql, data, (err, results) => {
        resolve(results);
      });
    });
  },
  updateStatusReceiverInfo: (tracking, status) => {
    // var dateTimeString = moment(new Date).format("YYYY-MM-DD HH:mm:ss", true);
    let sql =
      "UPDATE billing_receiver_info SET status=?,sending_date=? WHERE tracking=?";
    var data = [status, new Date(), tracking];

    return new Promise(function(resolve, reject) {
      connection.query(sql, data, (err, results) => {
        resolve(results);
      });
    });
  }
};
