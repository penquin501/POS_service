
const updateServices = require("../services/updateService.js");
const events = require('events');
const bus2 = new events.EventEmitter();

require('./format.js')(bus2);

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

    updateServices.updatePending(status, billingNo).then(function(data) {});
  });

  
};
