/**
 * Maps the passed parameters to a Ditto Protocol message.
 * @param {Object.<string, string>} headers - The headers Object containing all received header values
 * @param {string} [textPayload] - The String to be mapped
 * @param {ArrayBuffer} [bytePayload] - The bytes to be mapped as ArrayBuffer
 * @param {string} [contentType] - The received Content-Type, e.g. "application/json"
 * @returns {(DittoProtocolMessage|Array<DittoProtocolMessage>)} dittoProtocolMessage(s) -
 *  The mapped Ditto Protocol message,
 *  an array of Ditto Protocol messages or
 *  <code>null</code> if the message could/should not be mapped
 */
function mapToDittoProtocolMsg(
  headers,
  textPayload,
  bytePayload,
  contentType
) {

  // ### Insert/adapt your mapping logic here.
  // Use helper function Ditto.buildDittoProtocolMsg to build Ditto protocol message
  // based on incoming payload.
  // See https://www.eclipse.org/ditto/connectivity-mapping.html#helper-functions for details.

  // ### example code assuming the Ditto protocol content type for incoming messages.
 const jsonString = String.fromCharCode.apply(null, new Uint8Array(bytePayload));
    const jsonData = JSON.parse(jsonString); 
    const thingId = jsonData.thingId.split(':');
    var value = {};
    if(thingId[1] == "fancy-car"){
        value = { 
            transmission: { 
                properties: { 
                    automatic: jsonData.automatic,
                    cur_speed: jsonData.cur_speed,
                    mode: jsonData.mode,
                    gear: jsonData.gear
                } 
            }  
        }    
    }
    else if(thingId[1] == "node1"){
        if(jsonData.action == "temp"){
            value = {
                temperature: {
                    properties: {
                      measurement: jsonData.temp, 
                      units: jsonData.tempUnits
                    }
                }
            }
        }
        else if (jsonData.action == "hum"){
            value = {
                humidity: {
                    properties: {
                      measurement: jsonData.hum, 
                      units: jsonData.humUnits
                    }
                }
            }
        }
        else if (jsonData.action == "gyro"){
            value = {
                gyroscope: {
                    properties: {
                      measurementX: jsonData.gyroX, 
                      unitsX: jsonData.gyroUnitsX,
                      factorX:jsonData.gyroFactorX,
                      measurementY: jsonData.gyroY, 
                      unitsY: jsonData.gyroUnitsY,
                      factorY:jsonData.gyroFactorY,
                      measurementZ: jsonData.gyroZ, 
                      unitsZ: jsonData.gyroUnitsZ,
                      factorZ:jsonData.gyroFactorZ
                    }
                }
            }
        }
        else if (jsonData.action == "acel"){
            value = {
                acelerometer: {
                    properties: {
                      measurementX: jsonData.acelX,
                      unitsX: jsonData.acelUnitsX,
                      factorX:jsonData.acelFactorX,
                      measurementY: jsonData.acelY, 
                      unitsY: jsonData.acelUnitsY,
                      factorY:jsonData.acelFactorY,
                      measurementZ: jsonData.acelZ, 
                      unitsZ: jsonData.acelUnitsZ,
                      factorZ:jsonData.acelFactorZ
                    }
                }
            }
        }
        else{
            value = {
                temperature: {
                    properties: {
                      measurement: jsonData.temp, 
                      units: jsonData.tempUnits
                    }
                  },
                  humidity: {
                    properties: {
                      measurement: jsonData.hum, 
                      units: jsonData.humUnits
                    }
                  },
                  gyroscope: {
                    properties: {
                      measurementX: jsonData.gyroX, 
                      unitsX: jsonData.gyroUnitsX,
                      factorX:jsonData.gyroFactorX,
                      measurementY: jsonData.gyroY, 
                      unitsY: jsonData.gyroUnitsY,
                      factorY:jsonData.gyroFactorY,
                      measurementZ: jsonData.gyroZ, 
                      unitsZ: jsonData.gyroUnitsZ,
                      factorZ:jsonData.gyroFactorZ
                    }
                  },
                  acelerometer: {
                    properties: {
                      measurementX: jsonData.acelX,
                      unitsX: jsonData.acelUnitsX,
                      factorX:jsonData.acelFactorX,
                      measurementY: jsonData.acelY, 
                      unitsY: jsonData.acelUnitsY,
                      factorY:jsonData.acelFactorY,
                      measurementZ: jsonData.acelZ, 
                      unitsZ: jsonData.acelUnitsZ,
                      factorZ:jsonData.acelFactorZ
                    }
                }
            }
        }
    }
    else {
        value = {
            temperature: {
                properties: {
                    measurement: jsonData.temp, 
                    units: jsonData.tempUnits
                }
            },
            humidity: {
                properties: {
                    measurement: jsonData.hum, 
                    units: jsonData.humUnits
                }
            }
        }
    }
    
    return Ditto.buildDittoProtocolMsg(
        thingId[0], // your namespace 
        thingId[1], 
        'things', // we deal with a thing
        'twin', // we want to update the twin
        'commands', // create a command to update the twin
        'modify', // modify the twin
        '/features', // modify all features at once
        headers, 
        value
    );
}