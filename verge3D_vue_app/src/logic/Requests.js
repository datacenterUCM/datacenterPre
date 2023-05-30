const axios = require('axios');
const { ConfigParams } = require('./ConfigParams');

class Requests {
  constructor() {
    this.configParams = new ConfigParams();
  }

  async getPlanePoints(zVal, sideYPoints, measurement, colorRange) {
    return new Promise(async (resolve, reject) => {
      const params = {
        zVal: zVal,
        sideYPoints: sideYPoints,
        measurement: measurement,
        colorRange: colorRange
      };

      // Se construyen la parte de los parámetros para la URL
      const queryParams = new URLSearchParams(params);

      // Realizar la solicitud GET utilizando Fetch
      fetch(
        `${this.configParams.serverUrl}${this.configParams.getPlanePointsPath}?${queryParams.toString()}`)
        .then(response => {
            // Se obtiene el header Content-type para saber si la respuesta es un json o no
            const contentType = response.headers.get('Content-type');
            if(contentType.includes('application/json')){
                resolve(response.json())
            }
            else{
                const error = new Error("El objeto recibido no es un json")
                reject(error)
            }
            
        })
        .then(data => {
          resolve(data);
        })
        .catch(error => {
          console.log(error); // Manejo de errores
          reject(error);
        });
    });
  }

  async get3DPoints(sideYPoints, measurement, colorRange, searchRange) {
    return new Promise(async (resolve, reject) => {
      const params = {
        sideYPoints: sideYPoints,
        measurement: measurement,
        colorRange: colorRange,
        searchRange: searchRange
      };

      // Se construyen la parte de los parámetros para la URL
      const queryParams = new URLSearchParams(params);

      // Realizar la solicitud GET utilizando Fetch
      fetch(
        `${this.configParams.serverUrl}${this.configParams.get3DPointsPath}?${queryParams.toString()}`)
        .then(response => {
            // Se obtiene el header Content-type para saber si la respuesta es un json o no
            const contentType = response.headers.get('Content-type');
            if(contentType.includes('application/json')){
                resolve(response.json())
            }
            else{
                const error = new Error("El objeto recibido no es un json")
                reject(error)
            }
            
        })
        .then(data => {
          resolve(data);
        })
        .catch(error => {
          console.log(error); // Manejo de errores
          reject(error);
        });
    });
  }
}

module.exports = { Requests };
