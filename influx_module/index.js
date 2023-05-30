const { ConfigParams } = require("./ConfigParams");
const { MqttModule } = require("./Mqtt");
const { LogicImpl } = require("./LogicImpl");

console.log("iniciando...")

logicImpl = new LogicImpl()

mqtt = new MqttModule( logicImpl )

