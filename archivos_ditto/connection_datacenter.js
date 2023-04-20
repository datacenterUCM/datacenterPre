{
  "id": "4928fa58-c874-4234-a67b-c7bcae8cc189",
  "name": "RPI-demo",
  "connectionType": "mqtt",
  "connectionStatus": "open",
  "uri": "tcp://192.168.1.141:1883",
  "sources": [
    {
      "addresses": [
        "eclipse-ditto-sandbox/#"
      ],
      "consumerCount": 1,
      "qos": 0,
      "authorizationContext": [
        "nginx:sergio"
      ],
      "headerMapping": {},
      "payloadMapping": [
        "javascript"
      ],
      "replyTarget": {
        "enabled": false
      }
    }
  ],
  "targets": [
    {
      "address": "eclipse-ditto-sandbox/{{ thing:id }}",
      "topics": [
        "_/_/things/twin/events"
      ],
      "qos": 0,
      "authorizationContext": [
        "ditto:outbound-auth-subject"
      ],
      "headerMapping": {},
      "payloadMapping": [
        "javascript"
      ]
    }
  ],
  "clientCount": 1,
  "failoverEnabled": true,
  "validateCertificates": true,
  "processorPoolSize": 1,
  "mappingDefinitions": {
    "javascript": {
      "mappingEngine": "JavaScript",
      "options": {
        "incomingScript": "/**\n * Maps the passed parameters to a Ditto Protocol message.\n * @param {Object.<string, string>} headers - The headers Object containing all received header values\n * @param {string} [textPayload] - The String to be mapped\n * @param {ArrayBuffer} [bytePayload] - The bytes to be mapped as ArrayBuffer\n * @param {string} [contentType] - The received Content-Type, e.g. \"application/json\"\n * @returns {(DittoProtocolMessage|Array<DittoProtocolMessage>)} dittoProtocolMessage(s) -\n *  The mapped Ditto Protocol message,\n *  an array of Ditto Protocol messages or\n *  <code>null</code> if the message could/should not be mapped\n */\nfunction mapToDittoProtocolMsg(\n    headers,\n    textPayload,\n    bytePayload,\n    contentType\n  ) {\n  \n    // ### Insert/adapt your mapping logic here.\n    // Use helper function Ditto.buildDittoProtocolMsg to build Ditto protocol message\n    // based on incoming payload.\n    // See https://www.eclipse.org/ditto/connectivity-mapping.html#helper-functions for details.\n  \n    // ### example code assuming the Ditto protocol content type for incoming messages.\n   const jsonString = String.fromCharCode.apply(null, new Uint8Array(bytePayload));\n      const jsonData = JSON.parse(jsonString); \n      const thingId = jsonData.thingId.split(':');\n      var value = {};\n      var feature = ``\n\n      if(thingId[1] == \"sergio-room-v1\"){\n        if(jsonData.type == \"measurements\"){\n            feature = `/features/node`+jsonData.node+`Val`\n            value = {\n                properties: {\n                    temp: jsonData.temp, \n                    rh: jsonData.hum,\n                    }\n                }\n            }\n        else if (jsonData.type == \"location\"){\n            feature = `/features/node`+jsonData.node+`Loc`\n            value = {\n                properties: {\n                    x: jsonData.x, \n                    y: jsonData.y,\n                    z: jsonData.z\n                    }\n                }\n            }\n        }\n      \n      return Ditto.buildDittoProtocolMsg(\n          thingId[0], // your namespace \n          thingId[1], \n          'things', // we deal with a thing\n          'twin', // we want to update the twin\n          'commands', // create a command to update the twin\n          'modify', // modify the twin\n          feature, // modify all features at once\n          headers, \n          value\n      );\n  }\n  \n  ",
        "outgoingScript": "/**\n * Maps the passed parameters which originated from a Ditto Protocol message to an external message.\n * @param {string} namespace - The namespace of the entity in java package notation, e.g.: \"org.eclipse.ditto\". Or \"_\"\n * (underscore) for connection announcements.\n * @param {string} name - The name of the entity, e.g.: \"device\".\n * @param {string} group - The affected group/entity: \"things\"|\"policies\"|\"connections\".\n * @param {string} channel - The channel for the signal: \"twin\"|\"live\"|\"none\"\n * @param {string} criterion - The criterion to apply: \"commands\"|\"events\"|\"search\"|\"messages\"|\"announcements\"|\"errors\".\n * @param {string} action - The action to perform: \"create\"|\"retrieve\"|\"modify\"|\"delete\". Or the announcement name:\n * \"opened\"|\"closed\"|\"subjectDeletion\". Or the subject of the message.\n * @param {string} path - The path which is affected by the message (e.g.: \"/attributes\"), or the destination\n * of a message (e.g.: \"inbox\"|\"outbox\").\n * @param {Object.<string, string>} dittoHeaders - The headers Object containing all Ditto Protocol header values.\n * @param {*} [value] - The value to apply / which was applied (e.g. in a \"modify\" action).\n * @param {number} [status] - The status code that indicates the result of the command. When this field is set,\n * it indicates that the Ditto Protocol Message contains a response.\n * @param {Object} [extra] - The enriched extra fields when selected via \"extraFields\" option.\n * @returns {(ExternalMessage|Array<ExternalMessage>)} externalMessage - The mapped external message, an array of\n * external messages or <code>null</code> if the message could/should not be mapped.\n */\nfunction mapFromDittoProtocolMsg(\n  namespace,\n  name,\n  group,\n  channel,\n  criterion,\n  action,\n  path,\n  dittoHeaders,\n  value,\n  status,\n  extra\n) {\n\n  // ###\n  // Insert your mapping logic here\n\n  // ### example code using the Ditto protocol content type.\n  let headers = dittoHeaders;\n  let textPayload = JSON.stringify(Ditto.buildDittoProtocolMsg(namespace, name, group, channel, criterion, action,\n                                                               path, dittoHeaders, value, status, extra));\n  let bytePayload = null;\n  let contentType = 'application/vnd.eclipse.ditto+json';\n\n  return Ditto.buildExternalMsg(\n      headers, // The external headers Object containing header values\n      textPayload, // The external mapped String\n      bytePayload, // The external mapped byte[]\n      contentType // The returned Content-Type\n  );\n}",
        "loadBytebufferJS": "false",
        "loadLongJS": "false"
      }
    }
  },
  "tags": []
}
