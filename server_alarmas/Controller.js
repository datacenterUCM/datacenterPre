///////////////////////////////////////////////////////////////////////////////
//CONTROLLER
///////////////////////////////////////////////////////////////////////////////

TelegramBot = require('node-telegram-bot-api');
const { LogicImpl } = require("./LogicImpl");

class Controller {

    constructor(channelId, botToken, destinationId, sergioId, logicImpl, mqtt) {

        this.destinationId = destinationId;
        this.channelId = channelId;
        this.botToken = botToken;
        this.sergioId = sergioId;

        this.tag = "[BOT]";

        //Se define el bot
        this.bot = new TelegramBot(botToken, { polling: { abort: true } });

        //Se define la instancia de la lógica y se inician los mensajes automáticos
        this.logicImpl = logicImpl;
        this.logicImpl.setBot(this.bot);
        //this.logicImpl.initAutomaticMessages(this.bot);

        this.mqtt = mqtt;

    }

    /*OBTENER CHANNEL ID
    1. Cambiar el grupo a público
    2. Haz clic en el nombre del canal para acceder a la página de información del canal.
    3. Copia la dirección URL del canal.
    4. Remplaza "https://t.me/" por "https://api.telegram.org/bot[BOT_TOKEN]/getChat?chat_id=" en la dirección URL y agrega tu token de bot en lugar de [BOT_TOKEN].5. Ejecuta la URL en un navegador.
    5. En el JSON que se muestra, el ID del canal está en el campo "id".
    */

    initController() {

        //console.log("channelId = "+this.channelId+" botToken = "+this.botToken+" destinationId = "+this.destinationId);

        //Prueba de funcionamiento
        this.bot.sendMessage(this.channelId, 'Bot iniciado');

        this.bot.on('message', (msg) => {

            //Mensaje en el canal
            if (msg.chat.id == this.channelId) {

                this.bot.sendMessage(msg.chat.id, "mensaje en el canal");

            }
            //Comando para consultar la temperatura de la raspberry
            else if (msg.text == "/raspiTemp") {

                this.logicImpl.measureTemp().then((result) => {

                    this.bot.sendMessage(msg.chat.id, "La temperatura de la raspberry es " + result);

                });

            }
            //Comando para consultar los valores de los sensores
            else if (msg.text.substring(0,7) == "/report"){

                this.logicImpl.reportCommand(msg, this.mqtt).then((result) => {

                    this.bot.sendMessage(msg.chat.id, `${this.tag}\n${result}`);

                })

            }
            //Comando para modificar el tiempo de timeout de la máquina de frío
            else if(msg.text.substring( 0, 11 ) == "/setTimeout"){

                this.logicImpl.setVibTimeout(msg.text.substring(12), this.mqtt).then((result) =>{
                    this.bot.sendMessage(msg.chat.id, `Valor de timeout modificado a ${result}`);
                })

            }
            //Comando para modificar el umbral de vibración del nodo 9
            else if (msg.text.substring(0, 10) == "/setThresh"){
                this.logicImpl.setVibThresh(msg.text.substring(11), this.mqtt).then((result) => {
                    this.bot.sendMessage(msg.chat.id, `Valor del umbral de vibración modificado a ${result}`);
                })
            }
            //Comando para consultar los comandos disponibles
            else if (msg.text.substring(0, 10) == "/help"){
                this.logicImpl.helpRequest().then((result) => {
                    this.bot.sendMessage(msg.chat.id, result);
                })
            }
            //Comando para modificar el umbral de temperatura o humedad
            else if (msg.text.substring(0, 8) == "/setTemp"){
                this.logicImpl.setTempHum(msg.text.substring(9), "temp").then((result) => {
                    this.bot.sendMessage(msg.chat.id, `Umbral de temperatura modificado a ${result}`);
                })
            }
            //Comando para modificar el umbral de humedad
            else if (msg.text.substring(0, 7) == "/setHum"){
                this.logicImpl.setTempHum(msg.text.substring(8), "hum").then((result) => {
                    this.bot.sendMessage(msg.chat.id, `Umbral de humedad modificado a ${result}`);
                })
            }
            //Comando para consultar los umbrales de temperatura y humedad
            else if (msg.text.substring(0, 13) == "/configParams"){
                this.logicImpl.checkConfig().then((result) => {
                    this.bot.sendMessage(msg.chat.id, result);
                })
            }
            //Mensaje recibido de otra manera
            else {
                var test = this.logicImpl.test();
                this.bot.sendMessage(msg.chat.id, test);
            }
        });

    }

}

module.exports = { Controller };