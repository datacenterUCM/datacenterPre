const { ConfigParams } = require("./ConfigParams");
const Influx = require('influx');

class InfluxModule {

  constructor() {
    this.configParams = new ConfigParams()

    this.connect()
  }

  //Función para conectarse a la base de datos
  connect() {

    this.influxConnection = new Influx.InfluxDB({
      host: this.configParams.influxIP,
      database: this.configParams.database,
      // Es necesario indicar la estructura de los datos que se introducen en la bbdd
      schema: [
        {
          measurement: this.configParams.measurement,
          fields: {
            temp: Influx.FieldType.FLOAT,
            hum: Influx.FieldType.FLOAT
          },
          tags: [
            'x',
            'y',
            'z',
          ]
        }
      ]
    });

    this.influxConnectionVibr = new Influx.InfluxDB({
      host: this.configParams.influxIP,
      database: this.configParams.database,
      // Es necesario indicar la estructura de los datos que se introducen en la bbdd
      schema: [
        {
          measurement: this.configParams.vibMeasurement,
          fields: {
            xVal: Influx.FieldType.FLOAT,
            yVal: Influx.FieldType.FLOAT,
            zVal: Influx.FieldType.FLOAT,
            xAvg: Influx.FieldType.FLOAT,
            yAvg: Influx.FieldType.FLOAT,
            zAvg: Influx.FieldType.FLOAT
          }
        }
      ]
    });
  }

  //Función para introducir un dato en la bbdd
  async insert(data) {

    this.influxConnection.writePoints(data).catch(console.error);

  }

  async insertIntoVibr(data) {

    this.influxConnectionVibr.writePoints(data).catch(console.error);

  }

}

module.exports = { InfluxModule };