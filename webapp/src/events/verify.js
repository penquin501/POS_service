const connection = require("../env/db");
const events = require("events");
const bus2 = new events.EventEmitter();

require("./sendApi.js")(bus2);

module.exports = bus => {
  bus.on("verify", msg => {
    console.log("verify", msg);
    billingNo = msg;

    var sqlBilling =
      "SELECT user_id,mer_authen_level,member_code,carrier_id,billing_no,branch_id,img_url FROM billing WHERE billing_no= ?";
    var dataBilling = [billingNo];

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
    var dataBillItem = [billingNo];

    connection.query(sqlBilling, dataBilling, function (err, resultBilling) {
      if (resultBilling.length > 0) {
        connection.query(sqlBillingItem, dataBillItem, (err, resultBillingItem) => {
          if (resultBillingItem.length > 0) {
            var check_pass_item;
            for (i = 0; i < resultBillingItem.length; i++) {
              if (
                resultBillingItem[i].bi_parcel_type !== null &&
                resultBillingItem[i].size_price !== null &&
                resultBillingItem[i].receiver_name !== null &&
                resultBillingItem[i].phone !== null &&
                resultBillingItem[i].receiver_address !== null &&
                resultBillingItem[i].DISTRICT_CODE !== null &&
                resultBillingItem[i].AMPHUR_CODE !== null &&
                resultBillingItem[i].PROVINCE_CODE !== null &&
                resultBillingItem[i].br_zipcode !== null &&
                resultBillingItem[i].product_id !== null &&
                resultBillingItem[i].product_name !== null &&
                resultBillingItem[i].GEO_ID !== null &&
                resultBillingItem[i].tracking !== null
              ) {
                check_pass_item = true;
                // } else if (
                //   resultBillingItem[i].bi_parcel_type !==
                //     resultBillingItem[i].br_parcel_type ||
                //   resultBillingItem[i].bi_zipcode !==
                //     resultBillingItem[i].br_zipcode
                // ) {
                //   check_pass = false;
              } else {
                check_pass_item = false;
              }
            }
            var check_pass
            if (resultBilling[0].user_id !== null && resultBilling[0].mer_authen_level !== null && resultBilling[0].member_code !== null && resultBilling[0].carrier_id !== null && resultBilling[0].img_url !== null && resultBilling[0].branch_id !== null && resultBilling[0].billing_no !== null) {
              check_pass = true
            } else {
              check_pass = false
            }
            // console.log("%s    %s",check_pass_item,check_pass);
          }

          if (check_pass && check_pass_item) {
            var dataResult = {
              billingInfo: resultBilling,
              billingItem: resultBillingItem
            };
            bus.emit("set_json_format", dataResult);
          } else {
            bus.emit("update_status_to_null", billingNo);
          }
        }
        );
      }
    });
  });

  bus.on("set_json_format", msg => {
    // console.log("set_json_format", msg);
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
          ordershortnote: "",
          districtcode: data[j].DISTRICT_CODE,
          amphercode: data[j].AMPHUR_CODE,
          provincecode: data[j].PROVINCE_CODE,
          geoid: data[j].GEO_ID,
          geoname: data[j].GEO_NAME,
          sendername: data[j].sender_name,
          senderphone: data[j].sender_phone,
          senderaddr: sender_address
        },
        consignmentno: data[j].tracking
      };
      orderlist.push(dataDes);
    }
    // console.log("orderlist",orderlist);
    var dataAll = {
      apikey: "XbOiHrrpH8aQXObcWj69XAom1b0ac5eda2b",
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
    // console.log("data to send", dataAll);
    var dataLog = {
      status: "set JSON format",
      billingNo: data[0].billing_no
    };
    bus2.emit("save_to_log", dataLog);
    bus.emit("save_raw_data", dataAll);
    // bus2.emit("send_to_api", dataAll);
  });

  bus.on("save_raw_data", msg => {
    console.log("save_raw_data", msg.memberparcel.billingno);
    billingNo = msg.memberparcel.billingno;
    let sqlSaveJson = "UPDATE billing SET prepare_raw_data=? WHERE billing_no=?";
    let data = [JSON.stringify(msg), billingNo];
    connection.query(sqlSaveJson, data, function (err, result) { });
  });

  bus.on("update_status_to_null", msg => {
    console.log("save_raw_data", msg);
    billingNo = msg;
    let sqlUpdateStatus = "UPDATE billing SET status=? WHERE billing_no=?";
    let data = [null, billingNo];
    connection.query(sqlUpdateStatus, data, function (err, result) { });
  });
};
