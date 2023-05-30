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
            'node',
          ]
        }
      ]
    });

    this.influxConnectionMovement = new Influx.InfluxDB({
      host: this.configParams.influxIP,
      database: this.configParams.database,
      schema: [
        {
          measurement: this.configParams.movementMeasurement,
          fields:{
            xVal: Influx.FieldType.FLOAT,
            yVal: Influx.FieldType.FLOAT,
            zVal: Influx.FieldType.FLOAT,
            xAvg: Influx.FieldType.FLOAT,
            yAvg: Influx.FieldType.FLOAT,
            zAvg: Influx.FieldType.FLOAT
          },
          tags:[]
        }
      ]
    })

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
          },
          tags:[]
        }
      ]
    });
  }

  //Función para introducir un dato en la bbdd
  async insert(data) {

    this.influxConnection.writePoints(data).catch((error) =>console.log(error));

  }

  async insertIntoMovement(data){

    this.influxConnectionMovement.writePoints(data).catch((error) => console.log(error))

  }

  async insertIntoVibr(data) {

    this.influxConnectionVibr.writePoints(data).catch((error) => console.log(error));

  }

}

module.exports = { InfluxModule };