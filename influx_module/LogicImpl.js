const { InfluxModule } = require("./InfluxModule");
const { ConfigParams } = require("./ConfigParams");


class LogicImpl {

    constructor() {

        this.configParams = new ConfigParams()
        this.influx = new InfluxModule()

    }

    // Función que se ejecuta cuando llega un mensaje vía mqtt
    checkMsg(message, topic) {

        const messageJson = JSON.parse(message);
        console.log(this.configParams.TAG + " Mensaje recibido en el tópico " + topic);

        const node = messageJson["node"];

        // La localización del nodo se almacena en la clase ConfigParams
        const nodeLocation = this.configParams.nodeLocations[node - 1];

        // Se introduce el dato en el apartado de medidas de temp/hum
        if (topic == this.configParams.dittoTopic) {
            // Se forma el dato que se guardará en la bbdd. Debe tener la estructura que se ha definido
            // en el módulo de influx
            const influxData = [{
                measurement: this.configParams.measurement,
                tags: { x: nodeLocation["x"], y: nodeLocation["y"], z: nodeLocation["z"] },
                fields: { temp: messageJson["temp"], hum: messageJson["hum"] }
            }];

            this.influx.insert(influxData).then(() => {
                const now = new Date();
                console.log(`${this.configParams.TAG} ${now.toLocaleString()} Dato introducido\n`)
            });
        }
        // Se introduce el dato en el apartado de medidas de vibración
        else if (topic == this.configParams.vibrMeasTopic){

            const influxData = [{
                measurement: this.configParams.vibMeasurement,
                fields: {xVal: messageJson["xVal"], yVal: messageJson["yVal"],
                        zVal: messageJson["zVal"], xAvg: messageJson["xAvg"],
                        yAvg: messageJson["yAvg"], zAvg: messageJson["zAvg"]}
            }]

            this.influx.insertIntoVibr(influxData).then(() => {
                const now = new Date();
                console.log(`${this.configParams.TAG} ${now.toLocaleString()} Dato introducido\n`);
            })

        }
    }
}

module.exports = { LogicImpl };
