const request = require("request");
const connection = require("../env/db");

module.exports = bus2 => {
  bus2.on("update_status_to_waiting", msg => {
    var dataLog = {
      status: "waiting",
      billingNo: msg.billingNo
    };
    bus2.emit("save_to_log", dataLog);

    let updateBilling = "UPDATE billing SET status=? WHERE billing_no=?";
    let data = ["waiting", msg.billingNo];
    connection.query(updateBilling, data, function (err, dataBilling) {
      value = {
        billingNo: msg.billingNo,
        rawData: msg.rawData
      };
      bus2.emit("send_to_api", value);
    });
  });

  bus2.on("send_to_api", msg => {
    console.log("send_to_api", msg.billingNo)
    var dataLog = {
      status: "send to api",
      billingNo: msg.billingNo
    };
    bus2.emit("save_to_log", dataLog);

    request(
      {
        url: "https://dev.945holding.com/webservice/restful/parcel/order_record/v11/json_data",
        method: "POST",
        body: msg.rawData,
        // json: true,
        headers: {
          apikey: "XbOiHrrpH8aQXObcWj69XAom1b0ac5eda2b",
          "Content-Type": "application/json"
        }
      },
      (err, res, body) => {
        console.log("%d -----  %s", res.statusCode, res.statusMessage);
        if (res.statusCode == 200) {
          var data = {
            result: res.body,
            billingNo: msg.billingNo
          };
          bus2.emit("response_success", data);
        } else {
          var data = {
            result: res,
            billingNo: msg.billingNo
          };
          bus2.emit("response_error", data);
        }
      }
    );
  });

  bus2.on("response_success", msg => {
    console.log("success", msg.billingNo);
    billingNo = msg.billingNo;
    statusResult = JSON.parse(msg.result);
    if (statusResult.checkpass == "pass") {
      let sqlSelectTracking = "SELECT tracking FROM billing_item WHERE billing_no=?";
      let dataBilling = [billingNo];
      connection.query(sqlSelectTracking, dataBilling, function (err, listTracking) {
        bus2.emit("update_status_item", { listTracking: listTracking });
      });
      status = statusResult.checkpass;
    } else {
      status = statusResult.checkpass + "-" + statusResult.reason;
    }
    let updateBilling = "UPDATE billing SET status=?,sending_date=? WHERE billing_no=?";
    let dataUpdateBilling = [status, new Date(), billingNo];
    connection.query(updateBilling, dataUpdateBilling, function (err, dataBilling) { });

    var dataLog = {
      status: status,
      billingNo: msg.billingNo
    };
    bus2.emit("save_to_log", dataLog);
  });

  bus2.on("update_status_item", msg => {
    listStatus = msg.listTracking;
    for (i = 0; i < listStatus.length; i++) {
      var tracking = listStatus[i].tracking;
      var status = "success";

      let sql =
        "UPDATE billing_receiver_info SET status=?,sending_date=? WHERE tracking=?";
      var data = [status, new Date(), tracking];
      connection.query(sql, data, function (err, dataBillingItem) { });
    }
  });

  bus2.on("response_error", msg => {
    console.log("error", msg.billingNo);
    if (msg.result.body) {
      desStatus = JSON.parse(msg.result.body);
      strResCode = JSON.stringify(desStatus.resCode);
      strDescriptionTH = JSON.stringify(desStatus.descriptionTH);
      status = strResCode + "-" + strDescriptionTH;
    } else {
      status = msg.result.statusCode + "-" + msg.result.statusMessage;
    }
    let updateBilling = "UPDATE billing SET status=? WHERE billing_no=?";
    let dataUpdateBilling = [status, msg.billingNo];
    connection.query(updateBilling, dataUpdateBilling, function (err, dataBilling) { });

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
};
