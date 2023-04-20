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
    // See https://www.eclipse.org/ditto/connectivity-mapping.html#helper-functions for details.
  
   const jsonString = String.fromCharCode.apply(null, new Uint8Array(bytePayload));
      const jsonData = JSON.parse(jsonString); 
      const thingId = jsonData.thingId.split(':');
      var value = {};
      var feature = ``
      if(thingId[1] == "sergio-room-v1"){
        if(jsonData.type == "measurements"){
            feature = `/features/node`+jsonData.node+`Val`
            value = {
                properties: {
                    temp: jsonData.temp, 
                    rh: jsonData.hum,
                    }
                }
            }
        else if (jsonData.type == "location"){
            feature = `/features/node`+jsonData.node+`Loc`
            value = {
                properties: {
                    x: jsonData.x, 
                    y: jsonData.y,
                    z: jsonData.z
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
          //'/features'// modify all features at once
          feature, // modify one particular feature
          headers, 
          value
      );
  }
  