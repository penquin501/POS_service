const connection = require("../env/db");
const events = require("events");
const momentTimezone = require("moment-timezone");
const bus2 = new events.EventEmitter();

require("./sendApi.js")(bus2);

module.exports = bus => {
  bus.on("verify", msg => {
    console.log("verify", msg);
    bus2.emit("update_last_process",{state:"verify"});
    
    billingNo = msg;
    var sqlBilling =
      "SELECT user_id,mer_authen_level,member_code,carrier_id,billing_no,branch_id,img_url FROM billing WHERE billing_no= ?";
    var dataBilling = [billingNo];

    let sqlBillingItem =
      "SELECT bItem.tracking,bItem.size_price,bItem.parcel_type as bi_parcel_type,bItem.zipcode as bi_zipcode,bItem.cod_value," +
      "br.sender_name,br.sender_phone,br.sender_address,br.receiver_name,br.phone,br.receiver_address,d.DISTRICT_CODE," +
      "a.AMPHUR_CODE,p.PROVINCE_CODE,br.parcel_type as br_parcel_type,br.zipcode as br_zipcode,br.remark,br.courirer_id,br.booking_date," +
      "s.alias_size,gSize.product_id,gSize.product_name,g.GEO_ID,g.GEO_NAME " +
      "FROM billing_item bItem " +
      "LEFT JOIN billing_receiver_info br ON bItem.tracking=br.tracking " +
      "LEFT JOIN size_info s ON bItem.size_id=s.size_id " +
      "LEFT JOIN global_parcel_size gSize ON s.location_zone = gSize.area AND s.alias_size =gSize.alias_name AND bItem.parcel_type= gSize.type " +
      "LEFT JOIN postinfo_district d ON br.district_id=d.DISTRICT_ID and br.amphur_id=d.AMPHUR_ID and br.province_id=d.PROVINCE_ID " +
      "LEFT JOIN postinfo_amphur a ON br.amphur_id=a.AMPHUR_ID " +
      "LEFT JOIN postinfo_province p ON br.province_id=p.PROVINCE_ID " +
      "LEFT JOIN postinfo_geography g ON d.GEO_ID=g.GEO_ID " +
      "WHERE bItem.billing_no=? AND (br.status != 'cancel' or br.status is null)";
    var dataBillItem = [billingNo];
    connection.query(sqlBilling, dataBilling, function(err, resultBilling) {
      if (resultBilling.length > 0) {
        connection.query(sqlBillingItem,dataBillItem,(err, resultBillingItem) => {
            if (resultBillingItem.length > 0) {

              console.log("verify === %s === %d",resultBilling[0].billing_no,resultBillingItem.length);
              var check_pass_item = true;
              var check_pass = true;
              if (check_pass_item && check_pass) {
                var dataResult = {
                  billingInfo: resultBilling,
                  billingItem: resultBillingItem
                };
                bus.emit("set_json_format", dataResult);

              } else {
                bus.emit("update_status_to_null", resultBilling[0].billing_no);
              }
              
            }
          }
        );
      }
    });
  });

  bus.on("set_json_format", msg => {
    bus2.emit("update_last_process",{state:"set JSON format"});

    var billingInfo = msg.billingInfo;
    var data = msg.billingItem;

    var orderlist = [];
    var paymentType = "";
    for (j = 0; j < data.length; j++) {
      if (data[j].bi_parcel_type == "NORMAL") {
        paymentType = "99";
      } else {
        paymentType = "60";
      }

      if (data[j].sender_address == null) {
        sender_address = "-";
      } else {
        sender_address = data[j].sender_address;
      }

      if (data[j].remark == "KEYIN" || data[j].remark == null) {
        ordershortnote = "";
      } else {
        ordershortnote = data[j].remark;
      }

      dataDes = {
        productinfo: {
          globalproductid: data[j].product_id,
          productname: data[j].product_name,
          methodtype: data[j].bi_parcel_type.toUpperCase(),
          paymenttype: paymentType,
          price: data[j].size_price.toString(),
          codvalue: data[j].cod_value.toString()
        },
        destinationinfo: {
          custname: data[j].receiver_name,
          custphone: data[j].phone,
          custzipcode: data[j].br_zipcode,
          custaddr: data[j].receiver_address,
          ordershortnote: ordershortnote,
          districtcode: data[j].DISTRICT_CODE,
          amphercode: data[j].AMPHUR_CODE,
          provincecode: data[j].PROVINCE_CODE,
          geoid: data[j].GEO_ID,
          geoname: data[j].GEO_NAME,
          sendername: data[j].sender_name,
          senderphone: data[j].sender_phone,
          senderaddr: sender_address
        },
        consignmentno: data[j].tracking,
        // TODO: update courirer_id after "counter"'s application send data
        // transporter_id: data[j].courirer_id,
        transporter_id: 7,
        user_id: "0",
			  sendmaildate: momentTimezone(data[j].booking_date).tz("Asia/Bangkok").format("YYYY-MM-DD HH:mm:ss", true)
      };
      orderlist.push(dataDes);
    }

    var dataAll = {
      apikey: process.env.W945_APIKEY,
      authen: {
        merid: billingInfo[0].branch_id,
        userid: billingInfo[0].user_id,
        merauthenlevel: billingInfo[0].mer_authen_level
      },
      memberparcel: {
        memberinfo: {
          memberid: billingInfo[0].member_code,
          courierpid: billingInfo[0].carrier_id,
          courierimage: billingInfo[0].img_url
        },
        billingno: billingInfo[0].billing_no,
        orderlist: orderlist
      }
    };

    var dataLog = {
      status: "set JSON format",
      billingNo: billingInfo[0].billing_no
    };
    bus2.emit("save_to_log", dataLog);
    bus.emit("save_raw_data", dataAll);
    
  });

  bus.on("save_raw_data", msg => {
    console.log("save_raw_data", msg.memberparcel.billingno);
    bus2.emit("update_last_process",{state:"save raw data"});

    billingNo = msg.memberparcel.billingno;
    let sqlSaveJson =
      "UPDATE billing SET prepare_raw_data=? WHERE billing_no=?";
    let data = [JSON.stringify(msg), billingNo];
    connection.query(sqlSaveJson, data, function(err, result) {});
  });

  bus.on("update_status_to_null", msg => {
    console.log("update_status_to_null", msg);
    billingNo = msg;
    var status = "booked";

    let sqlUpdateStatus = "UPDATE billing SET status=? WHERE billing_no=?";
    let data = [status, billingNo];

    connection.query(sqlUpdateStatus, data, function(err, result) {});
    bus2.emit("update_last_process",{state:"reset booked"});
  });
};
