class ConfigParams{

    constructor(){

        this.influxIP = '147.96.85.89';
        this.influxPort = '8086';
        this.database = 'datacenter'
        // Un "measurement" es equivalente a una tabla en sql
        this.measurement = 'measures'
        // Este measurement guarda los valores de vibraciones:
        this.vibMeasurement = 'vibrations';

        this.brokerIP = '10.42.0.1';
        
        this.dittoTopic = 'eclipse-ditto-sandbox/org.eclipse.ditto:datacentertwin/things/twin/commands/modify';

        // En este topico se reciben las medidas de vibración de los nodos
        this.vibrMeasTopic = "/datacenter/vibMeasurement";

        this.TAG = '[INFLUX MODULE]'

        // Esta lista contiene las localizaciones de los nodos.
        // La posición 0 de la lista se corresponde con el nodo 1.
        this.nodeLocations = [{x:0, y:0, z:0},
                            {x:1, y:1, z:1},
                            {x:1, y:1, z:1},
                            {x:1, y:1, z:1},
                            {x:1, y:1, z:1},
                            {x:1, y:1, z:1},
                            {x:1, y:1, z:1},
                            {x:1, y:1, z:1},
                            {x:9, y:1, z:1}]
    }

}

module.exports = { ConfigParams };
