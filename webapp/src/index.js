const express = require("express");
const request = require("request");
var cron = require("node-cron");
const app = express();
const moment = require("moment");
var m = require("moment-timezone");
const events = require("events");

const port = process.env.PORT || 3200;
const bus = new events.EventEmitter();
const bus2 = new events.EventEmitter();

moment.locale("th");
app.use(express.json());

const connection = require("./env/db");
const billing_connection = require("./env/mainDB");

const updateServices = require("./services/updateService.js");
require("./events/pending.js")(bus);
require("./events/sendApi.js")(bus2);


//////////////////////////////////////////////send 1:1////////////////////////////////////////////////////////////////
app.get("/senddata", function(req, res) {
  // res.json({ 'hello': 'World' });
  var dataAuthen = {
    user_id: 783,
    branch_id: 47,
    mer_authen_level: "admin"
  };

  var dataBill = {
    billing_no: "47-1108-191225161234-276"
  };

  sendDataToMainServerTemp(dataAuthen, dataBill);
});

function sendDataToMainServerTemp(dataAuthen, dataBill) {
  var orderlist = [];
  var paymentType = "";

  updateServices.selectDataInBillNo(dataBill.billing_no).then(function(res) {
    // console.log(res.billingItem);
    check_pass=true;
    for(i=0;i<res.billingItem.length;i++){
      console.log(res.billingItem[i].receiver_name);
      if(res.billingItem[i].receiver_name === null){
        check_pass=false;
      }
      if(res.billingItem[i].phone === null){
        check_pass=false;
      }
    }
    console.log(check_pass);
  });
    
}
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//////////////////////////////////////////////start cron job/////////////////////////////////////////////////////
var t = 0;
let t_format = "HH:mm:ss.SSS";
// var sim_execute_time = 60000;
var execute_interval = 10 * 1000;
var hot_delay = 1000;
var task_number = 0;

setRawData = async t => {
  console.log("%s   Start execute setRawData", m().format(t_format));
  // console.log("%s     process about %ds", m().format(t_format), sim_execute_time);
  //---------------
  await updateServices.selectBillingNotSend().then(function(listBilling) {
    if (listBilling !== null) {
      for (i = 0; i < listBilling.length; i++) {
        value = {
          billingNo: listBilling[i].billing_no
        };
        bus.emit("set_pending", value);
      }
    }
  });

  //---------------
  // console.log("%s     process return", m().format(t_format));
  console.log("%s   End execute setRawData", m().format(t_format));
  // sim_execute_time += 500;
};

task1 = async () => {
  let start_time = new Date().getTime();

  //-------------- CODE -----------//
  await setRawData();
  //---------------

  let end_time = new Date().getTime();
  let actual_execute_time = end_time - start_time;
  // console.log("%s Actual Execute Time = %d",m().format(t_format),actual_execute_time);
  let delay_time = Math.max(execute_interval - actual_execute_time, hot_delay);
  // console.log("%s Delay Time = %d", m().format(t_format), delay_time);
  setTimeout(task1, delay_time);
};
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////
sendApi = async t => {
  console.log("%s   Start execute sendApi", m().format(t_format));
  // console.log("%s     process about %ds", m().format(t_format), sim_execute_time);
  //---------------
  await updateServices.prepareRawData().then(function(data) {
    if (data !== false) {
      value = {
        billingNo: data[0].billing_no,
        rawData: data[0].prepare_raw_data
      };
      bus2.emit("update_status_to_waiting", value);
    }
  });

  //---------------
  console.log("%s     process return", m().format(t_format));
  console.log("%s   End execute sendApi", m().format(t_format));
  // sim_execute_time += 500;
};

task2 = async () => {
  let start_time = new Date().getTime();

  //-------------- CODE -----------//
  await sendApi();
  //---------------

  let end_time = new Date().getTime();
  let actual_execute_time = end_time - start_time;
  console.log("%s Actual Execute Time = %d",m().format(t_format),actual_execute_time);
  let delay_time = Math.max(execute_interval - actual_execute_time, hot_delay);
  console.log("%s Delay Time = %d", m().format(t_format), delay_time);
  setTimeout(task2, delay_time);
};
main = async () => {
  task1();
  task2();
};

main();

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////

app.listen(port, () => console.log(`Example app listening on port ${port}!`));
