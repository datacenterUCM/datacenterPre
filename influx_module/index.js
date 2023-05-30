const { ConfigParams } = require("./ConfigParams");
const { MqttModule } = require("./Mqtt");
const { LogicImpl } = require("./LogicImpl");

logicImpl = new LogicImpl()

mqtt = new MqttModule( logicImpl )

