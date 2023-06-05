class ConfigParams{

    constructor(){

        this.influxIP = '147.96.85.89';
        this.influxPort = '8086';
        this.database = 'datacenter'
        // Un "measurement" es equivalente a una tabla en sql
        this.measurement = 'measures'
        // Este measurement guarda cuándo se ha detectado movimiento
        this.movementMeasurement = 'movement'
        // Este measurement guarda los valores de vibraciones:
        this.vibMeasurement = 'vibrations';

        // Variable para indicar si se van a guardar los valores de las vibraciones en bbdd o no.
        //this.measureVibrations = true;

        this.brokerIP = '10.42.0.1';
        //this.brokerIP = '147.96.81.123';
	    //this.brokerIP = '192.168.1.41';
        
        this.dittoTopic = 'eclipse-ditto-sandbox/org.eclipse.ditto:datacentertwin/things/twin/commands/modify';
        this.movementTopic = '/datacenter/movement' //Tópico en el que se guardan los avisos de movimiento

        // En este topico se reciben las medidas de vibración de los nodos
        this.vibrMeasTopic = "/datacenter/vibMeasurement";

        this.TAG = '[INFLUX MODULE]'

    }

}

module.exports = { ConfigParams };
