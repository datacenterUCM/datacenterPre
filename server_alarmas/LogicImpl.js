///////////////////////////////////////////////////////////////////////////////
//LOGIC IMPLEMENTATION
///////////////////////////////////////////////////////////////////////////////

const { exec } = require('child_process');
const { ConfigParams } = require("./ConfigParams");
const fs = require('fs');


class LogicImpl {

    constructor() {

        this.configParams = new ConfigParams();
        this.bot = null;

        //Esta variable sirve para almacenar el estado de los nodos. 
        //0->estado correcto 
        //1->Valores fuera de los considerados normales
        this.nodeState = {};

        //Esta variable sirve para almacenar el estado de los nodos que se enviará cuando se reciba un comando
        //de lectura de los nodos
        this.nodeReportBuff = {};

        this.tag = "[BOT]";
        this.warning = "[WARNING]";
        this.info = "[INFO]";

        /*this.timeoutTime = 20; // Tiempo de timeout antes de que salte la alarma de la máquina de frío, en minutos.
        // Se define un temporizador que se encargará de enviar una alerta si ha pasado más tiempo del esperado
        // en la máquina de frío
        this.timeout;
        this.resetTimeout();*/

    }

    setBot(bot) {
        console.log("bot set");
        this.bot = bot;
    }

    //Función que comprueba el mensaje entrante. Comprueba el topic y el tipo de mensaje
    checkMsg(message, topic) {
        const messageJson = JSON.parse(message);
        if (topic == this.configParams.dittoTopic) {
            if (messageJson["type"] == 'measurements') {
                console.log("measurements");
                this.checkAlarm(messageJson);
            }
            if (messageJson["type"] == 'airConditionateAlarm') {
                console.log("airConditioning alarm");
                this.bot.sendMessage(this.configParams.channelId,
                    `${this.tag} ${this.warning} Se ha registrado una anomalía en las vibraciones de la máquina de frío en el nodo ${messageJson["node"]}`);
            }
        }
        //Si se reciben mensajes de los sensores reportando su estado, se almacenan en nodeReportBuff para enviarlos por telegram.
        else if (topic == this.configParams.alarmModuleTopic) {
            const node = messageJson["node"];

            if (messageJson["type"] == "singl" || messageJson["type"] == "multi") {

                if (node == 9) {
                    this.nodeReportBuff[node] = {
                        "temp": messageJson["temp"],
                        "hum": messageJson["hum"],
                        "vibTime": messageJson["vibTime"],
                        "vibThres": messageJson["vibThres"],
                        "airConditioningOk": messageJson["airConditioningOk"],
                        "version": messageJson["version"],
                    };
                }
                else {
                    this.nodeReportBuff[node] = {
                        "temp": messageJson["temp"],
                        "hum": messageJson["hum"],
                        "version": messageJson["version"],
                    };
                }

            }
            /*else if (messageJson["type"] = "multi") {

                //Esta condición se usa para ir añadiendo los nodos que no se hayan registrado aún.
                //if (typeof this.nodeReportBuff[node] == 'undefined') {
                //    this.nodeReportBuff[node] = { "temp": 0 }
                //}
                if (node == 9) {
                    this.nodeReportBuff[node] = {
                        "temp": messageJson["temp"],
                        "hum": messageJson["hum"],
                        "airConditioningOk": messageJson["airConditioningOk"]
                    };
                }
                else {
                    this.nodeReportBuff[node] = {
                        "temp": messageJson["temp"],
                        "hum": messageJson["hum"],
                    };
                }

            }*/
            else {
                console.log("else");
            }
        }
        else if (topic == this.configParams.movementTopic) {

            //Si se recibe un mensaje diciendo que se ha detectado movimiento se resetea el temporizador de timeout.
            //this.resetTimeout;
            console.log("Movimiento detectado");
        }

    }

    //Esta función recibe el mensaje por mqtt enviado por el sensor y comprueba que
    //esté dentro de los límites establecidos.
    checkAlarm(messageJson) {
        const node = messageJson["node"];
        const temp = messageJson["temp"];

        //Esta condición se usa para ir añadiendo los nodos que no se hayan registrado aún.
        if (typeof this.nodeState[node] == 'undefined') {
            this.nodeState[node] = { "temp": 0 }
        }

        if (temp >= this.configParams.tempThreshold) {
            //El mensaje de alerta sólo se manda una vez.
            if (this.nodeState[node]["temp"] == 0) {
                this.bot.sendMessage(this.configParams.channelId,
                    `${this.tag} ${this.warning} La temperatura ha sobrepasado los ${temp}ºC en el nodo ${node}`,
                    //'`<span style="color:red">Texto en color rojo</span>`', 
                    //{parse_mode: 'HTML'});
                );
                this.nodeState[node]["temp"] = 1;
            }
        }
        //Si los valores de temperatura son normales se marca como 0
        else {
            if (this.nodeState[node]["temp"] == 1) {
                this.bot.sendMessage(this.configParams.channelId,
                    `${this.tag} ${this.info} La temperatura del nodo ${node} ha vuelto a un valor normal`);
                this.nodeState[node]["temp"] = 0;
            }
        }

    }

    test() {
        return "test";
    }

    measureTemp() {

        return new Promise((resolve, reject) => {

            exec('vcgencmd measure_temp', (err, stdout, stderr) => {

                if (err) {
                    console.error(`Error: ${err}`);
                    return;
                }
                //(`Temperatura: ${stdout}`);
                resolve(stdout);

            });

        });

    }

