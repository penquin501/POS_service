
const connection = require("../env/db");
const events = require('events');
const bus2 = new events.EventEmitter();

require('./sendApi.js')(bus2);

module.exports = bus => {
  bus.on("verify", msg => {
    console.log("verify", msg);
    billingNo = msg;

    let sqlquery =
      "SELECT b.user_id,b.mer_authen_level,b.member_code,b.carrier_id,b.billing_no,b.branch_id,b.total,b.img_url," +
      "bItem.tracking,bItem.size_id,bItem.size_price,bItem.parcel_type as bi_parcel_type,bItem.zipcode as bi_zipcode,bItem.cod_value," +
      "br.sender_name,br.sender_phone,br.sender_address,br.receiver_name,br.phone,br.receiver_address,d.DISTRICT_CODE," +
      "br.district_name,a.AMPHUR_CODE,br.amphur_name,p.PROVINCE_CODE,br.province_name,br.zipcode as br_zipcode,br.parcel_type as br_parcel_type,br.remark," +
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
      "WHERE bItem.billing_no=?";
    let dataBill = [billingNo];

    connection.query(sqlquery, dataBill, function(err, data) {
      var check_pass;
      for (i = 0; i < data.length; i++) {
        if (
          !data[i].user_id ||
          !data[i].mer_authen_level ||
          !data[i].member_code ||
          !data[i].carrier_id ||
          !data[i].branch_id ||
          !data[i].img_url ||
          !data[i].bi_parcel_type ||
          !data[i].size_price ||
          !data[i].receiver_name ||
          !data[i].phone ||
          !data[i].receiver_address ||
          !data[i].DISTRICT_CODE ||
          !data[i].AMPHUR_CODE ||
          !data[i].PROVINCE_CODE ||
          !data[i].br_zipcode ||
          !data[i].product_id ||
          !data[i].product_name ||
          !data[i].GEO_ID ||
          !data[i].tracking
        ) {
          check_pass = false;
        } else if (
          data[i].bi_parcel_type != data[i].br_parcel_type ||
          data[i].bi_zipcode != data[i].br_zipcode
        ) {
          check_pass = false;
        } else {
          check_pass = true;
        }
      }
      if (check_pass) {
        bus.emit("set_json_format", data);
      }
    });
    var dataLog = {
      status: "verify",
      billingNo: billingNo
    };
    bus2.emit("save_to_log", dataLog);
  });

  bus.on("set_json_format", msg => {
    // console.log("set_json_format", msg);
    var data = msg;
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
    var dataAll = {
      apikey: "XbOiHrrpH8aQXObcWj69XAom1b0ac5eda2b",
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
    let sqlSaveJson =
      "UPDATE billing SET prepare_raw_data=? WHERE billing_no=?";
    let data = [JSON.stringify(msg),billingNo];
    connection.query(sqlSaveJson, data, function (err, result) { });
  });
};
