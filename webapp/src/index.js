const express = require("express");
const request = require('request');
var cron = require('node-cron');
const app = express();
const moment = require('moment');
const port = process.env.PORT || 3200;
moment.locale('th')
app.use(express.json());

const connection = require("./env/db");
const billing_connection = require("./env/mainDB");

const updateServices = require('./services/updateService.js');

app.get("/", function (req, res) {
  res.json({ 'hello': 'World' });
  // insertKeyInData()
});

// cron.schedule('50-59 * * * *', () => {
function sendDataToMainServer() {
  var sqlBillingNotSend = "SELECT billing_no FROM billing WHERE status is null";
  connection.query(sqlBillingNotSend, function (err, result) {
    if (result.length !== 0) {
      for (r = 0; r < result.length; r++) {
        let sqlquery = "SELECT b.user_id,b.mer_authen_level,b.member_code,b.carrier_id,b.billing_no,b.branch_id,b.total,b.img_url," +
          "bItem.tracking,bItem.size_id,bItem.size_price,bItem.parcel_type,bItem.cod_value," +
          "br.sender_name,br.sender_phone,br.sender_address,br.receiver_name,br.phone,br.receiver_address,d.DISTRICT_CODE," +
          "br.district_name,a.AMPHUR_CODE,br.amphur_name,p.PROVINCE_CODE,br.province_name,br.zipcode,br.remark," +
          "s.location_zone,s.alias_size,gSize.product_id,gSize.product_name,g.GEO_ID,g.GEO_NAME " +
          "FROM billing b " +
          "JOIN billing_item bItem ON b.billing_no=bItem.billing_no " +
          "JOIN billing_receiver_info br ON bItem.tracking=br.tracking " +
          "JOIN size_info s ON s.size_id=bItem.size_id " +
          "JOIN global_parcel_size gSize ON s.location_zone = gSize.area AND s.alias_size =gSize.alias_name AND bItem.parcel_type= gSize.type " +
          "JOIN postinfo_district d ON br.district_id=d.DISTRICT_ID and br.amphur_id=d.AMPHUR_ID and br.province_id=d.PROVINCE_ID " +
          "JOIN postinfo_amphur a ON br.amphur_id=a.AMPHUR_ID " +
          "JOIN postinfo_province p ON br.province_id=p.PROVINCE_ID " +
          "JOIN postinfo_geography g ON d.GEO_ID=g.GEO_ID " +
          "WHERE bItem.billing_no='" + result[r].billing_no + "'";

        connection.query(sqlquery, function (err, data) {
          if (data.length !== 0) {
            var check_pass
            for (i = 0; i < data.length; i++) {
              if (!data[i].user_id || !data[i].mer_authen_level || !data[i].member_code || !data[i].carrier_id ||
                !data[i].branch_id || !data[i].img_url || !data[i].parcel_type || !data[i].size_price ||
                !data[i].receiver_name || !data[i].phone || !data[i].receiver_address || !data[i].DISTRICT_CODE ||
                !data[i].AMPHUR_CODE || !data[i].PROVINCE_CODE || !data[i].zipcode || !data[i].product_id || !data[i].product_name || !data[i].GEO_ID || !data[i].tracking
              ) {
                check_pass = false;
              } else {
                check_pass = true;
              }
            }
            if (check_pass) {
              var orderlist = [];
              var paymentType = "";
              for (j = 0; j < data.length; j++) {
                if (data[j].parcel_type == "NORMAL") {
                  paymentType = "99";
                } else {
                  paymentType = "60";
                }
                dataDes = {
                  productinfo: {
                    globalproductid: data[j].product_id,
                    productname: data[j].product_name,
                    methodtype: data[j].parcel_type.toUpperCase(),
                    paymenttype: paymentType,
                    price: data[j].size_price.toString(),
                    codvalue: data[j].cod_value.toString()
                  },
                  destinationinfo: {
                    custname: data[j].receiver_name,
                    custphone: data[j].phone,
                    custzipcode: data[j].zipcode,
                    custaddr: data[j].receiver_address,
                    //   "custdistrict": data[i].district_name,
                    //   "custamphur": data[i].amphur_name,
                    //   "custprovince": data[i].province_name,
                    ordershortnote: '',
                    districtcode: data[j].DISTRICT_CODE,
                    amphercode: data[j].AMPHUR_CODE,
                    provincecode: data[j].PROVINCE_CODE,
                    geoid: data[j].GEO_ID,
                    geoname: data[j].GEO_NAME,
                    sendername: data[j].sender_name,
                    senderphone: data[j].sender_phone,
                    senderaddr: data[j].sender_address
                  },
                  consignmentno: data[j].tracking
                };
                orderlist.push(dataDes);
              }
              var dataAll = {
                authen: {
                  merid: data[0].branch_id,
                  userid: data[0].user_id,
                  merauthenlevel: data[0].mer_authen_level
                },
                memberparcel: {
                  memberinfo: {
                    memberid: data[0].member_code,
                    courierpid: data[0].carrier_id,
                    courierimage: data[0].img_url
                  },
                  billingno: data[0].billing_no,
                  orderlist: orderlist
                }
              }
              // console.log(JSON.stringify(dataAll));

              request(
                {
                  url:
                    "https://dev.945holding.com/webservice/restful/parcel/order_record/v11/data",
                  method: "POST",
                  body: dataAll,
                  json: true,
                  headers: {
                    'apikey': 'XbOiHrrpH8aQXObcWj69XAom1b0ac5eda2b',
                    'Content-Type': 'application/json'
                  }
                },
                (err, res, body) => {
                  if (res) {
                    // console.log('billing_no',data[0].billing_no);
                    // console.log('response',res.body); 
                    if (res.body.checkpass == 'pass' && res.body.bill_no == 'data_varidated_pass') {
                      let updateBilling = "UPDATE billing SET status='" + res.body.checkpass + "' WHERE billing_no='" + data[0].billing_no + "'"
                      connection.query(updateBilling, function (err, dataBilling) { })

                      listStatus = res.body.status
                      for (q = 0; q < listStatus.length; q++) {
                        var tracking = listStatus[q].consignmentno
                        var status = listStatus[q].status
                        var dateTimeString = moment(new Date).format("YYYY-MM-DD HH:mm:ss", true);
                        updateServices.updateStatusReceiverInfo(tracking, status, dateTimeString).then(function (data) { })
                      }
                      // console.log("bill_no finish",data[0].billing_no);
                    }
                  }
                })
            }

          }
        })
      }
    }
  })
}
// })
// cron.schedule('1-5 * * * *', () => {
function pushCaptureData() {
  var listBarcode = '';
  var dateTimeString = moment(new Date).format("YYYY-MM-DD", true);
  // var sqlParcelCapture = "SELECT barcode FROM parcel_capture_data";
  var sqlParcelCapture = "SELECT pCap.barcode FROM parcel_capture_data pCap "+
  "JOIN billing_item bi ON pCap.barcode=bi.tracking "+
  "JOIN billing_receiver_info br ON pCap.barcode=br.tracking "+
  "WHERE DATE(pCap.record_created_at)='"+dateTimeString+"'";
  connection.query(sqlParcelCapture, function (err, result) {

    if (result.length == 0) {
      listBarcode = "''";
    } else {
      for (i = 0; i < result.length; i++) {
        listBarcode = listBarcode + "'" + result[i].barcode + "',";
      }
    }
    
    // var sqlCapture = "SELECT consignmentno,rawdata FROM parcel_temp_capture WHERE recorddate = '2019-11-23' AND consignmentno NOT IN (" + listBarcode.replace(/,$/, '') + ") LIMIT 1";
    var sqlCapture="SELECT consignmentno,rawdata FROM parcel_temp_capture WHERE recorddate = '"+dateTimeString+"' AND consignmentno NOT IN (" + listBarcode.replace(/,$/, '') + ") LIMIT 1"
    billing_connection.query(sqlCapture, function (err, result2) {
      if (result2.length !== 0) {
        for (j = 0; j < result2.length; j++) {
          request(
            {
              url: "http://206.189.85.185:8100/capture/addCapture",
              method: "POST",
              body: result2[j].rawdata,
              // json: true,
              headers: {
                'Content-Type': 'application/json'
              }
            },
            (err, res, body) => {
              if (res.body) {
                console.log("result capture: ", JSON.parse(res.body).status);
              }        
            })
        }
      }
    })
  })
}
// })
function insertKeyInData() {
  var sqlParcelKeyIn = "SELECT br.tracking FROM billing_item bi " +
    "JOIN billing_receiver_info br ON bi.tracking=br.tracking " +
    "WHERE (bi.source IS NULL OR bi.source='QUICKLINK') AND br.receiver_name IS NULL";
  connection.query(sqlParcelKeyIn, function (err, result) {
    if (result.length !== 0) {
      for (i = 0; i < result.length; i++) {
        var sqlKeyIn = "SELECT consignmentno,rawdata,recordtimestamp FROM parcel_keyin_data WHERE consignmentno='" + result[i].tracking + "' ORDER BY recordtimestamp DESC";
        billing_connection.query(sqlKeyIn, function (err, result2) {
          if (result2.length >= 1) {
            request(
              {
                url: "http://206.189.85.185:8100/keyin/keyin",
                method: "POST",
                body: result2[0].rawdata,
                // json: true,
                headers: {
                  'Content-Type': 'application/json'
                }
              },
              (err, res, body) => {
                if (res) {
                  console.log("result key in: ", JSON.parse(res.body).status);
                }
              })
          }
        })
      }
    }

  })
}
// cron.schedule('1-5 * * * *', () => {
function pushKeyInData() {
  var max_record = '';
  var sqlParcelKeyIn = "SELECT MAX(record_at) as max_record_at FROM record_keyin WHERE Date(record_at)=CURRENT_DATE()";
  connection.query(sqlParcelKeyIn, function (err, result) {

    if (!result) {
      max_record = "''";
    } else {
      var max_record_datetime = moment(result[0].max_record_at).format("YYYY-MM-DD HH:mm:ss", true);
      max_record = max_record_datetime
    }

    var sqlKeyIn = "SELECT consignmentno,rawdata,recordtimestamp FROM parcel_keyin_data where recorddate=CURRENT_DATE and recordtimestamp>'" + max_record + "'";
    billing_connection.query(sqlKeyIn, function (err, result2) {
      if (result2.length !== 0) {
        for (j = 0; j < result2.length; j++) {

          var dateTimeString = moment(result2[j].recordtimestamp).format("YYYY-MM-DD HH:mm:ss", true);
          var sqlKeyInRecord = "INSERT INTO record_keyin(tracking, record_at) VALUES ('" + result2[j].consignmentno + "','" + dateTimeString + "')";
          connection.query(sqlKeyInRecord, function (err, res) { })
          request(
            {
              url: "http://206.189.85.185:8100/keyin/keyin",
              method: "POST",
              body: result2[j].rawdata,
              // json: true,
              headers: {
                'Content-Type': 'application/json'
              }
            },
            (err, res, body) => {
              if (res) {
                console.log("result", JSON.parse(res.body).status);
              }
            })
        }
      }
    })
  })
}
// })

