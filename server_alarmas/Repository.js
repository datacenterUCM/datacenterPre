///////////////////////////////////////////////////////////////////////////////
//REPOSITORY
///////////////////////////////////////////////////////////////////////////////

const { Influx } = require("./Influx");
const { ConfigParams } = require("./ConfigParams");

class Repository{

    constructor(){

        this.configParams = new ConfigParams();
        this.influx = new Influx(configParams.influxHost, configParams.influxDatabase, configParams.influxMeasurement);

    }

    //Petición dado el id
    findById(id){
        
        return new Promise((resolve, reject) => {

            //EL VALOR DEL TAG DE LA QUERY DEBE IR ENTRE COMILLAS SIMPLES
            var query = 'SELECT * FROM ' + this.configParams.influxMeasurement + ' WHERE id=\''+ id +'\'';

            this.influx.influxConnector.query(query).then((result) => {

                resolve(result[0].content);

            }).catch((error) => {

                reject(error);
                
            });

        });

    }

    //Función para insertar un nuevo registro 
    insertText(measurement, content){

        return new Promise((resolve, reject) => {

        //Se obtiene el valor de último id
        const query = 'SELECT * FROM ' + this.configParams.influxMeasurement + ' ORDER BY time DESC LIMIT 1';
        this.influx.influxConnector.query(query).then((result) => {

            //console.log("Valor recuperado de la bbdd: "+result[0].id);

            this.influx.influxConnector.writePoints([
                                                        {
                                                            measurement: measurement,
                                                            fields: { value: 1 },
                                                            tags: { id: parseInt(result[0].id) + 1, type: 'text',content: content },
                                                        }
                                                            ])
              .then(() => {

                resolve("Done");

              })
              .catch((error) => {

                reject(error);

              });
          });
        });

    }

    //Función que comprueba si es la primera ejecución
    findFirstExecution(){

        return new Promise((resolve, reject) => {

            const query = 'SELECT * FROM ' + this.configParams.influxFirstEx;
            this.influx.influxConnector.query(query).then((result) => {

                resolve(result);

            } ).catch((error) => {

                reject(error);

            });

        })

    }

    //Función que cuenta cuántos registros hay en el measurement.
    findNumberOfMessages(){

        return new Promise((resolve, reject) => {

            var query = 'SELECT count(*) FROM ' + this.configParams.influxMeasurement;

            this.influx.influxConnector.query(query).then((result) => {

                resolve(result[0].count_value);

            }).catch((error) => {

                reject(error);
                
            });

        });

    }
      
    //Borrar un "measurement" o tabla por completo
    deleteFromMeasurement(measurement){

        return new Promise((resolve, reject) => {
    
            const query = 'DELETE FROM '+measurement;
    
            this.influx.influxConnector.query(query).then(() =>{
    
                resolve("Done");
    
            }).catch((error) => {
    
                reject(error);
    
            });
        });
    
    }

    //Función para insertar que no es la primera ejecución
    insertNotFirstEx(){

        return new Promise((resolve, reject) => {

            const query = 'INSERT '+ this.configParams.influxFirstEx +',content=Iniciado value=1';

            this.influx.influxConnector.writePoints([
                {
                  measurement: this.configParams.influxFirstEx,
                  fields: { content: 'Iniciado', value: 1 },
                }
              ]).then(() => {

                resolve("Done");

              }).catch((error) => {

                reject(error);

              });

        });

    }



}


module.exports = {Repository}