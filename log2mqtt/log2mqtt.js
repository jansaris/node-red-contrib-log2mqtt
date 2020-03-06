const connector = require("./connector");
const mqtt = require("./mqtt");
const configuration = require("./configuration");
const extend = require("extend");

// these function will contain the reference to some RED functions
let eachNode, getNode;

//TODO: Create interface for message, so we can use it in the reader
function generateMessage(node, msg, action) {

  var data = extend(true, {}, msg);
  delete data._msgid;

  var message = {};
  message.id = msg._msgid;
  message.action = action;
  message.node = {};
  message.node.id = node.id;
  message.node.type = node.type;
  message.node.name = node.name;
  message.node.flow = node.z;
  message.data = data;

  return message;
}

//TODO: Move filter method to updateNodes
function filterOut(node) {
  let filters = configuration.filters;
  if(filters.id && filters.id.indexOf(node.id) !== -1) return true;
  if(filters.type && filters.type.indexOf(node.type) !== -1) return true;
  if(node.name && filters.name && filters.name.indexOf(node.name) !== -1) return true;
  return false;
}

function handleMessage(node, msg, action) {
  if(filterOut(node)) {
    console.info("Filtered: %s", msg._msgid);
    return;
  }
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
