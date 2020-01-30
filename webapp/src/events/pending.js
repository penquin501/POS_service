const updateServices = require("../services/updateService.js");
// const events = require('events');
// const busSendApi = new events.EventEmitter();

// require('./sendApi.js')(busSendApi);

module.exports = bus => {
  bus.on("set_pending", msg => {
    console.log("set pending", msg.billingNo);
    billingNo = msg.billingNo;
    status = "pending";

    var dataLog = {
      status: status,
      billingNo: billingNo
    };
    // busSendApi.emit("save_to_log", dataLog);
    // busSendApi.emit("update_last_process",{state:status});
    bus.emit("save_to_log", dataLog);
    bus.emit("update_last_process", { state: status });
    bus.emit("updatePending", { status: status, billingNo: billingNo })
    // updateServices.updatePending({ status: status, billingNo: billingNo });
  });
};