    //Esta función se ejecuta cuando se recibe un comando de reporte del estado de los nodos
    reportCommand(msg, mqtt) {

        return new Promise(async (resolve, reject) => {

            const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));

            const node = msg.text.substring(8);

            //Si no se ha especificado ningún nodo se envía la información de todos los nodos
            if (node == '') {
                this.nodeReportBuff = {};

                // Hacer una publicación en /datacenter/node/# para todos los nodos y reenviar la respuesta al usuario
                mqtt.client.publish(`/datacenter/generalReport`, "multi", async function (err) {
                    if (err) {
                        resolve("Se ha producido un error");
                    }
                    else {
                        //Se esperan dos segundos después de la publicación del mensaje para dar tiempo a recibir los datos
                        //por parte de los nodos. La respuesta de los nodos se guarda en un objeto dentro de la clase mqtt.
                        await wait(2000);
                        if (JSON.stringify(this.nodeReportBuff, null, 3) == "{}") {
                            resolve("No se ha podido conectar con ningún nodo");
                        }
                        else {
                            resolve(JSON.stringify(this.nodeReportBuff, null, 3));
                        }
                    }
                }.bind(this)); //Hace que this en la función callback refiera al this de la clase

            }
            //Si se ha especificado algún nodo se envía la información de dicho nodo
            else if (isNaN(node) == false) {
                this.nodeReportBuff = {};

                //Hacer una publicación en /datacenter/node/<X> para un nodo en específico y reenviar la respuesta al usuario
                mqtt.client.publish(`/datacenter/node/${node}`, "singl", async function (err) {
                    if (err) {
                        resolve("Se ha producido un error");
                    }
                    else {
                        //Se esperan dos segundos después de la publicación del mensaje para dar tiempo a recibir los datos
                        //por parte de los nodos. La respuesta de los nodos se guarda en un objeto dentro de la clase mqtt.
                        await wait(2000);
                        console.log(this.nodeReportBuff);
                        if (JSON.stringify(this.nodeReportBuff, null, 3) == "{}") {
                            resolve(`No se ha podido conectar con el nodo ${node}`);
                        }
                        else {
                            resolve(JSON.stringify(this.nodeReportBuff, null, 3));
                        }
                    }
                }.bind(this)); //Hace que this en la función callback refiera al this de la clase
            }
            //Si no se ha especificado un valor numérico se avisa al usuario
            else {
                resolve("Por favor, selecciona un nodo válido");
            }
        });
    }

    // Función que se ejecuta cuando se pide modificar el valor del timeout vía telegram
    setVibTimeout(value, mqtt) {
        return new Promise((resolve, reject) => {
            /*this.timeoutTime = value;
            this.resetTimeout();
            resolve(value);*/
            mqtt.client.publish(this.configParams.setTimetoutTopic, value);
            resolve(value);
        })
    }

    // Función que se ejecuta cuando se pide modificar el valor del umbral de vibración vía telegram
    setVibThresh(value, mqtt) {
        return new Promise((resolve, reject) => {
            mqtt.client.publish(this.configParams.setvibThresh, value);
            resolve(value);
        })
    }

    // Función que se ejecuta para resetear el tiempo de timeout
    resetTimeout() {
        clearTimeout(this.timeout);
        this.timeout = setTimeout(function () {
            console.log("airConditioning alarm");
            this.bot.sendMessage(this.configParams.channelId,
                `${this.tag} ${this.warning} Se ha registrado una anomalía en las vibraciones de la máquina de frío`);
        }.bind(this), this.timeoutTime * 60 * 1000);
    }

    //Función que se ejecuta para modificar el umbral de temperatura o de humedad
    setTempHum(newValue, tempHum) {
        return new Promise((resolve, reject) => {

            //Se lee el archivo que contiene los valores de configuración
            const data = fs.readFileSync('./config_params.json', 'utf-8');
            let jsonData = JSON.parse(data);

            if (tempHum == "temp") {
                jsonData["tempThresh"] = parseInt(newValue);
                this.configParams.tempThreshold = parseInt(newValue);
            }
            else {
                jsonData["humThresh"] = parseInt(newValue);
                this.configParams.humThreshold = parseInt(newValue);
            }
            const newJsonData = JSON.stringify(jsonData, null, 4);
            //Se guardan los cambios
            fs.writeFileSync('./config_params.json', newJsonData);

            resolve(newValue);
        })
    }

    //Función que se ejecuta para consultar los valores de los umbrales
    checkConfig() {
        return new Promise((resolve, reject) => {
            const data = fs.readFileSync('./config_params.json', 'utf-8');
            const jsonData = JSON.parse(data);
            resolve(JSON.stringify(jsonData, null, 3));
        })
    }

    // Función que se ejecuta cuando se ejecuta el comando /help
    helpRequest() {
        return new Promise((resolve, reject) => {
            const helpMsg = {
                "/report": "Imprime el estado de todos los nodos conectados",
                "/report <X>": "Imprime el estado de un nodo en específico",
                "/raspitemp": "Imprime la temperatura de la raspberry pi",
                "/setTimeout <X>": "Cambia el tiempo que debe de transcurrir sin vibraciones en la máquina de frío para que se considere una anomalía",
                "/setThresh <X>": "Cambia el umbral de vibración de la máquinade frío",
                "/setTemp <X>": "Cambia el umbral de temperatura a partir del cual se dispara la alarma",
                "/setHum <X>": "Cambia el umbral de humedad a partir del cual se dispara la alarma",
                "/configParams": "Imprime los valores de los umbrales"
            }
            resolve(JSON.stringify(helpMsg, null, 3))
        })
    }

}

module.exports = { LogicImpl };