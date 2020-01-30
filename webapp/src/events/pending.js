const updateServices = require("../services/updateService.js");
const connection = require("../env/db");
const events = require('events');
const bus2 = new events.EventEmitter();
const bus3 = new events.EventEmitter();

require('./sendApi.js')(bus2);
require('./verify.js')(bus3);

module.exports = bus => {
  bus.on("set_pending", msg => {
    console.log("set pending", msg.billingNo);
    billingNo = msg.billingNo;
    status = "pending";

    var dataLog = {
      status: status,
      billingNo: billingNo
    };
    bus2.emit("save_to_log", dataLog);
    bus2.emit("update_last_process", { state: status });
    bus.emit("update_pending", { status: status, billingNo: billingNo })
  });

  bus.on("update_pending", msg => {
    console.log("update_pending",msg.billingNo);
    let updateBilling = "UPDATE billing_test SET status=? WHERE billing_no=?";
    let data = [msg.status, msg.billingNo];
    connection.query(updateBilling, data, (err, results) => {
      bus3.emit("verify", msg.billingNo);
    });
  });
};
