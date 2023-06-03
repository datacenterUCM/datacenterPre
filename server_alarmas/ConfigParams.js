///////////////////////////////////////////////////////////////////////////////
//CONFIGURATION PARAMETERS
///////////////////////////////////////////////////////////////////////////////

const fs = require('fs');

class ConfigParams {

    constructor() {
        //El bot token se puede obtener escribiendo /token en "botfather"
        this.botToken = '5824070812:AAGswCsv6aKQ3k8C9bqNQDDzbQ00KCuaKYM';

        //El channelId tan sólo se puede obtener poniendo el canal en público y 
        this.channelId = '-1001885304412';

        this.destinationId = '5812715209';
        this.sergioId = '5812715209';

        //Umbral máximo de temperatura en ºC y de humedad a partir del cual se dispara la alarma
        this.tempThreshold;
        this.humThreshold;

        //Url del broker
        //this.brokerIP = process.env.IP_BROKER; //192.168.4.1 por defecto
        this.brokerIP = "10.42.0.1";
        //this.brokerIP = "192.168.1.41"

        //Tópico correspondiente a ditto. El módulo de alarmas debe escuchar en este tópico para poder analizar las posibles alarmas.
        this.dittoTopic = 'eclipse-ditto-sandbox/org.eclipse.ditto:datacentertwin/things/twin/commands/modify';
        this.alarmModuleTopic = '/datacenter/alarmModule';

        //Tópico al que publica el nodo 9 cuando detecta movimiento
        this.movementTopic = '/datacenter/movement';
        //Topico para cambiar el timeout del nodo 9
        this.setTimetoutTopic = '/datacenter/setTimeout';
        //Topico para cambiar el umbral de vibración del nodo 9
        this.setvibThresh = '/datacenter/setThresh';
        // Tópico al que publca el nodo 9 cuando ha transcurrido el tiempo establecido desde la última vibración
        this.notMovementTopic = '/datacenter/noMovement'

        //Se leen los valores del archivo json de configuración
        this.readConfigFile();

    }

    readConfigFile() {
        //Se lee el archivo que contiene los valores de configuración
        const data = fs.readFileSync('./config_params.json', 'utf-8');
        let jsonData = JSON.parse(data);

        this.tempThreshold = jsonData["tempThresh"];
        this.humThreshold = jsonData["humThresh"];
    }
}


module.exports = { ConfigParams };