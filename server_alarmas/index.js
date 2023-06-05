///////////////////////////////////////////////////////////////////////////////
//CONTROLLER
///////////////////////////////////////////////////////////////////////////////

const { ConfigParams } = require("./ConfigParams");
const { Controller } = require("./Controller");
const { MqttModule } = require("./Mqtt");
const { LogicImpl } = require("./LogicImpl");

//Se cargan los parámtros de configuración
configParams = new ConfigParams();

logicImpl = new LogicImpl();

mqtt = new MqttModule(configParams.brokerIP, logicImpl);

//Se instancia el controlador y se inicia
controller = new Controller( configParams.channelId, configParams.botToken, logicImpl , mqtt);

controller.initController();