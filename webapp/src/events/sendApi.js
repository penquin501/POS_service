const request = require("request");
const connection = require("../env/db");

module.exports = bus2 => {

  bus2.on("send_to_api", msg => {
    console.log("send_to_api", msg.billingNo);
    request(
      {
        url:
          "https://dev.945holding.com/webservice/restful/parcel/order_record/v11/json_data",
        method: "POST",
        body: msg.rawData,
        // json: true,
        headers: {
          apikey: "XbOiHrrpH8aQXObcWj69XAom1b0ac5eda2b",
          "Content-Type": "application/json"
        }
      },
      (err, res, body) => {
        if (res) {
          var response = {
            billingNo: msg.billingNo,
            dataResponse: res
          };
          bus2.emit("response_from_main", response);
        }
      }
    );
  });

  bus2.on("response_from_main", msg => {
    console.log("response_from_main",msg.dataResponse);
    // if (msg.dataResponse.body.checkpass == "pass" && msg.dataResponse.body.bill_no == "data_varidated_pass") {
    //   dataSuccess = {
    //     billingNo: msg.billingNo,
    //     dataResponse: msg.dataResponse.body
    //   };
    //   bus2.emit("response_success", dataSuccess);
    // } else {
    //   dataError = {   
    //     billingNo: msg.billingNo,
    //     dataResponse: msg.dataResponse
    //   };
    //   bus2.emit("response_error", dataError);
    // } 
  });
  
  bus2.on("response_success", msg => {
    console.log("success",  msg);
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
    console.log("error", msg.dataResponse.body);
    
    if (msg.dataResponse.body.resCode) {
      status=msg.dataResponse.body.resCode + "-" +msg.dataResponse.body.descriptionTH
    } else {
      status=msg.dataResponse.statusCode + "-" + msg.dataResponse.statusMessage
    }
    dataLog = {
      status: status,
      billingNo: msg.billingNo
    };

    let updateBilling = "UPDATE billing SET status=? WHERE billing_no=?";
    let dataUpdateBilling = [status, msg.billingNo];
    connection.query(updateBilling, dataUpdateBilling, function (err,dataBilling) { });

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
}