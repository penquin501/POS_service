const request = require("request");
const connection = require("../env/db");

module.exports = bus2 => {

  bus2.on("set_json_format", msg => {
    console.log("set_json_format", msg[0].billing_no);
    var data = msg;
    var orderlist = [];
    var paymentType = "";
    for (j = 0; j < data.length; j++) {
      if (data[j].bi_parcel_type == "NORMAL") {
        paymentType = "99";
      } else {
        paymentType = "60";
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
    };
    // console.log("data to send", dataAll);
    var dataLog = {
      status: "set JSON format",
      billingNo: data[0].billing_no
    };
    bus2.emit("save_to_log", dataLog);
    bus2.emit("save_raw_data", dataAll);
    bus2.emit("send_to_api", dataAll);
  });

  bus2.on("send_to_api", msg => {
    console.log("set_json_format", msg.memberparcel.billingno);
    request(
      {
        url:
          "https://www.945holding.com/webservice/restful/parcel/order_record/v11/data",
        method: "POST",
        body: msg,
        json: true,
        headers: {
          apikey: "XbOiHrrpH8aQXObcWj69XAom1b0ac5eda2b",
          "Content-Type": "application/json"
        }
      },
      (err, res, body) => {
        if (res) {
          var response = {
            billingNo: msg.memberparcel.billingno,
            dataResponse: res
          };
          bus2.emit("response_from_main", response);
        }
      }
    );
  });

  bus2.on("response_from_main", msg => {
    console.log("response_from_main",msg.billingNo);
    if (msg.dataResponse.body.checkpass == "pass" && msg.dataResponse.body.bill_no == "data_varidated_pass") {
      dataSuccess = {
        billingNo: msg.billingNo,
        dataResponse: msg.dataResponse.body
      };
      bus2.emit("response_success", dataSuccess);
    } else {
      dataError = {
        billingNo: msg.billingNo,
        dataResponse: msg.dataResponse
      };
      bus2.emit("response_error", dataError);
    } 
  });
  
  bus2.on("response_success", msg => {
    console.log("success",  msg.billingNo);
    billingNo = msg.billingNo;
    status = msg.dataResponse.checkpass;

    let updateBilling = "UPDATE billing SET status=? WHERE billing_no=?";
    let dataUpdateBilling = [status, billingNo];
    connection.query(updateBilling, dataUpdateBilling, function (err,dataBilling) { });

    listStatus = msg.dataResponse.status;
    for (i = 0; i < listStatus.length; i++) {
      var tracking = listStatus[i].consignmentno;
      var status = listStatus[i].status;

      let sql =
        "UPDATE billing_receiver_info SET status=?,sending_date=? WHERE tracking=?";
      var data = [status, new Date(), tracking];
      connection.query(sql, data, function (err, dataBillingItem) { });
    }

    var dataLog = {
      status: 'success',
      billingNo: msg.billingNo
    };
    bus2.emit("save_to_log", dataLog);
  });

  bus2.on("response_error", msg => {
    console.log("error", msg.billingNo);
    if (msg.dataResponse.resCode) {
      status=msg.dataResponse.resCode + "-" +msg.dataResponse.descriptionTH
    } else {
      status=msg.dataResponse.statusCode + "-" + msg.dataResponse.statusMessage
    }
    dataLog = {
      status: status,
      billingNo: msg.billingNo
    };
    bus2.emit("save_to_log", dataLog);
  });

  bus2.on("save_to_log", msg => {
    console.log("save_to_log", msg.status);
    billingNo = msg.billingNo;
    status = msg.status;

    let sqlLogSendData =
      "INSERT INTO log_send_data(billing_no,record_at, status) VALUES (?,?,?)";
    let data = [billingNo, new Date(), status];
    connection.query(sqlLogSendData, data, function (err, result) { });
  });

  bus2.on("save_raw_data", msg => {
    console.log("save_raw_data", msg.memberparcel.billingno);
    billingNo = msg.memberparcel.billingno;
    let sqlSaveJson =
      "INSERT INTO prepare_json(billing_no, raw_data) VALUES (?,?)";
    let data = [billingNo, JSON.stringify(msg)];
    connection.query(sqlSaveJson, data, function (err, result) { });
  });
}