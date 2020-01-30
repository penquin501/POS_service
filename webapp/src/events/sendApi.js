const request = require("request");
const connection = require("../env/db");
// const events = require("events");

// const busPending = new events.EventEmitter();
// require("./pending.js")(busPending);

module.exports = busSendApi => {

  busSendApi.on("update_status_to_waiting", msg => {
    console.log("update_status_to_waiting",msg.billingNo);
    
    busSendApi.emit("update_last_process",{state:"waiting"});

    var dataLog = {
      status: "waiting",
      billingNo: msg.billingNo
    };
    busSendApi.emit("save_to_log", dataLog);

    let updateBilling = "UPDATE billing_test SET status=? WHERE billing_no=?";
    let data = ["waiting", msg.billingNo];
    connection.query(updateBilling, data, function(err, dataBilling) {
      value = {
        billingNo: msg.billingNo,
        rawData: msg.rawData
      };
      busSendApi.emit("send_to_api", value);
    });
  });

  busSendApi.on("send_to_api", msg => {
    console.log("send_to_api", msg.billingNo);

    busSendApi.emit("update_last_process",{state:"send api to 945"});

    var dataLog = {
      status: "send to api",
      billingNo: msg.billingNo
    };
    busSendApi.emit("save_to_log", dataLog);

    // request(
    //   {
    //     url:
    //       "https://www.945holding.com/webservice/restful/parcel/order_record/v11/json_data",
    //     method: "POST",
    //     body: msg.rawData,
    //     // json: true,
    //     headers: {
    //       apikey: "XbOiHrrpH8aQXObcWj69XAom1b0ac5eda2b",
    //       "Content-Type": "application/json"
    //     }
    //   },
    //   (err, res, body) => {
    //     console.log("%d -----  %s", res.statusCode, res.statusMessage);
    //     if (err === null) {
    //       if (res.statusCode == 200) {
    //         var data = {
    //           result: res.body,
    //           billingNo: msg.billingNo
    //         };
    //         busSendApi.emit("response_success", data);
    //       } else {
    //         var data = {
    //           result: res,
    //           billingNo: msg.billingNo
    //         };
    //         busSendApi.emit("response_error", data);
    //       }
    //     } else {
    //       var data = {
    //         result: err.code,
    //         billingNo: msg.billingNo
    //       };
    //       busSendApi.emit("response_error_code", data);
    //     }
    //   }
    // );
  });

  busSendApi.on("response_success", msg => {
    console.log("success", msg.billingNo);
    busSendApi.emit("update_last_process",{state:"response success"});

    billingNo = msg.billingNo;
    statusResult = JSON.parse(msg.result);
    if (statusResult.checkpass == "pass") {
      let sqlSelectTracking = "SELECT tracking FROM billing_item_test WHERE billing_no=?";
      let dataBilling = [billingNo];
      connection.query(sqlSelectTracking, dataBilling, function( err, listTracking) {
        busSendApi.emit("update_status_item", { listTracking: listTracking });
      });
      status = statusResult.checkpass;
    } else {
      status = statusResult.checkpass + "-" + statusResult.reason;
    }
    let updateBilling =
      "UPDATE billing_test SET status=?,sending_date=? WHERE billing_no=?";
    let dataUpdateBilling = [status, new Date(), billingNo];
    connection.query(updateBilling, dataUpdateBilling, function(err,dataBilling) {});

    var dataLog = {
      status: status,
      billingNo: msg.billingNo
    };
    busSendApi.emit("save_to_log", dataLog);
  });

  busSendApi.on("update_status_item", msg => {
    busSendApi.emit("update_last_process",{state:"update status item"});
    listStatus = msg.listTracking;
    for (i = 0; i < listStatus.length; i++) {
      var tracking = listStatus[i].tracking;
      var status = "success";

      let sql =
        "UPDATE billing_receiver_info_test SET status=?,sending_date=? WHERE tracking=?";
      var data = [status, new Date(), tracking];
      connection.query(sql, data, function(err, dataBillingItem) {});
    }
  });

  busSendApi.on("response_error_code", msg => {
    busSendApi.emit("update_last_process",{state:"error code"});

    let updateBilling = "UPDATE billing_test SET status=? WHERE billing_no=?";
    let dataUpdateBilling = [msg.result, msg.billingNo];
    connection.query(updateBilling, dataUpdateBilling, function(err,dataBilling) {});
  });
  
  busSendApi.on("response_error", msg => {
    console.log("error", msg.billingNo);
    busSendApi.emit("update_last_process",{state:"error"});

    if (msg.result.body) {
      desStatus = JSON.parse(msg.result.body);
      // strResCode = JSON.stringify(desStatus.resCode);
      // strDescriptionTH = JSON.stringify(desStatus.descriptionTH);
      strCheckpass=desStatus.checkpass;
      strReason=desStatus.reason;
      status = strCheckpass + "-" + strReason;
    } else {
      status = msg.result.statusCode + "-" + msg.result.statusMessage;
    }
    let updateBilling = "UPDATE billing_test SET status=? WHERE billing_no=?";
    let dataUpdateBilling = [status, msg.billingNo];
    connection.query(updateBilling, dataUpdateBilling, function (err, dataBilling) { });

    dataLog = {
      status: status,
      billingNo: msg.billingNo
    };

    busSendApi.emit("save_to_log", dataLog);
  });

  busSendApi.on("save_to_log", msg => {
    console.log("save_to_log", msg.status);
    billingNo = msg.billingNo;
    status = msg.status;

    let sqlLogSendData =
      "INSERT INTO log_send_data(billing_no,record_at, status) VALUES (?,?,?)";
    let data = [billingNo, new Date(), status];
    connection.query(sqlLogSendData, data, function(err, result) {});
  });

  busSendApi.on("update_last_process", msg => {
    console.log("update_last_process", msg.state);
    
    let ts=+new Date();

    let updateProcess = "UPDATE log_process_data_lastest SET state=?,ts=? WHERE id=1";
    let data = [msg.state, parseInt(ts)];
    connection.query(updateProcess, data, function(err, result) {});
  });
};
