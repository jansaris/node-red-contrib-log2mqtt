const connector = require("./connector");
const mqtt = require("./mqtt");
const extend = require("extend");

// these function will contain the reference to some RED functions
let eachNode, getNode;

function generateMessage(node, msg, action) {

  var message = extend(true, {}, msg);
  delete message._msgid;

  message.id = msg._msgid;
  message.action = action;
  message.node = node.id;
  message.nodeType = node.type;
  message.nodeName = node.name;
  message.flow = node.z;

  return message;
}

function handleMessage(node, msg, action) {
  //TODO: Filter the messages
  var message = generateMessage(node, msg, action);
  mqtt.send(message);
}

/**
 * Update all nodes in the flows, modifying the metric function in order
 * to control the "send" and "receive" events
 */
function updateNodes() {
  console.log("Updating nodes after a flows deployment...");
  let counter=0;
  eachNode((node) => {
    const node_object = getNode(node.id) || {on: function(){}, metric: function(){}};
    node_object.source_metric = node_object.metric;
    node_object.metric = function(eventname, msg, metricValue) {
      if (eventname && (eventname === "receive" || eventname === "send")) {
        handleMessage(node_object, msg, eventname);
      }
      node_object.source_metric(eventname, msg, metricValue);
    };
    counter++;
  });
  console.log(`${counter} nodes updated after the flows deployment`);
}

// connects the function we want to execute when a deployment is done
connector.initDeployFunction(updateNodes);

module.exports = function(RED) {
  // save the reference to some RED functions
  eachNode = RED.nodes.eachNode;
  getNode = RED.nodes.getNode;
}
