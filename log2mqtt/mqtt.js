//TODO: Fix dependency on mqtt
const mqtt = require('mqtt');
const configuration = require('./configuration');
				
var client = mqtt.connect(configuration.mqttHost);
var connected = false;

client.on('connect', function () {
    console.log('Mqtt connected to %s', configuration.mqttHost);
    connected = true;
}).on('error', function (err) {
    console.log('Mqtt logger error: %s', err);
    connected = false;
});

function send (msg) {
    if (!connected) {
        console.log('No connection to: %s, ignore message', configuration.mqttHost);
        return;
    }
    try {
        var json = JSON.stringify(msg);
        client.publish(configuration.mqttTopic, json);
    } catch (err) {
        console.log(err);
    }
}

module.exports = {
    "send": send
};
  