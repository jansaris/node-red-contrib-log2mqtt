const connector = require("./connector");
const mqtt = require("./mqtt");
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
  message.node.flow = node.flow;
  message.data = data;

  return message;
}

function handleMessage(node, msg, action) {
  var message = generateMessage(node, msg, action);
  mqtt.send(message);
}

function log(message, deployed){
  console.log(message);
  var obj = { id: 'Deploy', message };
  if(deployed) obj.deployed = true;
  mqtt.send(obj);
}

/**
 * Update all nodes in the flows, modifying the metric function in order
 * to control the "send" and "receive" events
 */
function updateNodes() {
  log("Updating nodes after a flows deployment...");
  let flows = {};
  let counter=0;
  eachNode((node) => {
    const node_object = getNode(node.id) || {on: function(){}, metric: function(){}};
    if(node.type === 'tab') {
      flows[node.id] = node.label;
      if(!flows[node.id]) flows[node.id] = `No label (${node.id})`;
      let enabled = node.disabled ? 'disabled' : 'enabled';
      log(`Found flow '${flows[node.id]}' which is ${enabled}`);
      return;
    }

    let node_name = node_object.name || "";
    if(node_name.indexOf("(no log)") !== -1) { 
      log(`Ignore node '${node_object.name}'`);
      return; 
    }

    let onReceive = node_name.indexOf("(log receive)") !== -1;
    let onSend = node_name.indexOf("(log send)") !== -1;
    if(onReceive || onSend) {
      log(`Only add logging to '${node_object.name}' on receive '${onReceive}' or send '${onSend}'`);

      node_name = node_name.replace("(log send)", "");
      node_name = node_name.replace("(log receive)", "");
      log(`Change node name from '${node_object.name}' to '${node_name}'`);
      node_object.name = node_name;
    }
    if(!(onReceive || onSend)){
      //Both statements were not found, that means we add logging.
      //So put both on true
      onReceive = true;
      onSend = true;
    }

    node_object.flow = flows[node_object.z];
    node_object.source_metric = node_object.metric;
    node_object.metric = function(eventname, msg, metricValue) {
      if(onReceive && eventname === "receive") handleMessage(node_object, msg, eventname);
      if(onSend && eventname === "send") handleMessage(node_object, msg, eventname);
      node_object.source_metric(eventname, msg, metricValue);
    };
    counter++;
  });
  log(`${counter} nodes updated after the flows deployment`, true);
}

// connects the function we want to execute when a deployment is done
connector.initDeployFunction(updateNodes);

module.exports = function(RED) {
  // save the reference to some RED functions
  eachNode = RED.nodes.eachNode;
  getNode = RED.nodes.getNode;
}
