const mqtt = require('mqtt');
const host = 'mqtt://192.168.10.58';
const topic = 'nodered/log';
				
var client = mqtt.connect(host);
var connected = false;

client.on('connect', function () {
    console.log('Mqtt connected to %s', host);
    connected = true;
}).on('error', function (err) {
    console.log('Mqtt logger error: %s', err);
    connected = false;
});

function send (msg) {
    if (!connected) {
        console.log('No connection to: %s, ignore message', host);
        return;
    }
    try {
        var json = JSON.stringify(msg);
        client.publish(topic, json);
    } catch (err) {
        console.log(err);
    }
}

module.exports = {
    "send": send
};
  