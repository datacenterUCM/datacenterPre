///////////////////////////////////////////////////////////////////////////////
//LOGIC IMPLEMENTATION
///////////////////////////////////////////////////////////////////////////////

const { exec } = require('child_process');
const { ConfigParams } = require("./ConfigParams");


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

    }

    setBot(bot) {
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

            const node = msg.text.substring(7);

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
                        if( JSON.stringify(this.nodeReportBuff, null, 3) == "{}" ){
                            resolve( "No se ha podido conectar con ningún nodo" );
                        }
                        else{
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
                        if (JSON.stringify(this.nodeReportBuff, null, 3) == "{}"){
                            resolve ( `No se ha podido conectar con el nodo ${node}` );
                        }
                        else{
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


}

module.exports = { LogicImpl };