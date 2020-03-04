require('dotenv').config()
const express = require("express");
const request = require("request");
const app = express();
const moment = require("moment");
var m = require("moment-timezone");
const events = require("events");

const port = process.env.PORT || 3500;
const bus = new events.EventEmitter();
const bus2 = new events.EventEmitter();

moment.locale("th");
app.use(express.json());

const connection = require("./env/db");

const updateServices = require("./services/updateService.js");
require("./events/pending.js")(bus);
require("./events/sendApi.js")(bus2);

if (process.env.NODE_ENV === 'production') {
  console.log('In production mode');
} else {
  console.log('In development mode');
}

//////////////////////////////////////////////send 1:1////////////////////////////////////////////////////////////////
app.get("/senddata", function(req, res) {
  // res.json({ 'hello': 'World' });
  var dataAuthen = {
    user_id: 1108,
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
      console.log(res.billingItem[i].remark);

      if(res.billingItem[i].phone === null){
        check_pass=false;
      }
      // console.log("ordershortnote %d %s",i,ordershortnote);
    }
    console.log("ordershortnote",ordershortnote);
  });
    
}
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//////////////////////////////////////////////start cron job/////////////////////////////////////////////////////
var t = 0;
let t_format = "HH:mm:ss.SSS";
var execute_interval = 10 * 1000;
var hot_delay = 1000;
var task_number = 0;

setRawData = async t => {
  console.log("%s   Start execute setRawData", m().format(t_format));
  //---------------
  await updateServices.selectBillingNotSend().then(function(listBilling) {
    bus2.emit("update_last_process",{state:"set_raw_data"});
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
  console.log("%s   End execute setRawData", m().format(t_format));
};

q_prepare_data = async () => {
  let start_time = new Date().getTime();

  //-------------- CODE -----------//
  await setRawData();
  //---------------

  let end_time = new Date().getTime();
  let actual_execute_time = end_time - start_time;
  // console.log("%s Actual Execute Time = %d",m().format(t_format),actual_execute_time);
  let delay_time = Math.max(execute_interval - actual_execute_time, hot_delay);
  // console.log("%s Delay Time = %d", m().format(t_format), delay_time);
  setTimeout(q_prepare_data, delay_time);
};
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////
sendApi = async t => {
  console.log("%s   Start execute sendApi", m().format(t_format));
  //---------------
  await updateServices.prepareRawData().then(function(data) {
    bus2.emit("update_last_process",{state:"prepare_send_api"});
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
};

q_send_api = async () => {
  let start_time = new Date().getTime();

  //-------------- CODE -----------//
  await sendApi();
  //---------------

  let end_time = new Date().getTime();
  let actual_execute_time = end_time - start_time;
  console.log("%s Actual Execute Time = %d",m().format(t_format),actual_execute_time);
  let delay_time = Math.max(execute_interval - actual_execute_time, hot_delay);
  console.log("%s Delay Time = %d", m().format(t_format), delay_time);
  setTimeout(q_send_api, delay_time);
};
main = async () => {
  q_prepare_data();
  q_send_api();
};

main();

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////

app.listen(port, () => console.log(`Example app listening on port ${port}!`));
