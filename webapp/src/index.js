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
    billing_no: "47-783-191221154344-796"
  };

  sendDataToMainServerTemp(dataAuthen, dataBill);
});

function sendDataToMainServerTemp(dataAuthen, dataBill) {
  var orderlist = [];
  var paymentType = "";

  updateServices.selectDataInBillNo(dataBill.billing_no).then(function(res) {
    var data = res.billingItem;
    // console.log(data[0]);
    for (i = 0; i < data.length; i++) {
      // "paymenttype": "99",99=normal,60=cod
      if (data[i].bi_parcel_type.toUpperCase() == "NORMAL") {
        paymentType = "99";
      } else {
        paymentType = "60";
      }
      dataDes = {
        productinfo: {
          globalproductid: data[i].product_id,
          productname: data[i].product_name,
          methodtype: data[i].bi_parcel_type.toUpperCase(),
          paymenttype: paymentType,
          price: data[i].size_price.toString(),
          codvalue: data[i].cod_value.toString()
        },
        destinationinfo: {
          custname: data[i].receiver_name,
          custphone: data[i].phone,
          custzipcode: data[i].br_zipcode,
          custaddr: data[i].receiver_address,
          //   "custdistrict": data[i].district_name,
          //   "custamphur": data[i].amphur_name,
          //   "custprovince": data[i].province_name,
          ordershortnote: data[i].remark,
          districtcode: data[i].DISTRICT_CODE,
          amphercode: data[i].AMPHUR_CODE,
          provincecode: data[i].PROVINCE_CODE,
          geoid: data[i].GEO_ID,
          geoname: data[i].GEO_NAME,
          sendername: data[i].sender_name,
          senderphone: data[i].sender_phone,
          senderaddr: data[i].sender_address
        },
        consignmentno: data[i].tracking
      };
      orderlist.push(dataDes);
    }

    var dataAll = {
      authen: {
        merid: res.billingInfo[0].branch_id,
        userid: res.billingInfo[0].user_id,
        merauthenlevel: res.billingInfo[0].mer_authen_level
      },
      memberparcel: {
        memberinfo: {
          memberid: res.billingInfo[0].member_code,
          courierpid: res.billingInfo[0].carrier_id,
          courierimage: res.billingInfo[0].img_url
        },
        billingno: res.billingInfo[0].billing_no,
        orderlist: orderlist
      }
    };
    // console.log("dataAll", JSON.stringify(dataAll));
    request(
      {
        url:
          "https://www.945holding.com/webservice/restful/parcel/order_record/v11/data",
        method: "POST",
        body: dataAll,
        json: true,
        headers: {
          apikey: "XbOiHrrpH8aQXObcWj69XAom1b0ac5eda2b",
          "Content-Type": "application/json"
        }
      },
      (err, res2, body) => {
        console.log(res2);
        if (
          res.body.checkpass == "pass" &&
          res.body.bill_no == "data_varidated_pass"
        ) {
          updateServices
            .updateStatusBilling(dataBill.billing_no, res.body.checkpass)
            .then(function(data) {});
          listStatus = res.body.status;
          for (i = 0; i < listStatus.length; i++) {
            var tracking = listStatus[i].consignmentno;
            var status = listStatus[i].status;
            updateServices
              .updateStatusReceiverInfo(tracking, status)
              .then(function(data) {});
          }
        }
      }
    );
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
  console.log("%s     process return", m().format(t_format));
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
  console.log("%s Actual Execute Time = %d",m().format(t_format),actual_execute_time);
  let delay_time = Math.max(execute_interval - actual_execute_time, hot_delay);
  console.log("%s Delay Time = %d", m().format(t_format), delay_time);
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
  // task2();
};

main();

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////

app.listen(port, () => console.log(`Example app listening on port ${port}!`));
