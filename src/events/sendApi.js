const request = require("request");
const connection = require("../env/db");

module.exports = bus => {
  bus.on("update_status_to_waiting", msg => {
    console.log("update_status_to_waiting", msg.billingNo);

    bus.emit("update_last_process", { state: "waiting" });

    var dataLog = {
      status: "waiting",
      billingNo: msg.billingNo
    };
    bus.emit("save_to_log", dataLog);

    let updateBilling = "UPDATE billing SET status=? WHERE billing_no=?";
    let data = ["waiting", msg.billingNo];
    connection.query(updateBilling, data, function(err, dataBilling) {
      value = {
        billingNo: msg.billingNo,
        rawData: msg.rawData
      };
      bus.emit("send_to_api", value);
    });
  });

  bus.on("send_to_api", msg => {
    console.log("send_to_api", msg.billingNo);

    bus.emit("update_last_process", { state: "send_api_to_945" });

    var dataLog = {
      status: "send to api",
      billingNo: msg.billingNo
    };
    bus.emit("save_to_log", dataLog);

    request(
      {
        url: process.env.W945_BILLING_API,
        method: "POST",
        body: msg.rawData,
        // json: true,
        headers: {
          apikey: process.env.W945_APIKEY,
          "Content-Type": "application/json"
        }
      },
      (err, res, body) => {
        console.log("%d -----  %s", res.statusCode, res.statusMessage);
        if (err === null) {
          if (res.statusCode == 200) {
            var data = {
              result: res.body,
              billingNo: msg.billingNo
            };
            bus.emit("response_success", data);
          } else {
            var data = {
              result: res,
              billingNo: msg.billingNo
            };
            bus.emit("response_error", data);
          }
        } else {
          var data = {
            result: err.code,
            billingNo: msg.billingNo
          };
          bus.emit("response_error_code", data);
        }
      }
    );
  });

  bus.on("response_success", msg => {
    console.log("success", msg.billingNo);
    bus.emit("update_last_process", { state: "response_success" });

    billingNo = msg.billingNo;
    statusResult = JSON.parse(msg.result);
    if (statusResult.checkpass == "pass") {
      let sqlSelectTracking =
        "SELECT tracking FROM billing_item WHERE billing_no=?";
      let dataBilling = [billingNo];
      connection.query(sqlSelectTracking, dataBilling, function(
        err,
        listTracking
      ) {
        bus.emit("update_status_item", { listTracking: listTracking });
      });
      status = statusResult.checkpass;
    } else {
      status = statusResult.checkpass + "-" + statusResult.reason;
    }
    let updateBilling =
      "UPDATE billing SET status=?,sending_date=? WHERE billing_no=?";
    let dataUpdateBilling = [status, new Date(), billingNo];
    connection.query(updateBilling, dataUpdateBilling, function(
      err,
      dataBilling
    ) {});

    var dataLog = {
      status: status,
      billingNo: msg.billingNo
    };
    bus.emit("save_to_log", dataLog);
  });

  bus.on("update_status_item", msg => {
    bus.emit("update_last_process", { state: "update status item" });
    listStatus = msg.listTracking;
    for (i = 0; i < listStatus.length; i++) {
      var tracking = listStatus[i].tracking;
      var status = "success";

      let sql =
        "UPDATE billing_receiver_info SET status=?,sending_date=? WHERE tracking=?";
      var data = [status, new Date(), tracking];
      connection.query(sql, data, function(err, dataBillingItem) {});
    }
  });

  bus.on("response_error_code", msg => {
    bus.emit("update_last_process", { state: "response_error_code" });

    let updateBilling = "UPDATE billing SET status=? WHERE billing_no=?";
    let dataUpdateBilling = [msg.result, msg.billingNo];
    connection.query(updateBilling, dataUpdateBilling, function(
      err,
      dataBilling
    ) {});
  });

  bus.on("response_error", msg => {
    console.log("error", msg.billingNo);
    bus.emit("update_last_process", { state: "response_error" });

    if (msg.result.body) {
      desStatus = JSON.parse(msg.result.body);
      // strResCode = JSON.stringify(desStatus.resCode);
      // strDescriptionTH = JSON.stringify(desStatus.descriptionTH);
      strCheckpass = desStatus.checkpass;
      strReason = desStatus.reason;
      status = strCheckpass + "-" + strReason;
    } else {
      status = msg.result.statusCode + "-" + msg.result.statusMessage;
    }
    let updateBilling = "UPDATE billing SET status=? WHERE billing_no=?";
    let dataUpdateBilling = [status, msg.billingNo];
    connection.query(updateBilling, dataUpdateBilling, function(
      err,
      dataBilling
    ) {});

    dataLog = {
      status: status,
      billingNo: msg.billingNo
    };

    bus.emit("save_to_log", dataLog);
  });

  bus.on("save_to_log", msg => {
    console.log("save_to_log", msg.status);
    billingNo = msg.billingNo;
    status = msg.status;

    let sqlLogSendData =
      "INSERT INTO log_send_data(billing_no,record_at, status) VALUES (?,?,?)";
    let data = [billingNo, new Date(), status];
    connection.query(sqlLogSendData, data, function(err, result) {});
  });

  bus.on("update_last_process", msg => {
    console.log("update_last_process", msg.state);

    let ts = +new Date();

    let updateProcess =
      "UPDATE log_process_data_lastest SET state=?,ts=? WHERE id=1";
    let data = [msg.state, parseInt(ts)];
    connection.query(updateProcess, data, function(err, result) {});
  });
};