function pushReceiverTempToReceiverInfo() {
  var sqlReceiverInfo = "SELECT tracking,parcel_type,zipcode FROM billing_receiver_info where receiver_name is null AND remark ='QUICKLINK'";
  connection.query(sqlReceiverInfo, function (err, result) {
    if (result.length !== 0) {
      for (i = 0; i < result.length; i++) {
        var tracking_info = result[i].tracking;
        var parcel_type_info = result[i].parcel_type;
        var zipcode_info = result[i].zipcode;
        
        var sqlReceiverTempInfo = "SELECT * FROM billing_receiver_info_temp where tracking='" + tracking_info + "'";
        connection.query(sqlReceiverTempInfo, function (err, result2) {

          if (result2.length !== 0 && (parcel_type_info == result2[0].parcel_type) && (zipcode_info == result2[0].zipcode)) {

            var sqlUpdateReceiver = "UPDATE billing_receiver_info SET receiver_name='" + result2[0].receiver_name + "',phone='" + result2[0].phone + "',receiver_address='" + result2[0].receiver_address + "',district_id='" + result2[0].district_id + "',district_name='" + result2[0].district_name + "',"
              + "amphur_id='" + result2[0].amphur_id + "',amphur_name='" + result2[0].amphur_name + "',province_id='" + result2[0].province_id + "',province_name='" + result2[0].province_name + "',remark='KEYIN' where tracking='" + result2[0].tracking + "'";
            connection.query(sqlUpdateReceiver, function (err, res) { })
          }

        })
      }
    }
  })
}
setInterval(sendDataToMainServer, 15000);
// setInterval(pushCaptureData, 3000);
// setInterval(pushKeyInData, 10000);
// setInterval(pushReceiverTempToReceiverInfo, 5000);
// setInterval(insertKeyInData, 10000);

app.listen(port, () => console.log(`Example app listening on port ${port}!`));
