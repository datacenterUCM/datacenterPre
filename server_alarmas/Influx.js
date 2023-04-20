///////////////////////////////////////////////////////////////////////////////
//INFLUX DATABASE
///////////////////////////////////////////////////////////////////////////////

const InfluxDB = require('influx');

class Influx{

    constructor (host, database, measurement){
        
        this.influxConnector = new InfluxDB.InfluxDB({
            host: host,
            database: database,
            schema: [
              {
                measurement: measurement,
                fields: {
                  value: InfluxDB.FieldType.FLOAT
                },
                tags: [
                  'id',
                  'type',
                  'content'
                ]
              }
            ]
        });

        //console.log("Connected to database");

    }

}

module.exports = {Influx}