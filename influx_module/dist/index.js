/******/ (() => { // webpackBootstrap
/******/ 	var __webpack_modules__ = ({

/***/ 6528:
/***/ ((module) => {

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
        this.measureVibrations = true;

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


/***/ }),

/***/ 8378:
/***/ ((module, __unused_webpack_exports, __nccwpck_require__) => {

const { ConfigParams } = __nccwpck_require__(6528);
const Influx = __nccwpck_require__(2059);

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
            zVal: Influx.FieldType.FLOAT
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

/***/ }),

/***/ 5015:
/***/ ((module, __unused_webpack_exports, __nccwpck_require__) => {

const { InfluxModule } = __nccwpck_require__(8378);
const { ConfigParams } = __nccwpck_require__(6528);


class LogicImpl {

    constructor() {

        this.configParams = new ConfigParams()
        this.influx = new InfluxModule()

    }

    // Función que se ejecuta cuando llega un mensaje vía mqtt
    checkMsg(message, topic) {

        const messageJson = JSON.parse(message);
        //console.log(this.configParams.TAG + " Mensaje recibido en el tópico " + topic);

        const node = messageJson["node"];

        // La localización del nodo se almacena en la clase ConfigParams
        //const nodeLocation = this.configParams.nodeLocations[node - 1];

        // Se introduce el dato en el apartado de medidas de temp/hum
        if (topic == this.configParams.dittoTopic) {
            // Se forma el dato que se guardará en la bbdd. Debe tener la estructura que se ha definido
            // en el módulo de influx
            const influxData = [{
                measurement: this.configParams.measurement,
                //tags: { x: nodeLocation["x"], y: nodeLocation["y"], z: nodeLocation["z"] },
                tags: { node: node },
                fields: { temp: messageJson["temp"], hum: messageJson["hum"] }
            }];

            this.influx.insert(influxData).then(() => {
                const now = new Date();
                //console.log(`${this.configParams.TAG} ${now.toLocaleString()} Dato introducido\n`)
            });
        }
        // Se introduce el dato de movimieno en el apartado de medidas de movimiento
        else if(topic == this.configParams.movementTopic){
            const influxData = [{
                measurement: this.configParams.movementMeasurement,
                fields: {xVal: messageJson["xVal"], yVal: messageJson["yVal"],
                zVal: messageJson["zVal"], xAvg: messageJson["xAvg"],
                yAvg: messageJson["yAvg"], zAvg: messageJson["zAvg"]
                }
            }]

            this.influx.insertIntoMovement(influxData).then(() => {
                const now = new Date();
                //console.log(`${this.configParams.TAG} ${now.toLocaleString()} Dato introducido\n`)
            })
        }
        // Se introduce el dato en el apartado de medidas de vibración
        else if (topic == this.configParams.vibrMeasTopic){

            const influxData = [{
                measurement: this.configParams.vibMeasurement,
                fields: {xVal: messageJson["xVal"], yVal: messageJson["yVal"],
                        zVal: messageJson["zVal"]}
            }]

            this.influx.insertIntoVibr(influxData).then(() => {
                const now = new Date();
                //console.log(`${this.configParams.TAG} ${now.toLocaleString()} Dato introducido\n`);
            })

        }
    }
}

module.exports = { LogicImpl };


/***/ }),

/***/ 2560:
/***/ ((module, __unused_webpack_exports, __nccwpck_require__) => {

const mqtt = __nccwpck_require__(8017);
const { ConfigParams } = __nccwpck_require__(6528);

class MqttModule {

    constructor(logicImpl) {
        this.configParams = new ConfigParams();

        this.brokerIP = this.configParams.brokerIP;
        this.client = mqtt.connect('mqtt://' + this.brokerIP);

        this.logicImpl = logicImpl;

        this.connect();
        this.initCallback();

    }

    connect() {

        // Conectar al broker
        this.client.on('connect', () => {
            console.log('Connecting to MQTT broker on', this.brokerIP + '...');

            this.client.subscribe(this.configParams.dittoTopic);
            this.client.subscribe(this.configParams.movementTopic)
            // Sólo se miden las vibraciones si se especifica en los parámetros de configuración
            if (this.configParams.measureVibrations == true){
                this.client.subscribe(this.configParams.vibrMeasTopic);
            }
            console.log('Connected to broker on', this.brokerIP);
        });

    }

    initCallback() {

        this.client.on('message', (topic, message) => {
                this.logicImpl.checkMsg(message, topic);
        });

    }

}

module.exports = { MqttModule };


/***/ }),

/***/ 2344:
/***/ ((module, __unused_webpack_exports, __nccwpck_require__) => {

"use strict";


const { Buffer } = __nccwpck_require__(4300)
const symbol = Symbol.for('BufferList')

function BufferList (buf) {
  if (!(this instanceof BufferList)) {
    return new BufferList(buf)
  }

  BufferList._init.call(this, buf)
}

BufferList._init = function _init (buf) {
  Object.defineProperty(this, symbol, { value: true })

  this._bufs = []
  this.length = 0

  if (buf) {
    this.append(buf)
  }
}

BufferList.prototype._new = function _new (buf) {
  return new BufferList(buf)
}

BufferList.prototype._offset = function _offset (offset) {
  if (offset === 0) {
    return [0, 0]
  }

  let tot = 0

  for (let i = 0; i < this._bufs.length; i++) {
    const _t = tot + this._bufs[i].length
    if (offset < _t || i === this._bufs.length - 1) {
      return [i, offset - tot]
    }
    tot = _t
  }
}

BufferList.prototype._reverseOffset = function (blOffset) {
  const bufferId = blOffset[0]
  let offset = blOffset[1]

  for (let i = 0; i < bufferId; i++) {
    offset += this._bufs[i].length
  }

  return offset
}

BufferList.prototype.get = function get (index) {
  if (index > this.length || index < 0) {
    return undefined
  }

  const offset = this._offset(index)

  return this._bufs[offset[0]][offset[1]]
}

BufferList.prototype.slice = function slice (start, end) {
  if (typeof start === 'number' && start < 0) {
    start += this.length
  }

  if (typeof end === 'number' && end < 0) {
    end += this.length
  }

  return this.copy(null, 0, start, end)
}

BufferList.prototype.copy = function copy (dst, dstStart, srcStart, srcEnd) {
  if (typeof srcStart !== 'number' || srcStart < 0) {
    srcStart = 0
  }

  if (typeof srcEnd !== 'number' || srcEnd > this.length) {
    srcEnd = this.length
  }

  if (srcStart >= this.length) {
    return dst || Buffer.alloc(0)
  }

  if (srcEnd <= 0) {
    return dst || Buffer.alloc(0)
  }

  const copy = !!dst
  const off = this._offset(srcStart)
  const len = srcEnd - srcStart
  let bytes = len
  let bufoff = (copy && dstStart) || 0
  let start = off[1]

  // copy/slice everything
  if (srcStart === 0 && srcEnd === this.length) {
    if (!copy) {
      // slice, but full concat if multiple buffers
      return this._bufs.length === 1
        ? this._bufs[0]
        : Buffer.concat(this._bufs, this.length)
    }

    // copy, need to copy individual buffers
    for (let i = 0; i < this._bufs.length; i++) {
      this._bufs[i].copy(dst, bufoff)
      bufoff += this._bufs[i].length
    }

    return dst
  }

  // easy, cheap case where it's a subset of one of the buffers
  if (bytes <= this._bufs[off[0]].length - start) {
    return copy
      ? this._bufs[off[0]].copy(dst, dstStart, start, start + bytes)
      : this._bufs[off[0]].slice(start, start + bytes)
  }

  if (!copy) {
    // a slice, we need something to copy in to
    dst = Buffer.allocUnsafe(len)
  }

  for (let i = off[0]; i < this._bufs.length; i++) {
    const l = this._bufs[i].length - start

    if (bytes > l) {
      this._bufs[i].copy(dst, bufoff, start)
      bufoff += l
    } else {
      this._bufs[i].copy(dst, bufoff, start, start + bytes)
      bufoff += l
      break
    }

    bytes -= l

    if (start) {
      start = 0
    }
  }

  // safeguard so that we don't return uninitialized memory
  if (dst.length > bufoff) return dst.slice(0, bufoff)

  return dst
}

BufferList.prototype.shallowSlice = function shallowSlice (start, end) {
  start = start || 0
  end = typeof end !== 'number' ? this.length : end

  if (start < 0) {
    start += this.length
  }

  if (end < 0) {
    end += this.length
  }

  if (start === end) {
    return this._new()
  }

  const startOffset = this._offset(start)
  const endOffset = this._offset(end)
  const buffers = this._bufs.slice(startOffset[0], endOffset[0] + 1)

  if (endOffset[1] === 0) {
    buffers.pop()
  } else {
    buffers[buffers.length - 1] = buffers[buffers.length - 1].slice(0, endOffset[1])
  }

  if (startOffset[1] !== 0) {
    buffers[0] = buffers[0].slice(startOffset[1])
  }

  return this._new(buffers)
}

BufferList.prototype.toString = function toString (encoding, start, end) {
  return this.slice(start, end).toString(encoding)
}

BufferList.prototype.consume = function consume (bytes) {
  // first, normalize the argument, in accordance with how Buffer does it
  bytes = Math.trunc(bytes)
  // do nothing if not a positive number
  if (Number.isNaN(bytes) || bytes <= 0) return this

  while (this._bufs.length) {
    if (bytes >= this._bufs[0].length) {
      bytes -= this._bufs[0].length
      this.length -= this._bufs[0].length
      this._bufs.shift()
    } else {
      this._bufs[0] = this._bufs[0].slice(bytes)
      this.length -= bytes
      break
    }
  }

  return this
}

BufferList.prototype.duplicate = function duplicate () {
  const copy = this._new()

  for (let i = 0; i < this._bufs.length; i++) {
    copy.append(this._bufs[i])
  }

  return copy
}

BufferList.prototype.append = function append (buf) {
  if (buf == null) {
    return this
  }

  if (buf.buffer) {
    // append a view of the underlying ArrayBuffer
    this._appendBuffer(Buffer.from(buf.buffer, buf.byteOffset, buf.byteLength))
  } else if (Array.isArray(buf)) {
    for (let i = 0; i < buf.length; i++) {
      this.append(buf[i])
    }
  } else if (this._isBufferList(buf)) {
    // unwrap argument into individual BufferLists
    for (let i = 0; i < buf._bufs.length; i++) {
      this.append(buf._bufs[i])
    }
  } else {
    // coerce number arguments to strings, since Buffer(number) does
    // uninitialized memory allocation
    if (typeof buf === 'number') {
      buf = buf.toString()
    }

    this._appendBuffer(Buffer.from(buf))
  }

  return this
}

BufferList.prototype._appendBuffer = function appendBuffer (buf) {
  this._bufs.push(buf)
  this.length += buf.length
}

BufferList.prototype.indexOf = function (search, offset, encoding) {
  if (encoding === undefined && typeof offset === 'string') {
    encoding = offset
    offset = undefined
  }

  if (typeof search === 'function' || Array.isArray(search)) {
    throw new TypeError('The "value" argument must be one of type string, Buffer, BufferList, or Uint8Array.')
  } else if (typeof search === 'number') {
    search = Buffer.from([search])
  } else if (typeof search === 'string') {
    search = Buffer.from(search, encoding)
  } else if (this._isBufferList(search)) {
    search = search.slice()
  } else if (Array.isArray(search.buffer)) {
    search = Buffer.from(search.buffer, search.byteOffset, search.byteLength)
  } else if (!Buffer.isBuffer(search)) {
    search = Buffer.from(search)
  }

  offset = Number(offset || 0)

  if (isNaN(offset)) {
    offset = 0
  }

  if (offset < 0) {
    offset = this.length + offset
  }

  if (offset < 0) {
    offset = 0
  }

  if (search.length === 0) {
    return offset > this.length ? this.length : offset
  }

  const blOffset = this._offset(offset)
  let blIndex = blOffset[0] // index of which internal buffer we're working on
  let buffOffset = blOffset[1] // offset of the internal buffer we're working on

  // scan over each buffer
  for (; blIndex < this._bufs.length; blIndex++) {
    const buff = this._bufs[blIndex]

    while (buffOffset < buff.length) {
      const availableWindow = buff.length - buffOffset

      if (availableWindow >= search.length) {
        const nativeSearchResult = buff.indexOf(search, buffOffset)

        if (nativeSearchResult !== -1) {
          return this._reverseOffset([blIndex, nativeSearchResult])
        }

        buffOffset = buff.length - search.length + 1 // end of native search window
      } else {
        const revOffset = this._reverseOffset([blIndex, buffOffset])

        if (this._match(revOffset, search)) {
          return revOffset
        }

        buffOffset++
      }
    }

    buffOffset = 0
  }

  return -1
}

BufferList.prototype._match = function (offset, search) {
  if (this.length - offset < search.length) {
    return false
  }

  for (let searchOffset = 0; searchOffset < search.length; searchOffset++) {
    if (this.get(offset + searchOffset) !== search[searchOffset]) {
      return false
    }
  }
  return true
}

;(function () {
  const methods = {
    readDoubleBE: 8,
    readDoubleLE: 8,
    readFloatBE: 4,
    readFloatLE: 4,
    readInt32BE: 4,
    readInt32LE: 4,
    readUInt32BE: 4,
    readUInt32LE: 4,
    readInt16BE: 2,
    readInt16LE: 2,
    readUInt16BE: 2,
    readUInt16LE: 2,
    readInt8: 1,
    readUInt8: 1,
    readIntBE: null,
    readIntLE: null,
    readUIntBE: null,
    readUIntLE: null
  }

  for (const m in methods) {
    (function (m) {
      if (methods[m] === null) {
        BufferList.prototype[m] = function (offset, byteLength) {
          return this.slice(offset, offset + byteLength)[m](0, byteLength)
        }
      } else {
        BufferList.prototype[m] = function (offset = 0) {
          return this.slice(offset, offset + methods[m])[m](0)
        }
      }
    }(m))
  }
}())

// Used internally by the class and also as an indicator of this object being
// a `BufferList`. It's not possible to use `instanceof BufferList` in a browser
// environment because there could be multiple different copies of the
// BufferList class and some `BufferList`s might be `BufferList`s.
BufferList.prototype._isBufferList = function _isBufferList (b) {
  return b instanceof BufferList || BufferList.isBufferList(b)
}

BufferList.isBufferList = function isBufferList (b) {
  return b != null && b[symbol]
}

module.exports = BufferList


/***/ }),

/***/ 336:
/***/ ((module, __unused_webpack_exports, __nccwpck_require__) => {

"use strict";


const DuplexStream = (__nccwpck_require__(1642).Duplex)
const inherits = __nccwpck_require__(4124)
const BufferList = __nccwpck_require__(2344)

function BufferListStream (callback) {
  if (!(this instanceof BufferListStream)) {
    return new BufferListStream(callback)
  }

  if (typeof callback === 'function') {
    this._callback = callback

    const piper = function piper (err) {
      if (this._callback) {
        this._callback(err)
        this._callback = null
      }
    }.bind(this)

    this.on('pipe', function onPipe (src) {
      src.on('error', piper)
    })
    this.on('unpipe', function onUnpipe (src) {
      src.removeListener('error', piper)
    })

    callback = null
  }

  BufferList._init.call(this, callback)
  DuplexStream.call(this)
}

inherits(BufferListStream, DuplexStream)
Object.assign(BufferListStream.prototype, BufferList.prototype)

BufferListStream.prototype._new = function _new (callback) {
  return new BufferListStream(callback)
}

BufferListStream.prototype._write = function _write (buf, encoding, callback) {
  this._appendBuffer(buf)

  if (typeof callback === 'function') {
    callback()
  }
}

BufferListStream.prototype._read = function _read (size) {
  if (!this.length) {
    return this.push(null)
  }

  size = Math.min(size, this.length)
  this.push(this.slice(0, size))
  this.consume(size)
}

BufferListStream.prototype.end = function end (chunk) {
  DuplexStream.prototype.end.call(this, chunk)

  if (this._callback) {
    this._callback(null, this.slice())
    this._callback = null
  }
}

BufferListStream.prototype._destroy = function _destroy (err, cb) {
  this._bufs.length = 0
  this.length = 0
  cb(err)
}

BufferListStream.prototype._isBufferList = function _isBufferList (b) {
  return b instanceof BufferListStream || b instanceof BufferList || BufferListStream.isBufferList(b)
}

BufferListStream.isBufferList = BufferList.isBufferList

module.exports = BufferListStream
module.exports.BufferListStream = BufferListStream
module.exports.BufferList = BufferList


/***/ }),

/***/ 8222:
/***/ ((module, exports, __nccwpck_require__) => {

/* eslint-env browser */

/**
 * This is the web browser implementation of `debug()`.
 */

exports.formatArgs = formatArgs;
exports.save = save;
exports.load = load;
exports.useColors = useColors;
exports.storage = localstorage();
exports.destroy = (() => {
	let warned = false;

	return () => {
		if (!warned) {
			warned = true;
			console.warn('Instance method `debug.destroy()` is deprecated and no longer does anything. It will be removed in the next major version of `debug`.');
		}
	};
})();

/**
 * Colors.
 */

exports.colors = [
	'#0000CC',
	'#0000FF',
	'#0033CC',
	'#0033FF',
	'#0066CC',
	'#0066FF',
	'#0099CC',
	'#0099FF',
	'#00CC00',
	'#00CC33',
	'#00CC66',
	'#00CC99',
	'#00CCCC',
	'#00CCFF',
	'#3300CC',
	'#3300FF',
	'#3333CC',
	'#3333FF',
	'#3366CC',
	'#3366FF',
	'#3399CC',
	'#3399FF',
	'#33CC00',
	'#33CC33',
	'#33CC66',
	'#33CC99',
	'#33CCCC',
	'#33CCFF',
	'#6600CC',
	'#6600FF',
	'#6633CC',
	'#6633FF',
	'#66CC00',
	'#66CC33',
	'#9900CC',
	'#9900FF',
	'#9933CC',
	'#9933FF',
	'#99CC00',
	'#99CC33',
	'#CC0000',
	'#CC0033',
	'#CC0066',
	'#CC0099',
	'#CC00CC',
	'#CC00FF',
	'#CC3300',
	'#CC3333',
	'#CC3366',
	'#CC3399',
	'#CC33CC',
	'#CC33FF',
	'#CC6600',
	'#CC6633',
	'#CC9900',
	'#CC9933',
	'#CCCC00',
	'#CCCC33',
	'#FF0000',
	'#FF0033',
	'#FF0066',
	'#FF0099',
	'#FF00CC',
	'#FF00FF',
	'#FF3300',
	'#FF3333',
	'#FF3366',
	'#FF3399',
	'#FF33CC',
	'#FF33FF',
	'#FF6600',
	'#FF6633',
	'#FF9900',
	'#FF9933',
	'#FFCC00',
	'#FFCC33'
];

/**
 * Currently only WebKit-based Web Inspectors, Firefox >= v31,
 * and the Firebug extension (any Firefox version) are known
 * to support "%c" CSS customizations.
 *
 * TODO: add a `localStorage` variable to explicitly enable/disable colors
 */

// eslint-disable-next-line complexity
function useColors() {
	// NB: In an Electron preload script, document will be defined but not fully
	// initialized. Since we know we're in Chrome, we'll just detect this case
	// explicitly
	if (typeof window !== 'undefined' && window.process && (window.process.type === 'renderer' || window.process.__nwjs)) {
		return true;
	}

	// Internet Explorer and Edge do not support colors.
	if (typeof navigator !== 'undefined' && navigator.userAgent && navigator.userAgent.toLowerCase().match(/(edge|trident)\/(\d+)/)) {
		return false;
	}

	// Is webkit? http://stackoverflow.com/a/16459606/376773
	// document is undefined in react-native: https://github.com/facebook/react-native/pull/1632
	return (typeof document !== 'undefined' && document.documentElement && document.documentElement.style && document.documentElement.style.WebkitAppearance) ||
		// Is firebug? http://stackoverflow.com/a/398120/376773
		(typeof window !== 'undefined' && window.console && (window.console.firebug || (window.console.exception && window.console.table))) ||
		// Is firefox >= v31?
		// https://developer.mozilla.org/en-US/docs/Tools/Web_Console#Styling_messages
		(typeof navigator !== 'undefined' && navigator.userAgent && navigator.userAgent.toLowerCase().match(/firefox\/(\d+)/) && parseInt(RegExp.$1, 10) >= 31) ||
		// Double check webkit in userAgent just in case we are in a worker
		(typeof navigator !== 'undefined' && navigator.userAgent && navigator.userAgent.toLowerCase().match(/applewebkit\/(\d+)/));
}

/**
 * Colorize log arguments if enabled.
 *
 * @api public
 */

function formatArgs(args) {
	args[0] = (this.useColors ? '%c' : '') +
		this.namespace +
		(this.useColors ? ' %c' : ' ') +
		args[0] +
		(this.useColors ? '%c ' : ' ') +
		'+' + module.exports.humanize(this.diff);

	if (!this.useColors) {
		return;
	}

	const c = 'color: ' + this.color;
	args.splice(1, 0, c, 'color: inherit');

	// The final "%c" is somewhat tricky, because there could be other
	// arguments passed either before or after the %c, so we need to
	// figure out the correct index to insert the CSS into
	let index = 0;
	let lastC = 0;
	args[0].replace(/%[a-zA-Z%]/g, match => {
		if (match === '%%') {
			return;
		}
		index++;
		if (match === '%c') {
			// We only are interested in the *last* %c
			// (the user may have provided their own)
			lastC = index;
		}
	});

	args.splice(lastC, 0, c);
}

/**
 * Invokes `console.debug()` when available.
 * No-op when `console.debug` is not a "function".
 * If `console.debug` is not available, falls back
 * to `console.log`.
 *
 * @api public
 */
exports.log = console.debug || console.log || (() => {});

/**
 * Save `namespaces`.
 *
 * @param {String} namespaces
 * @api private
 */
function save(namespaces) {
	try {
		if (namespaces) {
			exports.storage.setItem('debug', namespaces);
		} else {
			exports.storage.removeItem('debug');
		}
	} catch (error) {
		// Swallow
		// XXX (@Qix-) should we be logging these?
	}
}

/**
 * Load `namespaces`.
 *
 * @return {String} returns the previously persisted debug modes
 * @api private
 */
function load() {
	let r;
	try {
		r = exports.storage.getItem('debug');
	} catch (error) {
		// Swallow
		// XXX (@Qix-) should we be logging these?
	}

	// If debug isn't set in LS, and we're in Electron, try to load $DEBUG
	if (!r && typeof process !== 'undefined' && 'env' in process) {
		r = process.env.DEBUG;
	}

	return r;
}

/**
 * Localstorage attempts to return the localstorage.
 *
 * This is necessary because safari throws
 * when a user disables cookies/localstorage
 * and you attempt to access it.
 *
 * @return {LocalStorage}
 * @api private
 */

function localstorage() {
	try {
		// TVMLKit (Apple TV JS Runtime) does not have a window object, just localStorage in the global context
		// The Browser also has localStorage in the global context.
		return localStorage;
	} catch (error) {
		// Swallow
		// XXX (@Qix-) should we be logging these?
	}
}

module.exports = __nccwpck_require__(6243)(exports);

const {formatters} = module.exports;

/**
 * Map %j to `JSON.stringify()`, since no Web Inspectors do that by default.
 */

formatters.j = function (v) {
	try {
		return JSON.stringify(v);
	} catch (error) {
		return '[UnexpectedJSONParseError]: ' + error.message;
	}
};


/***/ }),

/***/ 6243:
/***/ ((module, __unused_webpack_exports, __nccwpck_require__) => {


/**
 * This is the common logic for both the Node.js and web browser
 * implementations of `debug()`.
 */

function setup(env) {
	createDebug.debug = createDebug;
	createDebug.default = createDebug;
	createDebug.coerce = coerce;
	createDebug.disable = disable;
	createDebug.enable = enable;
	createDebug.enabled = enabled;
	createDebug.humanize = __nccwpck_require__(900);
	createDebug.destroy = destroy;

	Object.keys(env).forEach(key => {
		createDebug[key] = env[key];
	});

	/**
	* The currently active debug mode names, and names to skip.
	*/

	createDebug.names = [];
	createDebug.skips = [];

	/**
	* Map of special "%n" handling functions, for the debug "format" argument.
	*
	* Valid key names are a single, lower or upper-case letter, i.e. "n" and "N".
	*/
	createDebug.formatters = {};

	/**
	* Selects a color for a debug namespace
	* @param {String} namespace The namespace string for the debug instance to be colored
	* @return {Number|String} An ANSI color code for the given namespace
	* @api private
	*/
	function selectColor(namespace) {
		let hash = 0;

		for (let i = 0; i < namespace.length; i++) {
			hash = ((hash << 5) - hash) + namespace.charCodeAt(i);
			hash |= 0; // Convert to 32bit integer
		}

		return createDebug.colors[Math.abs(hash) % createDebug.colors.length];
	}
	createDebug.selectColor = selectColor;

	/**
	* Create a debugger with the given `namespace`.
	*
	* @param {String} namespace
	* @return {Function}
	* @api public
	*/
	function createDebug(namespace) {
		let prevTime;
		let enableOverride = null;
		let namespacesCache;
		let enabledCache;

		function debug(...args) {
			// Disabled?
			if (!debug.enabled) {
				return;
			}

			const self = debug;

			// Set `diff` timestamp
			const curr = Number(new Date());
			const ms = curr - (prevTime || curr);
			self.diff = ms;
			self.prev = prevTime;
			self.curr = curr;
			prevTime = curr;

			args[0] = createDebug.coerce(args[0]);

			if (typeof args[0] !== 'string') {
				// Anything else let's inspect with %O
				args.unshift('%O');
			}

			// Apply any `formatters` transformations
			let index = 0;
			args[0] = args[0].replace(/%([a-zA-Z%])/g, (match, format) => {
				// If we encounter an escaped % then don't increase the array index
				if (match === '%%') {
					return '%';
				}
				index++;
				const formatter = createDebug.formatters[format];
				if (typeof formatter === 'function') {
					const val = args[index];
					match = formatter.call(self, val);

					// Now we need to remove `args[index]` since it's inlined in the `format`
					args.splice(index, 1);
					index--;
				}
				return match;
			});

			// Apply env-specific formatting (colors, etc.)
			createDebug.formatArgs.call(self, args);

			const logFn = self.log || createDebug.log;
			logFn.apply(self, args);
		}

		debug.namespace = namespace;
		debug.useColors = createDebug.useColors();
		debug.color = createDebug.selectColor(namespace);
		debug.extend = extend;
		debug.destroy = createDebug.destroy; // XXX Temporary. Will be removed in the next major release.

		Object.defineProperty(debug, 'enabled', {
			enumerable: true,
			configurable: false,
			get: () => {
				if (enableOverride !== null) {
					return enableOverride;
				}
				if (namespacesCache !== createDebug.namespaces) {
					namespacesCache = createDebug.namespaces;
					enabledCache = createDebug.enabled(namespace);
				}

				return enabledCache;
			},
			set: v => {
				enableOverride = v;
			}
		});

		// Env-specific initialization logic for debug instances
		if (typeof createDebug.init === 'function') {
			createDebug.init(debug);
		}

		return debug;
	}

	function extend(namespace, delimiter) {
		const newDebug = createDebug(this.namespace + (typeof delimiter === 'undefined' ? ':' : delimiter) + namespace);
		newDebug.log = this.log;
		return newDebug;
	}

	/**
	* Enables a debug mode by namespaces. This can include modes
	* separated by a colon and wildcards.
	*
	* @param {String} namespaces
	* @api public
	*/
	function enable(namespaces) {
		createDebug.save(namespaces);
		createDebug.namespaces = namespaces;

		createDebug.names = [];
		createDebug.skips = [];

		let i;
		const split = (typeof namespaces === 'string' ? namespaces : '').split(/[\s,]+/);
		const len = split.length;

		for (i = 0; i < len; i++) {
			if (!split[i]) {
				// ignore empty strings
				continue;
			}

			namespaces = split[i].replace(/\*/g, '.*?');

			if (namespaces[0] === '-') {
				createDebug.skips.push(new RegExp('^' + namespaces.slice(1) + '$'));
			} else {
				createDebug.names.push(new RegExp('^' + namespaces + '$'));
			}
		}
	}

	/**
	* Disable debug output.
	*
	* @return {String} namespaces
	* @api public
	*/
	function disable() {
		const namespaces = [
			...createDebug.names.map(toNamespace),
			...createDebug.skips.map(toNamespace).map(namespace => '-' + namespace)
		].join(',');
		createDebug.enable('');
		return namespaces;
	}

	/**
	* Returns true if the given mode name is enabled, false otherwise.
	*
	* @param {String} name
	* @return {Boolean}
	* @api public
	*/
	function enabled(name) {
		if (name[name.length - 1] === '*') {
			return true;
		}

		let i;
		let len;

		for (i = 0, len = createDebug.skips.length; i < len; i++) {
			if (createDebug.skips[i].test(name)) {
				return false;
			}
		}

		for (i = 0, len = createDebug.names.length; i < len; i++) {
			if (createDebug.names[i].test(name)) {
				return true;
			}
		}

		return false;
	}

	/**
	* Convert regexp to namespace
	*
	* @param {RegExp} regxep
	* @return {String} namespace
	* @api private
	*/
	function toNamespace(regexp) {
		return regexp.toString()
			.substring(2, regexp.toString().length - 2)
			.replace(/\.\*\?$/, '*');
	}

	/**
	* Coerce `val`.
	*
	* @param {Mixed} val
	* @return {Mixed}
	* @api private
	*/
	function coerce(val) {
		if (val instanceof Error) {
			return val.stack || val.message;
		}
		return val;
	}

	/**
	* XXX DO NOT USE. This is a temporary stub function.
	* XXX It WILL be removed in the next major release.
	*/
	function destroy() {
		console.warn('Instance method `debug.destroy()` is deprecated and no longer does anything. It will be removed in the next major version of `debug`.');
	}

	createDebug.enable(createDebug.load());

	return createDebug;
}

module.exports = setup;


/***/ }),

/***/ 8237:
/***/ ((module, __unused_webpack_exports, __nccwpck_require__) => {

/**
 * Detect Electron renderer / nwjs process, which is node, but we should
 * treat as a browser.
 */

if (typeof process === 'undefined' || process.type === 'renderer' || process.browser === true || process.__nwjs) {
	module.exports = __nccwpck_require__(8222);
} else {
	module.exports = __nccwpck_require__(5332);
}


/***/ }),

/***/ 5332:
/***/ ((module, exports, __nccwpck_require__) => {

/**
 * Module dependencies.
 */

const tty = __nccwpck_require__(6224);
const util = __nccwpck_require__(3837);

/**
 * This is the Node.js implementation of `debug()`.
 */

exports.init = init;
exports.log = log;
exports.formatArgs = formatArgs;
exports.save = save;
exports.load = load;
exports.useColors = useColors;
exports.destroy = util.deprecate(
	() => {},
	'Instance method `debug.destroy()` is deprecated and no longer does anything. It will be removed in the next major version of `debug`.'
);

/**
 * Colors.
 */

exports.colors = [6, 2, 3, 4, 5, 1];

try {
	// Optional dependency (as in, doesn't need to be installed, NOT like optionalDependencies in package.json)
	// eslint-disable-next-line import/no-extraneous-dependencies
	const supportsColor = __nccwpck_require__(132);

	if (supportsColor && (supportsColor.stderr || supportsColor).level >= 2) {
		exports.colors = [
			20,
			21,
			26,
			27,
			32,
			33,
			38,
			39,
			40,
			41,
			42,
			43,
			44,
			45,
			56,
			57,
			62,
			63,
			68,
			69,
			74,
			75,
			76,
			77,
			78,
			79,
			80,
			81,
			92,
			93,
			98,
			99,
			112,
			113,
			128,
			129,
			134,
			135,
			148,
			149,
			160,
			161,
			162,
			163,
			164,
			165,
			166,
			167,
			168,
			169,
			170,
			171,
			172,
			173,
			178,
			179,
			184,
			185,
			196,
			197,
			198,
			199,
			200,
			201,
			202,
			203,
			204,
			205,
			206,
			207,
			208,
			209,
			214,
			215,
			220,
			221
		];
	}
} catch (error) {
	// Swallow - we only care if `supports-color` is available; it doesn't have to be.
}

/**
 * Build up the default `inspectOpts` object from the environment variables.
 *
 *   $ DEBUG_COLORS=no DEBUG_DEPTH=10 DEBUG_SHOW_HIDDEN=enabled node script.js
 */

exports.inspectOpts = Object.keys(process.env).filter(key => {
	return /^debug_/i.test(key);
}).reduce((obj, key) => {
	// Camel-case
	const prop = key
		.substring(6)
		.toLowerCase()
		.replace(/_([a-z])/g, (_, k) => {
			return k.toUpperCase();
		});

	// Coerce string value into JS value
	let val = process.env[key];
	if (/^(yes|on|true|enabled)$/i.test(val)) {
		val = true;
	} else if (/^(no|off|false|disabled)$/i.test(val)) {
		val = false;
	} else if (val === 'null') {
		val = null;
	} else {
		val = Number(val);
	}

	obj[prop] = val;
	return obj;
}, {});

/**
 * Is stdout a TTY? Colored output is enabled when `true`.
 */

function useColors() {
	return 'colors' in exports.inspectOpts ?
		Boolean(exports.inspectOpts.colors) :
		tty.isatty(process.stderr.fd);
}

/**
 * Adds ANSI color escape codes if enabled.
 *
 * @api public
 */

function formatArgs(args) {
	const {namespace: name, useColors} = this;

	if (useColors) {
		const c = this.color;
		const colorCode = '\u001B[3' + (c < 8 ? c : '8;5;' + c);
		const prefix = `  ${colorCode};1m${name} \u001B[0m`;

		args[0] = prefix + args[0].split('\n').join('\n' + prefix);
		args.push(colorCode + 'm+' + module.exports.humanize(this.diff) + '\u001B[0m');
	} else {
		args[0] = getDate() + name + ' ' + args[0];
	}
}

function getDate() {
	if (exports.inspectOpts.hideDate) {
		return '';
	}
	return new Date().toISOString() + ' ';
}

/**
 * Invokes `util.format()` with the specified arguments and writes to stderr.
 */

function log(...args) {
	return process.stderr.write(util.format(...args) + '\n');
}

/**
 * Save `namespaces`.
 *
 * @param {String} namespaces
 * @api private
 */
function save(namespaces) {
	if (namespaces) {
		process.env.DEBUG = namespaces;
	} else {
		// If you set a process.env field to null or undefined, it gets cast to the
		// string 'null' or 'undefined'. Just delete instead.
		delete process.env.DEBUG;
	}
}

/**
 * Load `namespaces`.
 *
 * @return {String} returns the previously persisted debug modes
 * @api private
 */

function load() {
	return process.env.DEBUG;
}

/**
 * Init logic for `debug` instances.
 *
 * Create a new `inspectOpts` object in case `useColors` is set
 * differently for a particular `debug` instance.
 */

function init(debug) {
	debug.inspectOpts = {};

	const keys = Object.keys(exports.inspectOpts);
	for (let i = 0; i < keys.length; i++) {
		debug.inspectOpts[keys[i]] = exports.inspectOpts[keys[i]];
	}
}

module.exports = __nccwpck_require__(6243)(exports);

const {formatters} = module.exports;

/**
 * Map %o to `util.inspect()`, all on a single line.
 */

formatters.o = function (v) {
	this.inspectOpts.colors = this.useColors;
	return util.inspect(v, this.inspectOpts)
		.split('\n')
		.map(str => str.trim())
		.join(' ');
};

/**
 * Map %O to `util.inspect()`, allowing multiple lines if needed.
 */

formatters.O = function (v) {
	this.inspectOpts.colors = this.useColors;
	return util.inspect(v, this.inspectOpts);
};


/***/ }),

/***/ 6599:
/***/ ((module, __unused_webpack_exports, __nccwpck_require__) => {

var stream = __nccwpck_require__(1642)
var eos = __nccwpck_require__(1205)
var inherits = __nccwpck_require__(4124)
var shift = __nccwpck_require__(6121)

var SIGNAL_FLUSH = (Buffer.from && Buffer.from !== Uint8Array.from)
  ? Buffer.from([0])
  : new Buffer([0])

var onuncork = function(self, fn) {
  if (self._corked) self.once('uncork', fn)
  else fn()
}

var autoDestroy = function (self, err) {
  if (self._autoDestroy) self.destroy(err)
}

var destroyer = function(self, end) {
  return function(err) {
    if (err) autoDestroy(self, err.message === 'premature close' ? null : err)
    else if (end && !self._ended) self.end()
  }
}

var end = function(ws, fn) {
  if (!ws) return fn()
  if (ws._writableState && ws._writableState.finished) return fn()
  if (ws._writableState) return ws.end(fn)
  ws.end()
  fn()
}

var noop = function() {}

var toStreams2 = function(rs) {
  return new (stream.Readable)({objectMode:true, highWaterMark:16}).wrap(rs)
}

var Duplexify = function(writable, readable, opts) {
  if (!(this instanceof Duplexify)) return new Duplexify(writable, readable, opts)
  stream.Duplex.call(this, opts)

  this._writable = null
  this._readable = null
  this._readable2 = null

  this._autoDestroy = !opts || opts.autoDestroy !== false
  this._forwardDestroy = !opts || opts.destroy !== false
  this._forwardEnd = !opts || opts.end !== false
  this._corked = 1 // start corked
  this._ondrain = null
  this._drained = false
  this._forwarding = false
  this._unwrite = null
  this._unread = null
  this._ended = false

  this.destroyed = false

  if (writable) this.setWritable(writable)
  if (readable) this.setReadable(readable)
}

inherits(Duplexify, stream.Duplex)

Duplexify.obj = function(writable, readable, opts) {
  if (!opts) opts = {}
  opts.objectMode = true
  opts.highWaterMark = 16
  return new Duplexify(writable, readable, opts)
}

Duplexify.prototype.cork = function() {
  if (++this._corked === 1) this.emit('cork')
}

Duplexify.prototype.uncork = function() {
  if (this._corked && --this._corked === 0) this.emit('uncork')
}

Duplexify.prototype.setWritable = function(writable) {
  if (this._unwrite) this._unwrite()

  if (this.destroyed) {
    if (writable && writable.destroy) writable.destroy()
    return
  }

  if (writable === null || writable === false) {
    this.end()
    return
  }

  var self = this
  var unend = eos(writable, {writable:true, readable:false}, destroyer(this, this._forwardEnd))

  var ondrain = function() {
    var ondrain = self._ondrain
    self._ondrain = null
    if (ondrain) ondrain()
  }

  var clear = function() {
    self._writable.removeListener('drain', ondrain)
    unend()
  }

  if (this._unwrite) process.nextTick(ondrain) // force a drain on stream reset to avoid livelocks

  this._writable = writable
  this._writable.on('drain', ondrain)
  this._unwrite = clear

  this.uncork() // always uncork setWritable
}

Duplexify.prototype.setReadable = function(readable) {
  if (this._unread) this._unread()

  if (this.destroyed) {
    if (readable && readable.destroy) readable.destroy()
    return
  }

  if (readable === null || readable === false) {
    this.push(null)
    this.resume()
    return
  }

  var self = this
  var unend = eos(readable, {writable:false, readable:true}, destroyer(this))

  var onreadable = function() {
    self._forward()
  }

  var onend = function() {
    self.push(null)
  }

  var clear = function() {
    self._readable2.removeListener('readable', onreadable)
    self._readable2.removeListener('end', onend)
    unend()
  }

  this._drained = true
  this._readable = readable
  this._readable2 = readable._readableState ? readable : toStreams2(readable)
  this._readable2.on('readable', onreadable)
  this._readable2.on('end', onend)
  this._unread = clear

  this._forward()
}

Duplexify.prototype._read = function() {
  this._drained = true
  this._forward()
}

Duplexify.prototype._forward = function() {
  if (this._forwarding || !this._readable2 || !this._drained) return
  this._forwarding = true

  var data

  while (this._drained && (data = shift(this._readable2)) !== null) {
    if (this.destroyed) continue
    this._drained = this.push(data)
  }

  this._forwarding = false
}

Duplexify.prototype.destroy = function(err, cb) {
  if (!cb) cb = noop
  if (this.destroyed) return cb(null)
  this.destroyed = true

  var self = this
  process.nextTick(function() {
    self._destroy(err)
    cb(null)
  })
}

Duplexify.prototype._destroy = function(err) {
  if (err) {
    var ondrain = this._ondrain
    this._ondrain = null
    if (ondrain) ondrain(err)
    else this.emit('error', err)
  }

  if (this._forwardDestroy) {
    if (this._readable && this._readable.destroy) this._readable.destroy()
    if (this._writable && this._writable.destroy) this._writable.destroy()
  }

  this.emit('close')
}

Duplexify.prototype._write = function(data, enc, cb) {
  if (this.destroyed) return
  if (this._corked) return onuncork(this, this._write.bind(this, data, enc, cb))
  if (data === SIGNAL_FLUSH) return this._finish(cb)
  if (!this._writable) return cb()

  if (this._writable.write(data) === false) this._ondrain = cb
  else if (!this.destroyed) cb()
}

Duplexify.prototype._finish = function(cb) {
  var self = this
  this.emit('preend')
  onuncork(this, function() {
    end(self._forwardEnd && self._writable, function() {
      // haxx to not emit prefinish twice
      if (self._writableState.prefinished === false) self._writableState.prefinished = true
      self.emit('prefinish')
      onuncork(self, cb)
    })
  })
}

Duplexify.prototype.end = function(data, enc, cb) {
  if (typeof data === 'function') return this.end(null, null, data)
  if (typeof enc === 'function') return this.end(data, null, enc)
  this._ended = true
  if (data) this.write(data)
  if (!this._writableState.ending && !this._writableState.destroyed) this.write(SIGNAL_FLUSH)
  return stream.Writable.prototype.end.call(this, cb)
}

module.exports = Duplexify


/***/ }),

/***/ 1205:
/***/ ((module, __unused_webpack_exports, __nccwpck_require__) => {

var once = __nccwpck_require__(1223);

var noop = function() {};

var isRequest = function(stream) {
	return stream.setHeader && typeof stream.abort === 'function';
};

var isChildProcess = function(stream) {
	return stream.stdio && Array.isArray(stream.stdio) && stream.stdio.length === 3
};

var eos = function(stream, opts, callback) {
	if (typeof opts === 'function') return eos(stream, null, opts);
	if (!opts) opts = {};

	callback = once(callback || noop);

	var ws = stream._writableState;
	var rs = stream._readableState;
	var readable = opts.readable || (opts.readable !== false && stream.readable);
	var writable = opts.writable || (opts.writable !== false && stream.writable);
	var cancelled = false;

	var onlegacyfinish = function() {
		if (!stream.writable) onfinish();
	};

	var onfinish = function() {
		writable = false;
		if (!readable) callback.call(stream);
	};

	var onend = function() {
		readable = false;
		if (!writable) callback.call(stream);
	};

	var onexit = function(exitCode) {
		callback.call(stream, exitCode ? new Error('exited with error code: ' + exitCode) : null);
	};

	var onerror = function(err) {
		callback.call(stream, err);
	};

	var onclose = function() {
		process.nextTick(onclosenexttick);
	};

	var onclosenexttick = function() {
		if (cancelled) return;
		if (readable && !(rs && (rs.ended && !rs.destroyed))) return callback.call(stream, new Error('premature close'));
		if (writable && !(ws && (ws.ended && !ws.destroyed))) return callback.call(stream, new Error('premature close'));
	};

	var onrequest = function() {
		stream.req.on('finish', onfinish);
	};

	if (isRequest(stream)) {
		stream.on('complete', onfinish);
		stream.on('abort', onclose);
		if (stream.req) onrequest();
		else stream.on('request', onrequest);
	} else if (writable && !ws) { // legacy streams
		stream.on('end', onlegacyfinish);
		stream.on('close', onlegacyfinish);
	}

	if (isChildProcess(stream)) stream.on('exit', onexit);

	stream.on('end', onend);
	stream.on('finish', onfinish);
	if (opts.error !== false) stream.on('error', onerror);
	stream.on('close', onclose);

	return function() {
		cancelled = true;
		stream.removeListener('complete', onfinish);
		stream.removeListener('abort', onclose);
		stream.removeListener('request', onrequest);
		if (stream.req) stream.req.removeListener('finish', onfinish);
		stream.removeListener('end', onlegacyfinish);
		stream.removeListener('close', onlegacyfinish);
		stream.removeListener('finish', onfinish);
		stream.removeListener('exit', onexit);
		stream.removeListener('end', onend);
		stream.removeListener('error', onerror);
		stream.removeListener('close', onclose);
	};
};

module.exports = eos;


/***/ }),

/***/ 8670:
/***/ ((__unused_webpack_module, exports) => {

"use strict";

Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.ExponentialBackoff = void 0;
/**
 * Exponential Backoff
 * @see https://en.wikipedia.org/wiki/Exponential_backoff
 */
class ExponentialBackoff {
    /**
     * Creates a new exponential backoff strategy.
     * @see https://en.wikipedia.org/wiki/Exponential_backoff
     * @param options
     */
    constructor(options) {
        this.options = options;
        this._counter = 0;
    }
    /**
     * @inheritDoc
     */
    getDelay() {
        const count = this._counter - Math.round(Math.random() * this.options.random); // Tslint:disable-line
        return Math.min(this.options.max, this.options.initial * Math.pow(2, Math.max(count, 0)));
    }
    /**
     * @inheritDoc
     */
    next() {
        const next = new ExponentialBackoff(this.options);
        next._counter = this._counter + 1;
        return next;
    }
    /**
     * @inheritDoc
     */
    reset() {
        return new ExponentialBackoff(this.options);
    }
}
exports.ExponentialBackoff = ExponentialBackoff;


/***/ }),

/***/ 2512:
/***/ ((__unused_webpack_module, exports, __nccwpck_require__) => {

"use strict";

Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.parseWhere = exports.parseMeasurement = exports.Measurement = exports.Expression = void 0;
const grammar_1 = __nccwpck_require__(2309);
function regexHasFlags(re) {
    if (typeof re.flags !== "undefined") {
        return re.flags.length > 0;
    }
    return !re.toString().endsWith("/");
}
/**
 * Expression is used to build filtering expressions, like those used in WHERE
 * clauses. It can be used for fluent and safe building of queries using
 * untrusted input.
 *
 * @example
 * e => e
 *   .field('host').equals.value('ares.peet.io')
 *   .or
 *   .field('host').matches(/example\.com$/)
 *   .or
 *   .expr(e => e
 *     .field('country').equals.value('US')
 *     .and
 *     .field('state').equals.value('WA'));
 *
 * // Generates:
 * // "host" = 'ares.peet.io' OR "host" ~= /example\.com$/ OR \
 * //   ("county" = 'US' AND "state" = 'WA')
 */
class Expression {
    constructor() {
        this._query = [];
    }
    /**
     * Inserts a tag reference into the expression; the name will be
     * automatically escaped.
     * @param name
     * @return
     */
    tag(name) {
        this.field(name);
        return this;
    }
    /**
     * Inserts a field reference into the expression; the name will be
     * automatically escaped.
     * @param name
     * @return
     */
    field(name) {
        this._query.push(grammar_1.escape.quoted(name));
        return this;
    }
    /**
     * Inserts a subexpression; invokes the function with a new expression
     * that can be chained on.
     * @param fn
     * @return
     * @example
     * e.field('a').equals.value('b')
     *   .or.expr(e =>
     *     e.field('b').equals.value('b')
     *     .and.field('a').equals.value('c'))
     *   .toString()
     * // "a" = 'b' OR ("b" = 'b' AND "a" = 'c')
     */
    exp(fn) {
        this._query.push("(" + fn(new Expression()).toString() + ")");
        return this;
    }
    /**
     * Value chains on a value to the expression.
     *
     *  - Numbers will be inserted verbatim
     *  - Strings will be escaped and inserted
     *  - Booleans will be inserted correctly
     *  - Dates will be formatted and inserted correctly, including INanoDates.
     *  - Regular expressions will be inserted correctly, however an error will
     *    be thrown if they contain flags, as regex flags do not work in Influx
     *  - Otherwise we'll try to call `.toString()` on the value, throwing
     *    if we cannot do so.
     *
     * @param value
     * @return
     */
    value(value) {
        switch (typeof value) {
            case "number":
                this._query.push(value.toString());
                return this;
            case "string":
                this._query.push(grammar_1.escape.stringLit(value));
                return this;
            case "boolean":
                this._query.push(value ? "TRUE" : "FALSE");
                return this;
            default:
                if (value instanceof Date) {
                    this._query.push(grammar_1.formatDate(value));
                    return this;
                }
                if (value instanceof RegExp) {
                    if (regexHasFlags(value)) {
                        throw new Error("Attempted to query using a regex with flags, " +
                            "but Influx doesn't support flags in queries.");
                    }
                    this._query.push("/" + value.source + "/");
                    return this;
                }
                if (value && typeof value.toString === "function") {
                    this._query.push(value.toString());
                    return this;
                }
                throw new Error("node-influx doesn't know how to encode the provided value into a " +
                    "query. If you think this is a bug, open an issue here: https://git.io/influx-err");
        }
    }
    /**
     * Chains on an AND clause to the expression.
     */
    get and() {
        this._query.push("AND");
        return this;
    }
    /**
     * Chains on an OR clause to the expression.
     */
    get or() {
        this._query.push("OR");
        return this;
    }
    /**
     * Chains on a `+` operator to the expression.
     */
    get plus() {
        this._query.push("+");
        return this;
    }
    /**
     * Chains on a `*` operator to the expression.
     */
    get times() {
        this._query.push("*");
        return this;
    }
    /**
     * Chains on a `-` operator to the expression.
     */
    get minus() {
        this._query.push("-");
        return this;
    }
    /**
     * Chains on a `/` operator to the expression.
     */
    get div() {
        this._query.push("/");
        return this;
    }
    /**
     * Chains on a `=` conditional to the expression.
     */
    get equals() {
        this._query.push("=");
        return this;
    }
    /**
     * Chains on a `=~` conditional to the expression to match regexes.
     */
    get matches() {
        this._query.push("=~");
        return this;
    }
    /**
     * Chains on a `!`` conditional to the expression to match regexes.
     */
    get doesntMatch() {
        this._query.push("!~");
        return this;
    }
    /**
     * Chains on a `!=` conditional to the expression.
     */
    get notEqual() {
        this._query.push("!=");
        return this;
    }
    /**
     * Chains on a `>` conditional to the expression.
     */
    get gt() {
        this._query.push(">");
        return this;
    }
    /**
     * Chains on a `>=` conditional to the expression.
     */
    get gte() {
        this._query.push(">=");
        return this;
    }
    /**
     * Chains on a `<` conditional to the expression.
     */
    get lt() {
        this._query.push("<");
        return this;
    }
    /**
     * Chains on a `<=` conditional to the expression.
     */
    get lte() {
        this._query.push("<=");
        return this;
    }
    /**
     * Converts the expression into its InfluxQL representation.
     * @return
     */
    toString() {
        return this._query.join(" ");
    }
}
exports.Expression = Expression;
/**
 * Measurement creates a reference to a particular measurement. You can
 * reference it solely by its name, but you can also specify the retention
 * policy and database it lives under.
 *
 * @example
 * m.name('my_measurement') // "my_measurement"
 * m.name('my_measurement').policy('one_day') // "one_day"."my_measurement"
 * m.name('my_measurement').policy('one_day').db('mydb') // "mydb"."one_day"."my_measurement"
 */
class Measurement {
    constructor() {
        this._parts = [null, null, null];
    }
    /**
     * Sets the measurement name.
     * @param name
     * @return
     */
    name(name) {
        this._parts[2] = name;
        return this;
    }
    /**
     * Sets the retention policy name.
     * @param retentionPolicy
     * @return
     */
    policy(retentionPolicy) {
        this._parts[1] = retentionPolicy;
        return this;
    }
    /**
     * Sets the database name.
     * @param db
     * @return
     */
    db(db) {
        this._parts[0] = db;
        return this;
    }
    /**
     * Converts the measurement into its InfluxQL representation.
     * @return
     * @throws {Error} if a measurement name is not provided
     */
    toString() {
        if (!this._parts[2]) {
            throw new Error(`You must specify a measurement name to query! Got \`${this._parts[2]}\``);
        }
        return this._parts
            .filter((p) => Boolean(p))
            .map((p) => grammar_1.escape.quoted(p))
            .join(".");
    }
}
exports.Measurement = Measurement;
function parseMeasurement(q) {
    if (typeof q.measurement === "function") {
        return q.measurement(new Measurement()).toString();
    }
    return q.measurement;
}
exports.parseMeasurement = parseMeasurement;
function parseWhere(q) {
    if (typeof q.where === "function") {
        return q.where(new Expression()).toString();
    }
    return q.where;
}
exports.parseWhere = parseWhere;


/***/ }),

/***/ 6085:
/***/ ((__unused_webpack_module, exports) => {

"use strict";

Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.Raw = exports.isNumeric = exports.FieldType = void 0;
/**
 * FieldType is an enumeration of InfluxDB field data types.
 * @typedef {Number} FieldType
 * @example
 * import { FieldType } from 'influx'; // or const FieldType = require('influx').FieldType
 *
 * const schema = {
 *   measurement: 'my_measurement',
 *   fields: {
 *     my_int: FieldType.INTEGER,
 *     my_float: FieldType.FLOAT,
 *     my_string: FieldType.STRING,
 *     my_boolean: FieldType.BOOLEAN,
 *   }
 * }
 */
var FieldType;
(function (FieldType) {
    FieldType[FieldType["FLOAT"] = 0] = "FLOAT";
    FieldType[FieldType["INTEGER"] = 1] = "INTEGER";
    FieldType[FieldType["STRING"] = 2] = "STRING";
    FieldType[FieldType["BOOLEAN"] = 3] = "BOOLEAN";
})(FieldType = exports.FieldType || (exports.FieldType = {}));
function isNumeric(value) {
    return !Number.isNaN(Number(value));
}
exports.isNumeric = isNumeric;
/**
 * You can provide Raw values to Influx methods to prevent it from escaping
 * your provided string.
 * @class
 * @example
 * influx.createDatabase(new Influx.Raw('This won\'t be escaped!'));
 */
class Raw {
    /**
     * Wraps a string so that it is not escaped in Influx queries.
     * @param value
     * @example
     * influx.createDatabase(new Influx.Raw('This won\'t be escaped!'));
     */
    constructor(value) {
        this.value = value;
    }
    /**
     * Returns the wrapped string.
     * @return
     */
    getValue() {
        return this.value;
    }
}
exports.Raw = Raw;


/***/ }),

/***/ 9865:
/***/ ((__unused_webpack_module, exports, __nccwpck_require__) => {

"use strict";

Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.escape = void 0;
const ds_1 = __nccwpck_require__(6085);
const reEscape = /[-|\\{()[\]^$+*?.]/g;
/**
 * The Escaper escapes the special characters in the provided list
 * with backslashes. Much of the code here is inspired by that in the
 * sqlstring packet found here: https://github.com/mysqljs/sqlstring
 *
 * Instances of the Escaper are derived from the documentation of escape
 * sequences found here: https://aka.ms/co1m4k
 *
 * sqlstring is made available under the following license:
 *
 *   Copyright (c) 2012 Felix Geisendörfer (felix@debuggable.com) and contributors
 *
 *   Permission is hereby granted, free of charge, to any person obtaining a copy
 *   of this software and associated documentation files (the "Software"), to deal
 *   in the Software without restriction, including without limitation the rights
 *   to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 *   copies of the Software, and to permit persons to whom the Software is
 *   furnished to do so, subject to the following conditions:
 *
 *   The above copyright notice and this permission notice shall be included in
 *   all copies or substantial portions of the Software.
 *
 *   THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 *   IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 *   FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 *   AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 *   LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 *   OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 *   THE SOFTWARE.
 *
 */
class Escaper {
    constructor(chars, wrap = "", escaper = "\\") {
        this.wrap = wrap;
        this.escaper = escaper;
        const patterns = chars.join("").replace(reEscape, "\\$&");
        this._re = new RegExp("[" + patterns + "]", "g");
    }
    /**
     * Escape replaces occurrences of special characters within the target
     * string with the necessary escape codes.
     */
    escape(val) {
        if (val instanceof ds_1.Raw) {
            return val.getValue();
        }
        this._re.lastIndex = 0;
        let chunkIndex = this._re.lastIndex;
        let escapedVal = "";
        let match;
        if (typeof val === "string") {
            val = val.replace(/\\'/, "\\\\'");
        }
        /* eslint-disable no-cond-assign */
        while ((match = this._re.exec(val))) {
            escapedVal +=
                val.slice(chunkIndex, match.index) + this.escaper + match[0];
            chunkIndex = this._re.lastIndex;
        }
        if (chunkIndex === 0) {
            return this.wrap + val + this.wrap;
        }
        if (chunkIndex < val.length) {
            return this.wrap + escapedVal + val.slice(chunkIndex) + this.wrap;
        }
        return this.wrap + escapedVal + this.wrap;
    }
}
const bindEsc = (e) => e.escape.bind(e);
/**
 * TagEscaper escapes tag keys, tag values, and field keys.
 * @type {Object}
 * @property {function(s: string): string } quoted Escapes and wraps quoted
 *     values, such as database names.
 * @property {function(s: string): string } stringLit Escapes and
 *     wraps string literals.
 * @property {function(s: string): string } measurement Escapes measurement
 *     names on the line protocol.
 * @property {function(s: string): string } tag Escapes tag keys, take values,
 *     and field keys on the line protocol.
 *
 * @example
 * console.log(escape.quoted('my_"db')); // => "my_\"db"
 * console.log(escape.stringLit('hello\'world')); // => 'hello\'world'
 *
 * console.log(escape.measurement('my measurement')); // => my\ measurement
 * console.log(escape.tag('my tag=')); // => my\ tag\=
 */
exports.escape = {
    /**
     * Measurement escapes measurement names.
     */
    measurement: bindEsc(new Escaper([",", " "])),
    /**
     * Quoted escapes quoted values, such as database names.
     */
    quoted: bindEsc(new Escaper(['"', "\\\\"], '"')),
    /**
     * StringLitEscaper escapes single quotes in string literals.
     */
    stringLit: bindEsc(new Escaper(["'"], "'")),
    /**
     * TagEscaper escapes tag keys, tag values, and field keys.
     */
    tag: bindEsc(new Escaper([",", "=", " "])),
};


/***/ }),

/***/ 2309:
/***/ (function(__unused_webpack_module, exports, __nccwpck_require__) {

"use strict";

var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", ({ value: true }));
__exportStar(__nccwpck_require__(9865), exports);
__exportStar(__nccwpck_require__(6085), exports);
__exportStar(__nccwpck_require__(4430), exports);


/***/ }),

/***/ 4430:
/***/ ((__unused_webpack_module, exports, __nccwpck_require__) => {

"use strict";

/* eslint-disable no-fallthrough */
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.castTimestamp = exports.isoOrTimeToDate = exports.dateToTime = exports.formatDate = exports.toNanoDate = exports.Precision = void 0;
const ds_1 = __nccwpck_require__(6085);
/**
 * Just a quick overview of what's going on in this file. It's a bit of a mess.
 * Influx uses three time formats:
 *  - ISO times with nanoseconds when querying where an epoch is not provided
 *  - Unix timestamps when querying with an epoch (specifying the precision
 *    in the given time unit)
 *  - Its own time format for time literals.
 *
 * To complicate matters, Influx operates on nanosecond precisions
 * by default, but we can't represent nanosecond timestamps in
 * JavaScript numbers as they're 64 bit uints.
 *
 * As a result we have several utilities to convert between these different
 * formats. When precision is required, we represent nanosecond timestamps
 * as strings and wrap default dates in the INanoDate interface which
 * lets the consumer read and write these more precise timestamps.
 *
 * Representing the timestamps as strings is definitely not a pure way to go
 * about it, but importing an arbitrary-precision integer library adds
 * bloat and is a massive hit to throughput. The operations we do do
 * are pretty trivial, so we stick with manipulating strings
 * and make sure to wash our hands when we're done.
 *
 * Vocabulary:
 *  Unix timestamp   = 'timestamp', abbreviated as 'time'
 *  ISO timestamp    = 'ISO time', abbreviated as 'ISO'
 *  Influx timestamp = 'Influx time', abbreviated as 'Influx'
 */
function leftPad(str, length, pad = "0") {
    if (typeof str === "number") {
        str = String(str);
    }
    while (str.length < length) {
        str = pad + str;
    }
    return str;
}
function rightPad(str, length, pad = "0") {
    if (typeof str === "number") {
        str = String(str);
    }
    while (str.length < length) {
        str += pad;
    }
    return str;
}
/**
 * Precision is a map of available Influx time precisions.
 * @type {Object.<String, String>}
 * @example
 * console.log(Precision.Hours); // => 'h'
 * console.log(Precision.Minutes); // => 'm'
 * console.log(Precision.Seconds); // => 's'
 * console.log(Precision.Milliseconds); // => 'ms'
 * console.log(Precision.Microseconds); // => 'u'
 * console.log(Precision.Nanoseconds); // => 'n'
 */
exports.Precision = Object.freeze({
    // Tslint:disable-line
    Hours: "h",
    Microseconds: "u",
    Milliseconds: "ms",
    Minutes: "m",
    Nanoseconds: "n",
    Seconds: "s",
});
class MillisecondDateManipulator {
    format(date) {
        return ('"' +
            leftPad(date.getUTCFullYear(), 2) +
            "-" +
            leftPad(date.getUTCMonth() + 1, 2) +
            "-" +
            leftPad(date.getUTCDate(), 2) +
            " " +
            leftPad(date.getUTCHours(), 2) +
            ":" +
            leftPad(date.getUTCMinutes(), 2) +
            ":" +
            leftPad(date.getUTCSeconds(), 2) +
            "." +
            leftPad(date.getUTCMilliseconds(), 3) +
            '"');
    }
    toTime(date, precision) {
        let ms = date.getTime();
        switch (precision) {
            case "n":
                ms *= 1000;
            case "u":
                ms *= 1000;
            case "ms":
                return String(ms);
            case "h":
                ms /= 60;
            case "m":
                ms /= 60;
            case "s":
                ms /= 1000;
                return String(Math.floor(ms));
            default:
                throw new Error(`Unknown precision '${precision}'!`);
        }
    }
    isoToDate(timestamp) {
        return new Date(timestamp);
    }
    timetoDate(timestamp, precision) {
        switch (precision) {
            case "n":
                timestamp /= 1000;
            case "u":
                timestamp /= 1000;
            case "ms":
                return new Date(timestamp);
            case "h":
                timestamp *= 60;
            case "m":
                timestamp *= 60;
            case "s":
                timestamp *= 1000;
                return new Date(timestamp);
            default:
                throw new Error(`Unknown precision '${precision}'!`);
        }
    }
}
const nsPer = {
    ms: Math.pow(10, 6),
    s: Math.pow(10, 9),
};
function nanoIsoToTime(iso) {
    let [secondsStr, decimalStr] = iso.split(".");
    if (decimalStr === undefined) {
        decimalStr = "000000000";
    }
    else {
        decimalStr = rightPad(decimalStr.slice(0, -1), 9);
        secondsStr += "Z";
    }
    const seconds = Math.floor(new Date(secondsStr).getTime() / 1000);
    return `${seconds}${decimalStr}`;
}
const nanoDateMethods = {
    getNanoTimeFromISO() {
        if (!this._cachedNanoISO) {
            this._cachedNanoTime = nanoIsoToTime(this._nanoISO);
        }
        return this._cachedNanoTime;
    },
    toNanoISOStringFromISO() {
        if (!this._cachedNanoISO) {
            this._cachedNanoTime = nanoIsoToTime(this._nanoISO);
        }
        const base = this.toISOString().slice(0, -4); // Slice of `123Z` milliseconds
        return `${base}${this._cachedNanoTime.slice(-9)}Z`;
    },
    getNanoTimeFromStamp() {
        return this._nanoTime;
    },
    toNanoISOStringFromStamp() {
        const base = this.toISOString().slice(0, -4); // Slice of `123Z` milliseconds
        return `${base}${this._nanoTime.slice(-9)}Z`;
    },
};
/**
 * Covers a nanoseconds unix timestamp to a INanoDate for node-influx. The
 * timestamp is provided as a string to prevent precision loss.
 *
 * Please see [A Moment for Times](https://node-influx.github.io/manual/
 * usage.html#a-moment-for-times) for a more complete and eloquent explanation
 * of time handling in this module.
 *
 * @param timestamp
 * @example
 * const date = toNanoDate('1475985480231035600')
 *
 * // You can use the returned Date as a normal date:
 * expect(date.getTime()).to.equal(1475985480231);
 *
 * // We decorate it with two additional methods to read
 * // nanosecond-precision results:
 * expect(date.getNanoTime()).to.equal('1475985480231035600');
 * expect(date.toNanoISOString()).to.equal('2016-10-09T03:58:00.231035600Z');
 */
function toNanoDate(timestamp) {
    const secs = Math.floor(Number(timestamp) / nsPer.s);
    const remainingNs = timestamp.slice(String(secs).length);
    const remainingMs = Number(remainingNs) / nsPer.ms;
    const date = new Date(0);
    date.setUTCSeconds(secs, remainingMs);
    date._nanoTime = timestamp;
    date.getNanoTime = nanoDateMethods.getNanoTimeFromStamp;
    date.toNanoISOString = nanoDateMethods.toNanoISOStringFromStamp;
    return date;
}
exports.toNanoDate = toNanoDate;
function asNanoDate(date) {
    const d = date;
    if (d.getNanoTime) {
        return d;
    }
    return undefined;
}
class NanosecondsDateManipulator {
    format(date) {
        return ('"' +
            leftPad(date.getUTCFullYear(), 2) +
            "-" +
            leftPad(date.getUTCMonth() + 1, 2) +
            "-" +
            leftPad(date.getUTCDate(), 2) +
            " " +
            leftPad(date.getUTCHours(), 2) +
            ":" +
            leftPad(date.getUTCMinutes(), 2) +
            ":" +
            leftPad(date.getUTCSeconds(), 2) +
            "." +
            date.getNanoTime().slice(-9) +
            '"');
    }
    toTime(date, precision) {
        let ms = date.getTime();
        switch (precision) {
            case "u":
                return date.getNanoTime().slice(0, -3);
            case "n":
                return date.getNanoTime();
            case "h":
                ms /= 60;
            case "m":
                ms /= 60;
            case "s":
                ms /= 1000;
            case "ms":
                return String(Math.floor(ms));
            default:
                throw new Error(`Unknown precision '${precision}'!`);
        }
    }
    isoToDate(timestamp) {
        const date = new Date(timestamp);
        date._nanoISO = timestamp;
        date.getNanoTime = nanoDateMethods.getNanoTimeFromISO;
        date.toNanoISOString = nanoDateMethods.toNanoISOStringFromISO;
        return date;
    }
    timetoDate(timestamp, precision) {
        switch (precision) {
            case "h":
                timestamp *= 60;
            case "m":
                timestamp *= 60;
            case "s":
                timestamp *= 1000;
            case "ms":
                timestamp *= 1000;
            case "u":
                timestamp *= 1000;
            case "n": {
                const date = new Date(timestamp / nsPer.ms);
                date._nanoTime = String(timestamp);
                date.getNanoTime = nanoDateMethods.getNanoTimeFromStamp;
                date.toNanoISOString = nanoDateMethods.toNanoISOStringFromStamp;
                return date;
            }
            default:
                throw new Error(`Unknown precision '${precision}'!`);
        }
    }
}
const milliManipulator = new MillisecondDateManipulator();
const nanoManipulator = new NanosecondsDateManipulator();
/**
 * FormatDate converts the Date instance to Influx's date query format.
 * @private
 */
function formatDate(date) {
    const nano = asNanoDate(date);
    if (nano) {
        return nanoManipulator.format(nano);
    }
    return milliManipulator.format(date);
}
exports.formatDate = formatDate;
/**
 * Converts a Date instance to a timestamp with the specified time precision.
 * @private
 */
function dateToTime(date, precision) {
    const nano = asNanoDate(date);
    if (nano) {
        return nanoManipulator.toTime(nano, precision);
    }
    return milliManipulator.toTime(date, precision);
}
exports.dateToTime = dateToTime;
/**
 * Converts an ISO-formatted data or unix timestamp to a Date instance. If
 * the precision is finer than 'ms' the returned value will be a INanoDate.
 * @private
 */
function isoOrTimeToDate(stamp, precision = "n") {
    if (typeof stamp === "string") {
        return nanoManipulator.isoToDate(stamp);
    }
    return nanoManipulator.timetoDate(stamp, precision);
}
exports.isoOrTimeToDate = isoOrTimeToDate;
/**
 * Converts a timestamp to a string with the correct precision. Assumes
 * that raw number and string instances are already in the correct precision.
 * @private
 */
function castTimestamp(timestamp, precision) {
    if (typeof timestamp === "string") {
        if (!ds_1.isNumeric(timestamp)) {
            throw new Error(`Expected numeric value for, timestamp, but got '${timestamp}'!`);
        }
        return timestamp;
    }
    if (typeof timestamp === "number") {
        return String(timestamp);
    }
    return dateToTime(timestamp, precision);
}
exports.castTimestamp = castTimestamp;


/***/ }),

/***/ 2842:
/***/ ((__unused_webpack_module, exports, __nccwpck_require__) => {

"use strict";

Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.Host = void 0;
const urlModule = __nccwpck_require__(7310);
class Host {
    /**
     * Creates a new Host instance.
     * @param url
     * @param backoff
     */
    constructor(url, backoff, options) {
        this.backoff = backoff;
        this.options = options;
        this.url = urlModule.parse(url);
    }
    /**
     * Marks a failure on the host and returns the length of time it
     * should be removed from the pool
     * @return removal time in milliseconds
     */
    fail() {
        const value = this.backoff.getDelay();
        this.backoff = this.backoff.next();
        return value;
    }
    /**
     * Should be called when a successful operation is run against the host.
     * It resets the host's backoff strategy.
     */
    success() {
        this.backoff = this.backoff.reset();
    }
}
exports.Host = Host;


/***/ }),

/***/ 2059:
/***/ (function(__unused_webpack_module, exports, __nccwpck_require__) {

"use strict";

/* eslint-disable @typescript-eslint/unified-signatures */
/* eslint-disable no-prototype-builtins */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.InfluxDB = exports.ResultError = exports.toNanoDate = exports.escape = exports.Raw = exports.Precision = exports.FieldType = void 0;
const url = __nccwpck_require__(7310);
const b = __nccwpck_require__(2512);
const grammar = __nccwpck_require__(2309);
const pool_1 = __nccwpck_require__(6039);
const results_1 = __nccwpck_require__(7227);
const schema_1 = __nccwpck_require__(5139);
const defaultHost = Object.freeze({
    host: "127.0.0.1",
    port: 8086,
    path: "",
    protocol: "http",
});
const defaultOptions = Object.freeze({
    database: null,
    hosts: [],
    password: "root",
    schema: [],
    username: "root",
});
__exportStar(__nccwpck_require__(2512), exports);
var grammar_1 = __nccwpck_require__(2309);
Object.defineProperty(exports, "FieldType", ({ enumerable: true, get: function () { return grammar_1.FieldType; } }));
Object.defineProperty(exports, "Precision", ({ enumerable: true, get: function () { return grammar_1.Precision; } }));
Object.defineProperty(exports, "Raw", ({ enumerable: true, get: function () { return grammar_1.Raw; } }));
Object.defineProperty(exports, "escape", ({ enumerable: true, get: function () { return grammar_1.escape; } }));
Object.defineProperty(exports, "toNanoDate", ({ enumerable: true, get: function () { return grammar_1.toNanoDate; } }));
var results_2 = __nccwpck_require__(7227);
Object.defineProperty(exports, "ResultError", ({ enumerable: true, get: function () { return results_2.ResultError; } }));
/**
 * Parses the URL out into into a IClusterConfig object
 */
function parseOptionsUrl(addr) {
    const parsed = url.parse(addr);
    const options = {
        host: parsed.hostname,
        port: Number(parsed.port),
        protocol: parsed.protocol.slice(0, -1),
    };
    if (parsed.auth) {
        [options.username, options.password] = parsed.auth.split(":");
    }
    if (parsed.pathname.length > 1) {
        options.database = parsed.pathname.slice(1);
    }
    return options;
}
/**
 * Works similarly to Object.assign, but only overwrites
 * properties that resolve to undefined.
 */
function defaults(target, ...srcs) {
    srcs.forEach((src) => {
        Object.keys(src).forEach((key) => {
            if (target[key] === undefined) {
                target[key] = src[key];
            }
        });
    });
    return target;
}
/**
 * InfluxDB is the public interface to run queries against your database.
 * This is a 'driver-level' module, not a a full-fleged ORM or ODM; you run
 * queries directly by calling methods on this class.
 *
 * Please check out some of [the tutorials](https://node-influx.github.io/manual/tutorial.html)
 * if you want help getting started!
 *
 * @example
 * const Influx = require('influx');
 * const influx = new Influx.InfluxDB({
 *  host: 'localhost',
 *  database: 'express_response_db',
 *  schema: [
 *    {
 *      measurement: 'response_times',
 *      fields: {
 *        path: Influx.FieldType.STRING,
 *        duration: Influx.FieldType.INTEGER
 *      },
 *      tags: [
 *        'host'
 *      ]
 *    }
 *  ]
 * })
 *
 * @example
 * // Connect over HTTPS
 * const Influx = require('influx');
 * const influx = new Influx.InfluxDB({
 *  host: 'myinfluxdbhost',
 *  port: 443,
 *  protocol: 'https'
 *  database: 'express_response_db',
 *  schema: [
 *    {
 *      measurement: 'response_times',
 *      fields: {
 *        path: Influx.FieldType.STRING,
 *        duration: Influx.FieldType.INTEGER
 *      },
 *      tags: [
 *        'host'
 *      ]
 *    }
 *  ]
 * })
 *
 * influx.writePoints([
 *   {
 *     measurement: 'response_times',
 *     tags: { host: os.hostname() },
 *     fields: { duration, path: req.path },
 *   }
 * ]).then(() => {
 *   return influx.query(`
 *     select * from response_times
 *     where host = $<host>
 *     order by time desc
 *     limit 10
 *   `, {
 *      placeholders: {
 *        host: os.hostname()
 *      }
 *   })
 * }).then(rows => {
 *   rows.forEach(row => console.log(`A request to ${row.path} took ${row.duration}ms`))
 * })
 */
class InfluxDB {
    /**
     * Connect to a single InfluxDB instance by specifying
     * a set of connection options.
     * @param [options='http://root:root@127.0.0.1:8086']
     *
     * @example
     * const Influx = require('influx')
     *
     * // Connect to a single host with a DSN:
     * const influx = new Influx.InfluxDB('http://user:password@host:8086/database')
     *
     * @example
     * const Influx = require('influx')
     *
     * // Connect to a single host with a full set of config details and
     * // a custom schema
     * const client = new Influx.InfluxDB({
     *   database: 'my_db',
     *   host: 'localhost',
     *   port: 8086,
     *   username: 'connor',
     *   password: 'pa$$w0rd',
     *   schema: [
     *     {
     *       measurement: 'perf',
     *       fields: {
     *         memory_usage: Influx.FieldType.INTEGER,
     *         cpu_usage: Influx.FieldType.FLOAT,
     *         is_online: Influx.FieldType.BOOLEAN
     *       }
     *       tags: [
     *         'hostname'
     *       ]
     *     }
     *   ]
     * })
     *
     * @example
     * const Influx = require('influx')
     *
     * // Use a pool of several host connections and balance queries across them:
     * const client = new Influx.InfluxDB({
     *   database: 'my_db',
     *   username: 'connor',
     *   password: 'pa$$w0rd',
     *   hosts: [
     *     { host: 'db1.example.com' },
     *     { host: 'db2.example.com' },
     *   ],
     *   schema: [
     *     {
     *       measurement: 'perf',
     *       fields: {
     *         memory_usage: Influx.FieldType.INTEGER,
     *         cpu_usage: Influx.FieldType.FLOAT,
     *         is_online: Influx.FieldType.BOOLEAN
     *       }
     *       tags: [
     *         'hostname'
     *       ]
     *     }
     *   ]
     * })
     *
     */
    constructor(options) {
        /**
         * Map of Schema instances defining measurements in Influx.
         * @private
         */
        this._schema = Object.create(null);
        // Figure out how to parse whatever we were passed in into a IClusterConfig.
        if (typeof options === "string") {
            // Plain URI => ISingleHostConfig
            options = parseOptionsUrl(options);
        }
        else if (!options) {
            options = defaultHost;
        }
        if (!options.hasOwnProperty("hosts")) {
            // ISingleHostConfig => IClusterConfig
            options = {
                database: options.database,
                hosts: [options],
                password: options.password,
                pool: options.pool,
                schema: options.schema,
                username: options.username,
            };
        }
        const resolved = options;
        resolved.hosts = resolved.hosts.map((host) => {
            return defaults({
                host: host.host,
                port: host.port,
                path: host.path,
                protocol: host.protocol,
                options: host.options,
            }, defaultHost);
        });
        this._pool = new pool_1.Pool(resolved.pool);
        this._options = defaults(resolved, defaultOptions);
        resolved.hosts.forEach((host) => {
            this._pool.addHost(`${host.protocol}://${host.host}:${host.port}${host.path}`, host.options);
        });
        this._options.schema.forEach((schema) => this._createSchema(schema));
    }
    /**
     * Adds specified schema for better fields coercing.
     *
     * @param {ISchemaOptions} schema
     * @memberof InfluxDB
     */
    addSchema(schema) {
        this._createSchema(schema);
    }
    /**
     * Creates a new database with the provided name.
     * @param databaseName
     * @return
     * @example
     * influx.createDatabase('mydb')
     */
    createDatabase(databaseName) {
        return this._pool
            .json(this._getQueryOpts({
            q: `create database ${grammar.escape.quoted(databaseName)}`,
        }, "POST"))
            .then(results_1.assertNoErrors)
            .then(() => undefined);
    }
    /**
     * Deletes a database with the provided name.
     * @param databaseName
     * @return
     * @example
     * influx.dropDatabase('mydb')
     */
    dropDatabase(databaseName) {
        return this._pool
            .json(this._getQueryOpts({
            q: `drop database ${grammar.escape.quoted(databaseName)}`,
        }, "POST"))
            .then(results_1.assertNoErrors)
            .then(() => undefined);
    }
    /**
     * Returns array of database names. Requires cluster admin privileges.
     * @returns a list of database names
     * @example
     * influx.getDatabaseNames().then(names =>
     *   console.log('My database names are: ' + names.join(', ')));
     */
    getDatabaseNames() {
        return this._pool
            .json(this._getQueryOpts({ q: "show databases" }))
            .then((res) => results_1.parseSingle(res).map((r) => r.name));
    }
    /**
     * Returns array of measurements.
     * @returns a list of measurement names
     * @param [database] the database the measurement lives in, optional
     *     if a default database is provided.
     * @example
     * influx.getMeasurements().then(names =>
     *   console.log('My measurement names are: ' + names.join(', ')));
     */
    getMeasurements(database = this._defaultDB()) {
        return this._pool
            .json(this._getQueryOpts({
            db: database,
            q: "show measurements",
        }))
            .then((res) => results_1.parseSingle(res).map((r) => r.name));
    }
    /**
     * Returns a list of all series within the target measurement, or from the
     * entire database if a measurement isn't provided.
     * @param [options]
     * @param [options.measurement] if provided, we'll only get series
     *     from within that measurement.
     * @param [options.database] the database the series lives in,
     *     optional if a default database is provided.
     * @returns a list of series names
     * @example
     * influx.getSeries().then(names => {
     *   console.log('My series names in my_measurement are: ' + names.join(', '))
     * })
     *
     * influx.getSeries({
     *   measurement: 'my_measurement',
     *   database: 'my_db'
     * }).then(names => {
     *   console.log('My series names in my_measurement are: ' + names.join(', '))
     * })
     */
    getSeries(options = {}) {
        const { database = this._defaultDB(), measurement } = options;
        let query = "show series";
        if (measurement) {
            query += ` from ${grammar.escape.quoted(measurement)}`;
        }
        return this._pool
            .json(this._getQueryOpts({
            db: database,
            q: query,
        }))
            .then((res) => results_1.parseSingle(res).map((r) => r.key));
    }
    /**
     * Removes a measurement from the database.
     * @param measurement
     * @param [database] the database the measurement lives in, optional
     *     if a default database is provided.
     * @return
     * @example
     * influx.dropMeasurement('my_measurement')
     */
    dropMeasurement(measurement, database = this._defaultDB()) {
        return this._pool
            .json(this._getQueryOpts({
            db: database,
            q: `drop measurement ${grammar.escape.quoted(measurement)}`,
        }, "POST"))
            .then(results_1.assertNoErrors)
            .then(() => undefined);
    }
    /**
     * Removes a one or more series from InfluxDB.
     *
     * @returns
     * @example
     * // The following pairs of queries are equivalent: you can chose either to
     * // use our builder or pass in string directly. The builder takes care
     * // of escaping and most syntax handling for you.
     *
     * influx.dropSeries({ where: e => e.tag('cpu').equals.value('cpu8') })
     * influx.dropSeries({ where: '"cpu" = \'cpu8\'' })
     * // DROP SERIES WHERE "cpu" = 'cpu8'
     *
     * influx.dropSeries({ measurement: m => m.name('cpu').policy('autogen') })
     * influx.dropSeries({ measurement: '"cpu"."autogen"' })
     * // DROP SERIES FROM "autogen"."cpu"
     *
     * influx.dropSeries({
     *   measurement: m => m.name('cpu').policy('autogen'),
     *   where: e => e.tag('cpu').equals.value('cpu8'),
     *   database: 'my_db'
     * })
     * // DROP SERIES FROM "autogen"."cpu" WHERE "cpu" = 'cpu8'
     */
    dropSeries(options) {
        const db = "database" in options ? options.database : this._defaultDB();
        let q = "drop series";
        if ("measurement" in options) {
            q += " from " + b.parseMeasurement(options);
        }
        if ("where" in options) {
            q += " where " + b.parseWhere(options);
        }
        return this._pool
            .json(this._getQueryOpts({ db, q }, "POST"))
            .then(results_1.assertNoErrors)
            .then(() => undefined);
    }
    /**
     * Returns a list of users on the Influx database.
     * @return
     * @example
     * influx.getUsers().then(users => {
     *   users.forEach(user => {
     *     if (user.admin) {
     *       console.log(user.user, 'is an admin!')
     *     } else {
     *       console.log(user.user, 'is not an admin!')
     *     }
     *   })
     * })
     */
    getUsers() {
        return this._pool
            .json(this._getQueryOpts({ q: "show users" }))
            .then((result) => results_1.parseSingle(result));
    }
    /**
     * Creates a new InfluxDB user.
     * @param username
     * @param password
     * @param [admin=false] If true, the user will be given all
     *     privileges on all databases.
     * @return
     * @example
     * influx.createUser('connor', 'pa55w0rd', true) // make 'connor' an admin
     *
     * // make non-admins:
     * influx.createUser('not_admin', 'pa55w0rd')
     */
    createUser(username, password, admin = false) {
        return this._pool
            .json(this._getQueryOpts({
            q: `create user ${grammar.escape.quoted(username)} with password ` +
                grammar.escape.stringLit(password) +
                (admin ? " with all privileges" : ""),
        }, "POST"))
            .then(results_1.assertNoErrors)
            .then(() => undefined);
    }
    /**
     * Sets a password for an Influx user.
     * @param username
     * @param password
     * @return
     * @example
     * influx.setPassword('connor', 'pa55w0rd')
     */
    setPassword(username, password) {
        return this._pool
            .json(this._getQueryOpts({
            q: `set password for ${grammar.escape.quoted(username)} = ` +
                grammar.escape.stringLit(password),
        }, "POST"))
            .then(results_1.assertNoErrors)
            .then(() => undefined);
    }
    /**
     * Grants a privilege to a specified user.
     * @param username
     * @param privilege Should be one of 'READ' or 'WRITE'
     * @param [database] If not provided, uses the default database.
     * @return
     * @example
     * influx.grantPrivilege('connor', 'READ', 'my_db') // grants read access on my_db to connor
     */
    grantPrivilege(username, privilege, database = this._defaultDB()) {
        return this._pool
            .json(this._getQueryOpts({
            q: `grant ${privilege} on ${grammar.escape.quoted(database)} ` +
                `to ${grammar.escape.quoted(username)}`,
        }, "POST"))
            .then(results_1.assertNoErrors)
            .then(() => undefined);
    }
    /**
     * Removes a privilege from a specified user.
     * @param username
     * @param privilege Should be one of 'READ' or 'WRITE'
     * @param [database] If not provided, uses the default database.
     * @return
     * @example
     * influx.revokePrivilege('connor', 'READ', 'my_db') // removes read access on my_db from connor
     */
    revokePrivilege(username, privilege, database = this._defaultDB()) {
        return this._pool
            .json(this._getQueryOpts({
            q: `revoke ${privilege} on ${grammar.escape.quoted(database)} from ` + grammar.escape.quoted(username),
        }, "POST"))
            .then(results_1.assertNoErrors)
            .then(() => undefined);
    }
    /**
     * Grants admin privileges to a specified user.
     * @param username
     * @return
     * @example
     * influx.grantAdminPrivilege('connor')
     */
    grantAdminPrivilege(username) {
        return this._pool
            .json(this._getQueryOpts({
            q: `grant all to ${grammar.escape.quoted(username)}`,
        }, "POST"))
            .then(results_1.assertNoErrors)
            .then(() => undefined);
    }
    /**
     * Removes a admin privilege from a specified user.
     * @param username
     * @return
     * @example
     * influx.revokeAdminPrivilege('connor')
     */
    revokeAdminPrivilege(username) {
        return this._pool
            .json(this._getQueryOpts({
            q: `revoke all from ${grammar.escape.quoted(username)}`,
        }, "POST"))
            .then(results_1.assertNoErrors)
            .then(() => undefined);
    }
    /**
     * Removes a user from the database.
     * @param username
     * @return
     * @example
     * influx.dropUser('connor')
     */
    dropUser(username) {
        return this._pool
            .json(this._getQueryOpts({
            q: `drop user ${grammar.escape.quoted(username)}`,
        }, "POST"))
            .then(results_1.assertNoErrors)
            .then(() => undefined);
    }
    /**
     * Creates a continuous query in a database
     * @param name The query name, for later reference
     * @param query The body of the query to run
     * @param [database] If not provided, uses the default database.
     * @param [resample] If provided, adds resample policy
     * @return
     * @example
     * influx.createContinuousQuery('downsample_cpu_1h', `
     *   SELECT MEAN(cpu) INTO "7d"."perf"
     *   FROM "1d"."perf" GROUP BY time(1m)
     * `, undefined, 'RESAMPLE FOR 7m')
     */
    createContinuousQuery(name, query, database = this._defaultDB(), resample = "") {
        return this._pool
            .json(this._getQueryOpts({
            q: `create continuous query ${grammar.escape.quoted(name)}` +
                ` on ${grammar.escape.quoted(database)} ${resample} begin ${query} end`,
        }, "POST"))
            .then(results_1.assertNoErrors)
            .then(() => undefined);
    }
    /**
     * Returns a list of continous queries in the database.
     * @param [database] If not provided, uses the default database.
     * @return
     * @example
     * influx.showContinousQueries()
     */
    showContinousQueries(database = this._defaultDB()) {
        return this._pool
            .json(this._getQueryOpts({
            db: database,
            q: "show continuous queries",
        }))
            .then((result) => results_1.parseSingle(result));
    }
    /**
     * Creates a continuous query in a database
     * @param name The query name
     * @param [database] If not provided, uses the default database.
     * @return
     * @example
     * influx.dropContinuousQuery('downsample_cpu_1h')
     */
    dropContinuousQuery(name, database = this._defaultDB()) {
        return this._pool
            .json(this._getQueryOpts({
            q: `drop continuous query ${grammar.escape.quoted(name)}` +
                ` on ${grammar.escape.quoted(database)}`,
        }, "POST"))
            .then(results_1.assertNoErrors)
            .then(() => undefined);
    }
    /**
     * Creates a new retention policy on a database. You can read more about
     * [Downsampling and Retention](https://docs.influxdata.com/influxdb/v1.0/
     * guides/downsampling_and_retention/) on the InfluxDB website.
     *
     * @param name The retention policy name
     * @param options
     * @param [options.database] Database to create the policy on,
     *     uses the default database if not provided.
     * @param options.duration How long data in the retention policy
     *     should be stored for, should be in a format like `7d`. See details
     *     [here](https://docs.influxdata.com/influxdb/v1.0/query_language/spec/#durations)
     * @param options.replication How many servers data in the series
     *     should be replicated to.
     * @param [options.isDefault] Whether the retention policy should
     *     be the default policy on the database.
     * @return
     * @example
     * influx.createRetentionPolicy('7d', {
     *  duration: '7d',
     *  replication: 1
     * })
     */
    createRetentionPolicy(name, options) {
        const q = `create retention policy ${grammar.escape.quoted(name)} on ` +
            grammar.escape.quoted(options.database || this._defaultDB()) +
            ` duration ${options.duration} replication ${options.replication}` +
            (options.isDefault ? " default" : "");
        return this._pool
            .json(this._getQueryOpts({ q }, "POST"))
            .then(results_1.assertNoErrors)
            .then(() => undefined);
    }
    /**
     * Alters an existing retention policy on a database.
     *
     * @param name The retention policy name
     * @param options
     * @param [options.database] Database to create the policy on,
     *     uses the default database if not provided.
     * @param options.duration How long data in the retention policy
     *     should be stored for, should be in a format like `7d`. See details
     *     [here](https://docs.influxdata.com/influxdb/v1.0/query_language/spec/#durations)
     * @param options.replication How many servers data in the series
     *     should be replicated to.
     * @param [options.default] Whether the retention policy should
     *     be the default policy on the database.
     * @return
     * @example
     * influx.alterRetentionPolicy('7d', {
     *  duration: '7d',
     *  replication: 1,
     *  default: true
     * })
     */
    alterRetentionPolicy(name, options) {
        const q = `alter retention policy ${grammar.escape.quoted(name)} on ` +
            grammar.escape.quoted(options.database || this._defaultDB()) +
            ` duration ${options.duration} replication ${options.replication}` +
            (options.isDefault ? " default" : "");
        return this._pool
            .json(this._getQueryOpts({ q }, "POST"))
            .then(results_1.assertNoErrors)
            .then(() => undefined);
    }
    /**
     * Deletes a retention policy and associated data. Note that the data will
     * not be immediately destroyed, and will hang around until Influx's
     * bi-hourly cron.
     *
     * @param name The retention policy name
     * @param [database] Database name that the policy lives in,
     *     uses the default database if not provided.
     * @return
     * @example
     * influx.dropRetentionPolicy('7d')
     */
    dropRetentionPolicy(name, database = this._defaultDB()) {
        return this._pool
            .json(this._getQueryOpts({
            q: `drop retention policy ${grammar.escape.quoted(name)} ` +
                `on ${grammar.escape.quoted(database)}`,
        }, "POST"))
            .then(results_1.assertNoErrors)
            .then(() => undefined);
    }
    /**
     * Shows retention policies on the database
     *
     * @param [database] The database to list policies on, uses the
     *     default database if not provided.
     * @return
     * @example
     * influx.showRetentionPolicies().then(policies => {
     *   expect(policies.slice()).to.deep.equal([
     *     {
     *       name: 'autogen',
     *       duration: '0s',
     *       shardGroupDuration: '168h0m0s',
     *       replicaN: 1,
     *       default: true,
     *     },
     *     {
     *       name: '7d',
     *       duration: '168h0m0s',
     *       shardGroupDuration: '24h0m0s',
     *       replicaN: 1,
     *       default: false,
     *     },
     *   ])
     * })
     */
    showRetentionPolicies(database = this._defaultDB()) {
        return this._pool
            .json(this._getQueryOpts({
            q: `show retention policies on ${grammar.escape.quoted(database)}`,
        }, "GET"))
            .then((result) => results_1.parseSingle(result));
    }
    /**
     * Shows shards on the database
     *
     * @param [database] The database to list policies on, uses the
     *     default database if not provided.
     * @return
     * @example
     * influx.showShards().then(shards => {
     *   expect(shards.slice()).to.deep.equal([
     *     {
     *		id: 1
     *		database: 'database',
     *		retention_policy: 'autogen',
     *		shard_group: 1,
     *		start_time: '2019-05-06T00:00:00Z',
     *		end_time: '2019-05-13T00:00:00Z',
     *		expiry_time: '2019-05-13T00:00:00Z',
     *		owners: null,
     *     },
     *   ])
     * })
     */
    showShards(database = this._defaultDB()) {
        return this._pool
            .json(this._getQueryOpts({
            q: "show shards ",
        }, "GET"))
            .then((result) => results_1.parseSingle(result).filter(function (i) {
            return i.database === database;
        }));
    }
    /**
     * Drops a shard with the provided number.
     * @param shard_id
     * @return
     * @example
     * influx.dropShard(3)
     */
    dropShard(shard_id) {
        return this._pool
            .json(this._getQueryOpts({
            q: `drop shard ${shard_id}`,
        }, "POST"))
            .then(results_1.assertNoErrors)
            .then(() => undefined);
    }
    /**
     * WritePoints sends a list of points together in a batch to InfluxDB. In
     * each point you must specify the measurement name to write into as well
     * as a list of tag and field values. Optionally, you can specify the
     * time to tag that point at, defaulting to the current time.
     *
     * If you defined a schema for the measurement in the options you passed
     * to `new Influx(options)`, we'll use that to make sure that types get
     * cast correctly and that there are no extraneous fields or columns.
     *
     * For best performance, it's recommended that you batch your data into
     * sets of a couple thousand records before writing it. In the future we'll
     * have some utilities within node-influx to make this easier.
     *
     * ---
     *
     * A note when using manually-specified times and precisions: by default
     * we write using the `ms` precision since that's what JavaScript gives us.
     * You can adjust this. However, there is some special behaviour if you
     * manually specify a timestamp in your points:
     *  - if you specify the timestamp as a Date object, we'll convert it to
     *    milliseconds and manipulate it as needed to get the right precision
     *  - if provide a INanoDate as returned from {@link toNanoTime} or the
     *    results from an Influx query, we'll be able to pull the precise
     *    nanosecond timestamp and manipulate it to get the right precision
     *  - if you provide a string or number as the timestamp, we'll pass it
     *    straight into Influx.
     *
     * Please see the IPoint and IWriteOptions types for a
     * full list of possible options.
     *
     * @param points
     * @param [options]
     * @return
     * @example
     * // write a point into the default database with
     * // the default retention policy.
     * influx.writePoints([
     *   {
     *     measurement: 'perf',
     *     tags: { host: 'box1.example.com' },
     *     fields: { cpu: getCpuUsage(), mem: getMemUsage() },
     *   }
     * ])
     *
     * // you can manually specify the database,
     * // retention policy, and time precision:
     * influx.writePoints([
     *   {
     *     measurement: 'perf',
     *     tags: { host: 'box1.example.com' },
     *     fields: { cpu: getCpuUsage(), mem: getMemUsage() },
     *     timestamp: getLastRecordedTime(),
     *   }
     * ], {
     *   database: 'my_db',
     *   retentionPolicy: '1d',
     *   precision: 's'
     * })
     */
    writePoints(points, options = {}) {
        const { database = this._defaultDB(), precision = "n", retentionPolicy, } = options;
        let payload = "";
        points.forEach((point) => {
            const { measurement, tags, fieldsPairs, tagsNames, castedTimestamp } = this.parsePoint(point, { database, precision });
            payload += (payload.length > 0 ? "\n" : "") + measurement;
            for (let tagsName of tagsNames) {
                payload +=
                    "," +
                        grammar.escape.tag(tagsName) +
                        "=" +
                        grammar.escape.tag(tags[tagsName]);
            }
            for (let i = 0; i < fieldsPairs.length; i += 1) {
                payload +=
                    (i === 0 ? " " : ",") +
                        grammar.escape.tag(fieldsPairs[i][0]) +
                        "=" +
                        fieldsPairs[i][1];
            }
            if (castedTimestamp !== undefined) {
                payload += " " + castedTimestamp;
            }
        });
        return this._pool.discard({
            body: payload,
            method: "POST",
            path: "/write",
            query: {
                db: database,
                p: this._options.password,
                precision,
                rp: retentionPolicy,
                u: this._options.username,
            },
        });
    }
    /**
     * ParsePoint will perform the coercions/schema checks and return the data
     * required for writing a point. This will throw an error if a schema check
     * or coercion fails. This can be useful for flagging or "throwing out" bad
     * points in a batch write to prevent the entire batch from getting aborted
     *
     * ---
     *
     * A note when using this function, {@link InfluxDB#writePoints} will still perform
     * the same checks, so any pre-processed data will be checked for validity twice which
     * has potential performance implications on large data sets
     *
     * @param point
     * @param [options]
     * @return
     * @example
     * // parse a point as if it is getting written to the default
     * // databse with the default time precision
     * influx.parsePoint({
     *     measurement: 'perf',
     *     tags: { host: 'box1.example.com' },
     *     fields: { cpu: getCpuUsage(), mem: getMemUsage() },
     * })
     *
     * // you can manually specify the database and time precision
     * influx.parsePoint({
     *     measurement: 'perf',
     *     tags: { host: 'box1.example.com' },
     *     fields: { cpu: getCpuUsage(), mem: getMemUsage() },
     * }, {
     *   precision: 's',
     *   database: 'my_db'
     * })
     *
     * // if an error occurs, you can catch the error with try...catch
     * try {
     *   influx.parsePoint({
     *     measurement: 'perf',
     *     tags: { host: 'box1.example.com', myExtraneousTag: 'value' },
     *     fields: { cpu: getCpuUsage(), mem: getMemUsage(), myExtraneousField: 'value' },
     *   })
     * } catch(err) {
     *   handleError(err);
     * }
     */
    parsePoint(point, options = {}) {
        const { database = this._defaultDB(), precision = "n" } = options;
        const { fields = {}, tags = {}, measurement, timestamp } = point;
        const schema = this._schema[database] && this._schema[database][measurement];
        const fieldsPairs = schema
            ? schema.coerceFields(fields)
            : schema_1.coerceBadly(fields);
        const tagsNames = schema ? schema.checkTags(tags) : Object.keys(tags);
        const castedTimestamp = timestamp && grammar.castTimestamp(timestamp, precision);
        return {
            fields,
            tags,
            measurement,
            timestamp,
            fieldsPairs,
            tagsNames,
            castedTimestamp,
        };
    }
    /**
     * WriteMeasurement functions similarly to {@link InfluxDB#writePoints}, but
     * it automatically fills in the `measurement` value for all points for you.
     *
     * @param measurement
     * @param points
     * @param [options]
     * @return
     * @example
     * influx.writeMeasurement('perf', [
     *   {
     *     tags: { host: 'box1.example.com' },
     *     fields: { cpu: getCpuUsage(), mem: getMemUsage() },
     *   }
     * ])
     */
    writeMeasurement(measurement, points, options = {}) {
        points = points.map((p) => (Object.assign({ measurement }, p)));
        return this.writePoints(points, options);
    }
    /**
     * .query() runs a query (or list of queries), and returns the results in a
     * friendly format, {@link IResults}. If you run multiple queries, an array of results
     * will be returned, otherwise a single result (array of objects) will be returned.
     *
     * @param query
     * @param [options]
     * @return result(s)
     * @example
     * influx.query('select * from perf').then(results => {
     *   console.log(results)
     * })
     */
    query(query, options = {}) {
        if (Array.isArray(query)) {
            query = query.join(";");
        }
        // If the consumer asked explicitly for nanosecond precision parsing,
        // remove that to cause Influx to give us ISO dates that
        // we can parse correctly.
        if (options.precision === "n") {
            options = Object.assign({}, options); // Avoid mutating
            delete options.precision;
        }
        return this.queryRaw(query, options).then((res) => results_1.parse(res, options.precision));
    }
    /**
     * QueryRaw functions similarly to .query() but it does no fancy
     * transformations on the returned data; it calls `JSON.parse` and returns
     * those results verbatim.
     *
     * @param query
     * @param [options]
     * @return
     * @example
     * influx.queryRaw('select * from perf').then(rawData => {
     *   console.log(rawData)
     * })
     */
    queryRaw(query, options = {}) {
        const { database = this._defaultDB(), retentionPolicy, placeholders = {}, } = options;
        if (query instanceof Array) {
            query = query.join(";");
        }
        return this._pool.json(this._getQueryOpts({
            db: database,
            epoch: options.precision,
            q: query,
            rp: retentionPolicy,
            params: JSON.stringify(placeholders),
        }));
    }
    /**
     * Pings all available hosts, collecting online status and version info.
     * @param timeout Given in milliseconds
     * @return
     * @example
     * influx.ping(5000).then(hosts => {
     *   hosts.forEach(host => {
     *     if (host.online) {
     *       console.log(`${host.url.host} responded in ${host.rtt}ms running ${host.version})`)
     *     } else {
     *       console.log(`${host.url.host} is offline :(`)
     *     }
     *   })
     * })
     */
    ping(timeout) {
        let auth = undefined;
        if (typeof this._options.username === "string") {
            auth = `${this._options.username}:${this._options.password || ""}`;
        }
        return this._pool.ping(timeout, "/ping", auth);
    }
    /**
     * Returns the default database that queries operates on. It throws if called
     * when a default database isn't set.
     * @private
     */
    _defaultDB() {
        if (!this._options.database) {
            throw new Error("Attempted to run an influx query without a default" +
                " database specified or an explicit database provided.");
        }
        return this._options.database;
    }
    /**
     * Creates options to be passed into the pool to query databases.
     * @private
     */
    _getQueryOpts(params, method = "GET") {
        return {
            method,
            path: "/query",
            query: Object.assign({ p: this._options.password, u: this._options.username }, params),
        };
    }
    /**
     * Creates specified measurement schema
     *
     * @private
     * @param {ISchemaOptions} schema
     * @memberof InfluxDB
     */
    _createSchema(schema) {
        schema.database = schema.database || this._options.database;
        if (!schema.database) {
            throw new Error(`Schema ${schema.measurement} doesn't have a database specified,` +
                "and no default database is provided!");
        }
        if (!this._schema[schema.database]) {
            this._schema[schema.database] = Object.create(null);
        }
        this._schema[schema.database][schema.measurement] = new schema_1.Schema(schema);
    }
}
exports.InfluxDB = InfluxDB;


/***/ }),

/***/ 6039:
/***/ ((__unused_webpack_module, exports, __nccwpck_require__) => {

"use strict";

Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.Pool = exports.RequestError = exports.ServiceNotAvailableError = void 0;
const exponential_1 = __nccwpck_require__(8670);
const host_1 = __nccwpck_require__(2842);
const http = __nccwpck_require__(3685);
const https = __nccwpck_require__(5687);
const querystring = __nccwpck_require__(3477);
/**
 * Status codes that will cause a host to be marked as 'failed' if we get
 * them from a request to Influx.
 * @type {Array}
 */
const resubmitErrorCodes = [
    "ETIMEDOUT",
    "ESOCKETTIMEDOUT",
    "ECONNRESET",
    "ECONNREFUSED",
    "EHOSTUNREACH",
];
/**
 * An ServiceNotAvailableError is returned as an error from requests that
 * result in a > 500 error code.
 */
class ServiceNotAvailableError extends Error {
    constructor(message) {
        super();
        this.message = message;
        Object.setPrototypeOf(this, ServiceNotAvailableError.prototype);
    }
}
exports.ServiceNotAvailableError = ServiceNotAvailableError;
/**
 * An RequestError is returned as an error from requests that
 * result in a 300 <= error code <= 500.
 */
class RequestError extends Error {
    constructor(req, res, body) {
        super();
        this.req = req;
        this.res = res;
        this.message = `A ${res.statusCode} ${res.statusMessage} error occurred: ${body}`;
        Object.setPrototypeOf(this, RequestError.prototype);
    }
    static Create(req, res, callback) {
        let body = "";
        res.on("data", (str) => {
            body += str.toString();
        });
        res.on("end", () => callback(new RequestError(req, res, body)));
    }
}
exports.RequestError = RequestError;
/**
 * Creates a function generation that returns a wrapper which only allows
 * through the first call of any function that it generated.
 */
function doOnce() {
    let handled = false;
    return (fn) => {
        return (arg) => {
            if (handled) {
                return;
            }
            handled = true;
            fn(arg);
        };
    };
}
function setToArray(itemSet) {
    const output = [];
    itemSet.forEach((value) => {
        output.push(value);
    });
    return output;
}
const request = (options, callback) => {
    if (options.protocol === "https:") {
        return https.request(options, callback);
    }
    return http.request(options, callback);
};
/**
 *
 * The Pool maintains a list available Influx hosts and dispatches requests
 * to them. If there are errors connecting to hosts, it will disable that
 * host for a period of time.
 */
class Pool {
    /**
     * Creates a new Pool instance.
     * @param {IPoolOptions} options
     */
    constructor(options) {
        this._options = Object.assign({ backoff: new exponential_1.ExponentialBackoff({
                initial: 300,
                max: 10 * 1000,
                random: 1,
            }), maxRetries: 2, requestTimeout: 30 * 1000 }, options);
        this._index = 0;
        this._hostsAvailable = new Set();
        this._hostsDisabled = new Set();
        this._timeout = this._options.requestTimeout;
    }
    /**
     * Returns a list of currently active hosts.
     * @return {Host[]}
     */
    getHostsAvailable() {
        return setToArray(this._hostsAvailable);
    }
    /**
     * Returns a list of hosts that are currently disabled due to network
     * errors.
     * @return {Host[]}
     */
    getHostsDisabled() {
        return setToArray(this._hostsDisabled);
    }
    /**
     * Inserts a new host to the pool.
     */
    addHost(url, options = {}) {
        const host = new host_1.Host(url, this._options.backoff.reset(), options);
        this._hostsAvailable.add(host);
        return host;
    }
    /**
     * Returns true if there's any host available to by queried.
     * @return {Boolean}
     */
    hostIsAvailable() {
        return this._hostsAvailable.size > 0;
    }
    /**
     * Makes a request and calls back with the response, parsed as JSON.
     * An error is returned on a non-2xx status code or on a parsing exception.
     */
    json(options) {
        return this.text(options).then((res) => JSON.parse(res));
    }
    /**
     * Makes a request and resolves with the plain text response,
     * if possible. An error is raised on a non-2xx status code.
     */
    text(options) {
        return new Promise((resolve, reject) => {
            this.stream(options, (err, res) => {
                if (err) {
                    return reject(err);
                }
                let output = "";
                res.on("data", (str) => {
                    output += str.toString();
                });
                res.on("end", () => resolve(output));
            });
        });
    }
    /**
     * Makes a request and discards any response body it receives.
     * An error is returned on a non-2xx status code.
     */
    discard(options) {
        return new Promise((resolve, reject) => {
            this.stream(options, (err, res) => {
                if (err) {
                    return reject(err);
                }
                res.on("data", () => {
                    /* ignore */
                });
                res.on("end", () => resolve());
            });
        });
    }
    /**
     * Ping sends out a request to all available Influx servers, reporting on
     * their response time and version number.
     */
    ping(timeout, path = "/ping", auth = undefined) {
        const todo = [];
        setToArray(this._hostsAvailable)
            .concat(setToArray(this._hostsDisabled))
            .forEach((host) => {
            const start = Date.now();
            const url = host.url;
            const once = doOnce();
            return todo.push(new Promise((resolve) => {
                const headers = {};
                if (typeof auth !== "undefined") {
                    const encodedAuth = Buffer.from(auth).toString("base64");
                    headers["Authorization"] = `Basic ${encodedAuth}`;
                }
                const req = request(Object.assign({ hostname: url.hostname, method: "GET", path, port: Number(url.port), protocol: url.protocol, timeout, headers: headers }, host.options), once((res) => {
                    resolve({
                        url,
                        res: res.resume(),
                        online: res.statusCode < 300,
                        rtt: Date.now() - start,
                        version: res.headers["x-influxdb-version"],
                    });
                }));
                const fail = once(() => {
                    req.abort();
                    resolve({
                        online: false,
                        res: null,
                        rtt: Infinity,
                        url,
                        version: null,
                    });
                });
                // Support older Nodes and polyfills which don't allow .timeout() in
                // the request options, wrapped in a conditional for even worse
                // polyfills. See: https://github.com/node-influx/node-influx/issues/221
                if (typeof req.setTimeout === "function") {
                    req.setTimeout(timeout, () => {
                        fail.call(fail, arguments);
                    }); // Tslint:disable-line
                }
                req.on("timeout", fail);
                req.on("error", fail);
                req.end();
            }));
        });
        return Promise.all(todo);
    }
    /**
     * Makes a request and calls back with the IncomingMessage stream,
     * if possible. An error is returned on a non-2xx status code.
     */
    stream(options, callback) {
        if (!this.hostIsAvailable()) {
            return callback(new ServiceNotAvailableError("No host available"), null);
        }
        const once = doOnce();
        const host = this._getHost();
        let path = host.url.pathname === "/" ? "" : host.url.pathname;
        path += options.path;
        if (options.query) {
            path += "?" + querystring.stringify(options.query);
        }
        const req = request(Object.assign({ headers: {
                "content-length": options.body ? Buffer.from(options.body).length : 0,
            }, hostname: host.url.hostname, method: options.method, path, port: Number(host.url.port), protocol: host.url.protocol, timeout: this._timeout }, host.options), once((res) => {
            res.setEncoding("utf8");
            if (res.statusCode >= 500) {
                res.on("data", () => {
                    /* ignore */
                });
                res.on("end", () => {
                    return this._handleRequestError(new ServiceNotAvailableError(res.statusMessage), host, options, callback);
                });
                return;
            }
            if (res.statusCode >= 300) {
                return RequestError.Create(req, res, (err) => callback(err, res));
            }
            host.success();
            return callback(undefined, res);
        }));
        // Handle network or HTTP parsing errors:
        req.on("error", once((err) => {
            this._handleRequestError(err, host, options, callback);
        }));
        // Handle timeouts:
        req.on("timeout", once(() => {
            req.abort();
            this._handleRequestError(new ServiceNotAvailableError("Request timed out"), host, options, callback);
        }));
        // Support older Nodes and polyfills which don't allow .timeout() in the
        // request options, wrapped in a conditional for even worse polyfills. See:
        // https://github.com/node-influx/node-influx/issues/221
        if (typeof req.setTimeout === "function") {
            req.setTimeout(host.options.timeout || this._timeout); // Tslint:disable-line
        }
        // Write out the body:
        if (options.body) {
            req.write(options.body);
        }
        req.end();
    }
    /**
     * Returns the next available host for querying.
     * @return {Host}
     */
    _getHost() {
        const available = setToArray(this._hostsAvailable);
        const host = available[this._index];
        this._index = (this._index + 1) % available.length;
        return host;
    }
    /**
     * Re-enables the provided host, returning it to the pool to query.
     * @param  {Host} host
     */
    _enableHost(host) {
        this._hostsDisabled.delete(host);
        this._hostsAvailable.add(host);
    }
    /**
     * Disables the provided host, removing it from the query pool. It will be
     * re-enabled after a backoff interval
     */
    _disableHost(host) {
        const delay = host.fail();
        if (delay > 0) {
            this._hostsAvailable.delete(host);
            this._hostsDisabled.add(host);
            this._index %= Math.max(1, this._hostsAvailable.size);
            setTimeout(() => this._enableHost(host), delay);
        }
    }
    _handleRequestError(err, host, options, callback) {
        if (!(err instanceof ServiceNotAvailableError) &&
            !resubmitErrorCodes.includes(err.code)) {
            return callback(err, null);
        }
        this._disableHost(host);
        const retries = options.retries || 0;
        if (retries < this._options.maxRetries && this.hostIsAvailable()) {
            options.retries = retries + 1;
            return this.stream(options, callback);
        }
        callback(err, null);
    }
}
exports.Pool = Pool;


/***/ }),

/***/ 7227:
/***/ ((__unused_webpack_module, exports, __nccwpck_require__) => {

"use strict";

Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.parseSingle = exports.parse = exports.assertNoErrors = exports.ResultError = void 0;
const grammar_1 = __nccwpck_require__(2309);
/**
 * A ResultError is thrown when a query generates errorful results from Influx.
 */
class ResultError extends Error {
    constructor(message) {
        super();
        this.message = `Error from InfluxDB: ${message}`;
    }
}
exports.ResultError = ResultError;
function groupMethod(matcher) {
    // We do a tiny bit of 'custom' deep equality checking here, taking
    // advantage of the fact that the tag keys are consistent across all
    // series results. This lets us match groupings much more efficiently,
    // ~6000x faster than the fastest vanilla equality checker (lodash)
    // when operating on large (~100,000 grouping) sets.
    const srcKeys = this.groupsTagsKeys;
    const dstKeys = Object.keys(matcher);
    if (srcKeys.length === 0 || srcKeys.length !== dstKeys.length) {
        return [];
    }
    L: for (let row of this.groupRows) {
        // eslint-disable-line no-labels
        for (let src of srcKeys) {
            if (row.tags[src] !== matcher[src]) {
                continue L; // eslint-disable-line no-labels
            }
        }
        return row.rows;
    }
    return [];
}
function groupsMethod() {
    return this.groupRows;
}
/**
 * Inner parsing function which unpacks the series into a table and attaches
 * methods to the array. This is quite optimized and a bit of a mess to read,
 * but it's all fairly easy procedural logic.
 *
 * We do this instead of subclassing Array since subclassing has some
 * undesirable side-effects. For example, calling .slice() on the array
 * makes it impossible to preserve groups as would be necessary if it's
 * subclassed.
 */
function parseInner(series = [], precision) {
    const results = [];
    results.groupsTagsKeys =
        series.length && series[0].tags ? Object.keys(series[0].tags) : [];
    const tags = results.groupsTagsKeys;
    let nextGroup = [];
    results.groupRows = new Array(series.length); // Tslint:disable-line
    for (let i = 0; i < series.length; i += 1, results.length) {
        const { columns = [], values = [] } = series[i];
        for (let value of values) {
            const obj = {};
            for (let j = 0; j < columns.length; j += 1) {
                if (columns[j] === "time") {
                    obj.time = grammar_1.isoOrTimeToDate(value[j], precision);
                }
                else {
                    obj[columns[j]] = value[j];
                }
            }
            for (let tag of tags) {
                obj[tag] = series[i].tags[tag];
            }
            results.push(obj);
            nextGroup.push(obj);
        }
        results.groupRows[i] = {
            name: series[i].name,
            rows: nextGroup,
            tags: series[i].tags || {},
        };
        nextGroup = [];
    }
    results.group = groupMethod;
    results.groups = groupsMethod;
    return results;
}
/**
 * Checks if there are any errors in the IResponse and, if so, it throws them.
 * @private
 * @throws {ResultError}
 */
function assertNoErrors(res) {
    for (let result of res.results) {
        const { error } = result;
        if (error) {
            throw new ResultError(error);
        }
    }
    return res;
}
exports.assertNoErrors = assertNoErrors;
/**
 * From parses out a response to a result or list of responses.
 * There are three situations we cover here:
 *  1. A single query without groups, like `select * from myseries`
 *  2. A single query with groups, generated with a `group by` statement
 *     which groups by series *tags*, grouping by times is case (1)
 *  3. Multiple queries of types 1 and 2
 * @private
 */
function parse(res, precision) {
    assertNoErrors(res);
    if (res.results.length === 1) {
        // Normalize case 3
        return parseInner(res.results[0].series, precision);
    }
    return res.results.map((result) => parseInner(result.series, precision));
}
exports.parse = parse;
/**
 * ParseSingle asserts that the response contains a single result,
 * and returns that result.
 * @throws {Error} if the number of results is not exactly one
 * @private
 */
function parseSingle(res, precision) {
    assertNoErrors(res);
    if (res.results.length !== 1) {
        throw new Error("node-influx expected the results length to equal 1, but " +
            `it was ${0}. Please report this here: https://git.io/influx-err`);
    }
    return parseInner(res.results[0].series, precision);
}
exports.parseSingle = parseSingle;


/***/ }),

/***/ 5139:
/***/ ((__unused_webpack_module, exports, __nccwpck_require__) => {

"use strict";

Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.coerceBadly = exports.Schema = void 0;
const grammar_1 = __nccwpck_require__(2309);
/**
 * The Schema provides information and utilities for an InfluxDB measurement.
 * @private
 */
class Schema {
    constructor(options) {
        this.options = options;
        this._tagHash = {};
        // FieldNames are sorted for performance: when coerceFields is run the
        // fields will be added to the output in order.
        this._fieldNames = Object.keys(options.fields).sort();
        options.tags.forEach((tag) => {
            this._tagHash[tag] = true;
        });
    }
    /**
     * CoerceFields converts a map of field values to a strings which
     * can be injected into the line protocol without further escaping.
     * The output is given in [key, value] pairs.
     */
    coerceFields(fields) {
        let consumed = 0;
        const output = [];
        this._fieldNames.forEach((field) => {
            if (!fields.hasOwnProperty(field)) {
                return;
            }
            const value = fields[field];
            const typ = typeof value;
            consumed += 1;
            if (value === null || value === undefined) {
                return;
            }
            let coerced;
            switch (this.options.fields[field]) {
                case grammar_1.FieldType.STRING:
                    coerced = grammar_1.escape.quoted(String(value));
                    break;
                case grammar_1.FieldType.INTEGER:
                    if (typ !== "number" && !grammar_1.isNumeric(String(value))) {
                        throw new Error(`Expected numeric value for ${this._ref(field)}, but got '${value}'!`);
                    }
                    coerced = String(Math.floor(value)) + "i";
                    break;
                case grammar_1.FieldType.FLOAT:
                    if (typ !== "number" && !grammar_1.isNumeric(String(value))) {
                        throw new Error(`Expected numeric value for ${this._ref(field)}, but got '${value}'!`);
                    }
                    coerced = String(value);
                    break;
                case grammar_1.FieldType.BOOLEAN:
                    if (typ !== "boolean") {
                        throw new Error(`Expected boolean value for ${this._ref(field)}, but got a ${typ}!`);
                    }
                    coerced = value ? "T" : "F";
                    break;
                default:
                    throw new Error(`Unknown field type ${this.options.fields[field]} for ${field} in ` +
                        `${this._ref()}. Please ensure that your configuration is correct.`);
            }
            output.push([field, coerced]);
        });
        const keys = Object.keys(fields);
        if (consumed !== keys.length) {
            const extraneous = keys.filter((f) => !this._fieldNames.includes(f));
            throw new Error("Extraneous fields detected for writing InfluxDB point in " +
                `${this._ref()}: \`${extraneous.join("`, `")}\`.`);
        }
        return output;
    }
    /**
     * Throws an error if the tags include values other than
     * what was specified in the schema. It returns a list of tag names.
     */
    checkTags(tags) {
        const names = Object.keys(tags);
        const extraneous = names.filter((tag) => !this._tagHash[tag]);
        if (extraneous.length > 0) {
            throw new Error("Extraneous tags detected for writing InfluxDB point in " +
                `${this._ref()}: \`${extraneous.join("`, `")}\`.`);
        }
        return names;
    }
    /**
     * Returns the 'db'.'measurement'[.'field'] referencing the current schema.
     */
    _ref(field) {
        let out = this.options.database + "." + this.options.measurement;
        if (field) {
            out += "." + field;
        }
        return out;
    }
}
exports.Schema = Schema;
/**
 * Coerces the field map to a set of writable values, a la coerceFields,
 * using native guesses based on the field datatypes.
 * @private
 */
function coerceBadly(fields) {
    return Object.keys(fields)
        .sort()
        .map((field) => {
        const value = fields[field];
        if (typeof value === "string") {
            return [field, grammar_1.escape.quoted(value)];
        }
        return [field, String(value)];
    });
}
exports.coerceBadly = coerceBadly;


/***/ }),

/***/ 4124:
/***/ ((module, __unused_webpack_exports, __nccwpck_require__) => {

try {
  var util = __nccwpck_require__(3837);
  /* istanbul ignore next */
  if (typeof util.inherits !== 'function') throw '';
  module.exports = util.inherits;
} catch (e) {
  /* istanbul ignore next */
  module.exports = __nccwpck_require__(8544);
}


/***/ }),

/***/ 8544:
/***/ ((module) => {

if (typeof Object.create === 'function') {
  // implementation from standard node.js 'util' module
  module.exports = function inherits(ctor, superCtor) {
    if (superCtor) {
      ctor.super_ = superCtor
      ctor.prototype = Object.create(superCtor.prototype, {
        constructor: {
          value: ctor,
          enumerable: false,
          writable: true,
          configurable: true
        }
      })
    }
  };
} else {
  // old school shim for old browsers
  module.exports = function inherits(ctor, superCtor) {
    if (superCtor) {
      ctor.super_ = superCtor
      var TempCtor = function () {}
      TempCtor.prototype = superCtor.prototype
      ctor.prototype = new TempCtor()
      ctor.prototype.constructor = ctor
    }
  }
}


/***/ }),

/***/ 2665:
/***/ ((__unused_webpack_module, exports) => {

"use strict";


Object.defineProperty(exports, "t", ({
    value: true
}));

exports.ContainerIterator = exports.Container = exports.Base = void 0;

class ContainerIterator {
    constructor(t = 0) {
        this.iteratorType = t;
    }
    equals(t) {
        return this.o === t.o;
    }
}

exports.ContainerIterator = ContainerIterator;

class Base {
    constructor() {
        this.i = 0;
    }
    get length() {
        return this.i;
    }
    size() {
        return this.i;
    }
    empty() {
        return this.i === 0;
    }
}

exports.Base = Base;

class Container extends Base {}

exports.Container = Container;
//# sourceMappingURL=index.js.map


/***/ }),

/***/ 6495:
/***/ ((__unused_webpack_module, exports, __nccwpck_require__) => {

"use strict";


Object.defineProperty(exports, "t", ({
    value: true
}));

exports.HashContainerIterator = exports.HashContainer = void 0;

var _ContainerBase = __nccwpck_require__(2665);

var _checkObject = _interopRequireDefault(__nccwpck_require__(8338));

var _throwError = __nccwpck_require__(7422);

function _interopRequireDefault(t) {
    return t && t.t ? t : {
        default: t
    };
}

class HashContainerIterator extends _ContainerBase.ContainerIterator {
    constructor(t, e, i) {
        super(i);
        this.o = t;
        this.h = e;
        if (this.iteratorType === 0) {
            this.pre = function() {
                if (this.o.L === this.h) {
                    (0, _throwError.throwIteratorAccessError)();
                }
                this.o = this.o.L;
                return this;
            };
            this.next = function() {
                if (this.o === this.h) {
                    (0, _throwError.throwIteratorAccessError)();
                }
                this.o = this.o.B;
                return this;
            };
        } else {
            this.pre = function() {
                if (this.o.B === this.h) {
                    (0, _throwError.throwIteratorAccessError)();
                }
                this.o = this.o.B;
                return this;
            };
            this.next = function() {
                if (this.o === this.h) {
                    (0, _throwError.throwIteratorAccessError)();
                }
                this.o = this.o.L;
                return this;
            };
        }
    }
}

exports.HashContainerIterator = HashContainerIterator;

class HashContainer extends _ContainerBase.Container {
    constructor() {
        super();
        this.H = [];
        this.g = {};
        this.HASH_TAG = Symbol("@@HASH_TAG");
        Object.setPrototypeOf(this.g, null);
        this.h = {};
        this.h.L = this.h.B = this.p = this._ = this.h;
    }
    V(t) {
        const {L: e, B: i} = t;
        e.B = i;
        i.L = e;
        if (t === this.p) {
            this.p = i;
        }
        if (t === this._) {
            this._ = e;
        }
        this.i -= 1;
    }
    M(t, e, i) {
        if (i === undefined) i = (0, _checkObject.default)(t);
        let s;
        if (i) {
            const i = t[this.HASH_TAG];
            if (i !== undefined) {
                this.H[i].l = e;
                return this.i;
            }
            Object.defineProperty(t, this.HASH_TAG, {
                value: this.H.length,
                configurable: true
            });
            s = {
                u: t,
                l: e,
                L: this._,
                B: this.h
            };
            this.H.push(s);
        } else {
            const i = this.g[t];
            if (i) {
                i.l = e;
                return this.i;
            }
            s = {
                u: t,
                l: e,
                L: this._,
                B: this.h
            };
            this.g[t] = s;
        }
        if (this.i === 0) {
            this.p = s;
            this.h.B = s;
        } else {
            this._.B = s;
        }
        this._ = s;
        this.h.L = s;
        return ++this.i;
    }
    I(t, e) {
        if (e === undefined) e = (0, _checkObject.default)(t);
        if (e) {
            const e = t[this.HASH_TAG];
            if (e === undefined) return this.h;
            return this.H[e];
        } else {
            return this.g[t] || this.h;
        }
    }
    clear() {
        const t = this.HASH_TAG;
        this.H.forEach((function(e) {
            delete e.u[t];
        }));
        this.H = [];
        this.g = {};
        Object.setPrototypeOf(this.g, null);
        this.i = 0;
        this.p = this._ = this.h.L = this.h.B = this.h;
    }
    eraseElementByKey(t, e) {
        let i;
        if (e === undefined) e = (0, _checkObject.default)(t);
        if (e) {
            const e = t[this.HASH_TAG];
            if (e === undefined) return false;
            delete t[this.HASH_TAG];
            i = this.H[e];
            delete this.H[e];
        } else {
            i = this.g[t];
            if (i === undefined) return false;
            delete this.g[t];
        }
        this.V(i);
        return true;
    }
    eraseElementByIterator(t) {
        const e = t.o;
        if (e === this.h) {
            (0, _throwError.throwIteratorAccessError)();
        }
        this.V(e);
        return t.next();
    }
    eraseElementByPos(t) {
        if (t < 0 || t > this.i - 1) {
            throw new RangeError;
        }
        let e = this.p;
        while (t--) {
            e = e.B;
        }
        this.V(e);
        return this.i;
    }
}

exports.HashContainer = HashContainer;
//# sourceMappingURL=index.js.map


/***/ }),

/***/ 2528:
/***/ ((__unused_webpack_module, exports, __nccwpck_require__) => {

"use strict";


Object.defineProperty(exports, "t", ({
    value: true
}));

exports["default"] = void 0;

var _Base = __nccwpck_require__(6495);

var _checkObject = _interopRequireDefault(__nccwpck_require__(8338));

var _throwError = __nccwpck_require__(7422);

function _interopRequireDefault(t) {
    return t && t.t ? t : {
        default: t
    };
}

class HashMapIterator extends _Base.HashContainerIterator {
    constructor(t, e, r, s) {
        super(t, e, s);
        this.container = r;
    }
    get pointer() {
        if (this.o === this.h) {
            (0, _throwError.throwIteratorAccessError)();
        }
        const t = this;
        return new Proxy([], {
            get(e, r) {
                if (r === "0") return t.o.u; else if (r === "1") return t.o.l;
            },
            set(e, r, s) {
                if (r !== "1") {
                    throw new TypeError("props must be 1");
                }
                t.o.l = s;
                return true;
            }
        });
    }
    copy() {
        return new HashMapIterator(this.o, this.h, this.container, this.iteratorType);
    }
}

class HashMap extends _Base.HashContainer {
    constructor(t = []) {
        super();
        const e = this;
        t.forEach((function(t) {
            e.setElement(t[0], t[1]);
        }));
    }
    begin() {
        return new HashMapIterator(this.p, this.h, this);
    }
    end() {
        return new HashMapIterator(this.h, this.h, this);
    }
    rBegin() {
        return new HashMapIterator(this._, this.h, this, 1);
    }
    rEnd() {
        return new HashMapIterator(this.h, this.h, this, 1);
    }
    front() {
        if (this.i === 0) return;
        return [ this.p.u, this.p.l ];
    }
    back() {
        if (this.i === 0) return;
        return [ this._.u, this._.l ];
    }
    setElement(t, e, r) {
        return this.M(t, e, r);
    }
    getElementByKey(t, e) {
        if (e === undefined) e = (0, _checkObject.default)(t);
        if (e) {
            const e = t[this.HASH_TAG];
            return e !== undefined ? this.H[e].l : undefined;
        }
        const r = this.g[t];
        return r ? r.l : undefined;
    }
    getElementByPos(t) {
        if (t < 0 || t > this.i - 1) {
            throw new RangeError;
        }
        let e = this.p;
        while (t--) {
            e = e.B;
        }
        return [ e.u, e.l ];
    }
    find(t, e) {
        const r = this.I(t, e);
        return new HashMapIterator(r, this.h, this);
    }
    forEach(t) {
        let e = 0;
        let r = this.p;
        while (r !== this.h) {
            t([ r.u, r.l ], e++, this);
            r = r.B;
        }
    }
    [Symbol.iterator]() {
        return function*() {
            let t = this.p;
            while (t !== this.h) {
                yield [ t.u, t.l ];
                t = t.B;
            }
        }.bind(this)();
    }
}

var _default = HashMap;

exports["default"] = _default;
//# sourceMappingURL=HashMap.js.map


/***/ }),

/***/ 3664:
/***/ ((__unused_webpack_module, exports, __nccwpck_require__) => {

"use strict";


Object.defineProperty(exports, "t", ({
    value: true
}));

exports["default"] = void 0;

var _Base = __nccwpck_require__(6495);

var _throwError = __nccwpck_require__(7422);

class HashSetIterator extends _Base.HashContainerIterator {
    constructor(t, e, r, s) {
        super(t, e, s);
        this.container = r;
    }
    get pointer() {
        if (this.o === this.h) {
            (0, _throwError.throwIteratorAccessError)();
        }
        return this.o.u;
    }
    copy() {
        return new HashSetIterator(this.o, this.h, this.container, this.iteratorType);
    }
}

class HashSet extends _Base.HashContainer {
    constructor(t = []) {
        super();
        const e = this;
        t.forEach((function(t) {
            e.insert(t);
        }));
    }
    begin() {
        return new HashSetIterator(this.p, this.h, this);
    }
    end() {
        return new HashSetIterator(this.h, this.h, this);
    }
    rBegin() {
        return new HashSetIterator(this._, this.h, this, 1);
    }
    rEnd() {
        return new HashSetIterator(this.h, this.h, this, 1);
    }
    front() {
        return this.p.u;
    }
    back() {
        return this._.u;
    }
    insert(t, e) {
        return this.M(t, undefined, e);
    }
    getElementByPos(t) {
        if (t < 0 || t > this.i - 1) {
            throw new RangeError;
        }
        let e = this.p;
        while (t--) {
            e = e.B;
        }
        return e.u;
    }
    find(t, e) {
        const r = this.I(t, e);
        return new HashSetIterator(r, this.h, this);
    }
    forEach(t) {
        let e = 0;
        let r = this.p;
        while (r !== this.h) {
            t(r.u, e++, this);
            r = r.B;
        }
    }
    [Symbol.iterator]() {
        return function*() {
            let t = this.p;
            while (t !== this.h) {
                yield t.u;
                t = t.B;
            }
        }.bind(this)();
    }
}

var _default = HashSet;

exports["default"] = _default;
//# sourceMappingURL=HashSet.js.map


/***/ }),

/***/ 7732:
/***/ ((__unused_webpack_module, exports, __nccwpck_require__) => {

"use strict";


Object.defineProperty(exports, "t", ({
    value: true
}));

exports["default"] = void 0;

var _ContainerBase = __nccwpck_require__(2665);

class PriorityQueue extends _ContainerBase.Base {
    constructor(t = [], s = function(t, s) {
        if (t > s) return -1;
        if (t < s) return 1;
        return 0;
    }, i = true) {
        super();
        this.v = s;
        if (Array.isArray(t)) {
            this.C = i ? [ ...t ] : t;
        } else {
            this.C = [];
            const s = this;
            t.forEach((function(t) {
                s.C.push(t);
            }));
        }
        this.i = this.C.length;
        const e = this.i >> 1;
        for (let t = this.i - 1 >> 1; t >= 0; --t) {
            this.k(t, e);
        }
    }
    m(t) {
        const s = this.C[t];
        while (t > 0) {
            const i = t - 1 >> 1;
            const e = this.C[i];
            if (this.v(e, s) <= 0) break;
            this.C[t] = e;
            t = i;
        }
        this.C[t] = s;
    }
    k(t, s) {
        const i = this.C[t];
        while (t < s) {
            let s = t << 1 | 1;
            const e = s + 1;
            let h = this.C[s];
            if (e < this.i && this.v(h, this.C[e]) > 0) {
                s = e;
                h = this.C[e];
            }
            if (this.v(h, i) >= 0) break;
            this.C[t] = h;
            t = s;
        }
        this.C[t] = i;
    }
    clear() {
        this.i = 0;
        this.C.length = 0;
    }
    push(t) {
        this.C.push(t);
        this.m(this.i);
        this.i += 1;
    }
    pop() {
        if (this.i === 0) return;
        const t = this.C[0];
        const s = this.C.pop();
        this.i -= 1;
        if (this.i) {
            this.C[0] = s;
            this.k(0, this.i >> 1);
        }
        return t;
    }
    top() {
        return this.C[0];
    }
    find(t) {
        return this.C.indexOf(t) >= 0;
    }
    remove(t) {
        const s = this.C.indexOf(t);
        if (s < 0) return false;
        if (s === 0) {
            this.pop();
        } else if (s === this.i - 1) {
            this.C.pop();
            this.i -= 1;
        } else {
            this.C.splice(s, 1, this.C.pop());
            this.i -= 1;
            this.m(s);
            this.k(s, this.i >> 1);
        }
        return true;
    }
    updateItem(t) {
        const s = this.C.indexOf(t);
        if (s < 0) return false;
        this.m(s);
        this.k(s, this.i >> 1);
        return true;
    }
    toArray() {
        return [ ...this.C ];
    }
}

var _default = PriorityQueue;

exports["default"] = _default;
//# sourceMappingURL=PriorityQueue.js.map


/***/ }),

/***/ 2174:
/***/ ((__unused_webpack_module, exports, __nccwpck_require__) => {

"use strict";


Object.defineProperty(exports, "t", ({
    value: true
}));

exports["default"] = void 0;

var _ContainerBase = __nccwpck_require__(2665);

class Queue extends _ContainerBase.Base {
    constructor(t = []) {
        super();
        this.j = 0;
        this.q = [];
        const s = this;
        t.forEach((function(t) {
            s.push(t);
        }));
    }
    clear() {
        this.q = [];
        this.i = this.j = 0;
    }
    push(t) {
        const s = this.q.length;
        if (this.j / s > .5 && this.j + this.i >= s && s > 4096) {
            const s = this.i;
            for (let t = 0; t < s; ++t) {
                this.q[t] = this.q[this.j + t];
            }
            this.j = 0;
            this.q[this.i] = t;
        } else this.q[this.j + this.i] = t;
        return ++this.i;
    }
    pop() {
        if (this.i === 0) return;
        const t = this.q[this.j++];
        this.i -= 1;
        return t;
    }
    front() {
        if (this.i === 0) return;
        return this.q[this.j];
    }
}

var _default = Queue;

exports["default"] = _default;
//# sourceMappingURL=Queue.js.map


/***/ }),

/***/ 7501:
/***/ ((__unused_webpack_module, exports, __nccwpck_require__) => {

"use strict";


Object.defineProperty(exports, "t", ({
    value: true
}));

exports["default"] = void 0;

var _ContainerBase = __nccwpck_require__(2665);

class Stack extends _ContainerBase.Base {
    constructor(t = []) {
        super();
        this.S = [];
        const s = this;
        t.forEach((function(t) {
            s.push(t);
        }));
    }
    clear() {
        this.i = 0;
        this.S = [];
    }
    push(t) {
        this.S.push(t);
        this.i += 1;
        return this.i;
    }
    pop() {
        if (this.i === 0) return;
        this.i -= 1;
        return this.S.pop();
    }
    top() {
        return this.S[this.i - 1];
    }
}

var _default = Stack;

exports["default"] = _default;
//# sourceMappingURL=Stack.js.map


/***/ }),

/***/ 5569:
/***/ ((__unused_webpack_module, exports, __nccwpck_require__) => {

"use strict";


Object.defineProperty(exports, "t", ({
    value: true
}));

exports.RandomIterator = void 0;

var _ContainerBase = __nccwpck_require__(2665);

var _throwError = __nccwpck_require__(7422);

class RandomIterator extends _ContainerBase.ContainerIterator {
    constructor(t, r) {
        super(r);
        this.o = t;
        if (this.iteratorType === 0) {
            this.pre = function() {
                if (this.o === 0) {
                    (0, _throwError.throwIteratorAccessError)();
                }
                this.o -= 1;
                return this;
            };
            this.next = function() {
                if (this.o === this.container.size()) {
                    (0, _throwError.throwIteratorAccessError)();
                }
                this.o += 1;
                return this;
            };
        } else {
            this.pre = function() {
                if (this.o === this.container.size() - 1) {
                    (0, _throwError.throwIteratorAccessError)();
                }
                this.o += 1;
                return this;
            };
            this.next = function() {
                if (this.o === -1) {
                    (0, _throwError.throwIteratorAccessError)();
                }
                this.o -= 1;
                return this;
            };
        }
    }
    get pointer() {
        return this.container.getElementByPos(this.o);
    }
    set pointer(t) {
        this.container.setElementByPos(this.o, t);
    }
}

exports.RandomIterator = RandomIterator;
//# sourceMappingURL=RandomIterator.js.map


/***/ }),

/***/ 3315:
/***/ ((__unused_webpack_module, exports, __nccwpck_require__) => {

"use strict";


Object.defineProperty(exports, "t", ({
    value: true
}));

exports["default"] = void 0;

var _ContainerBase = __nccwpck_require__(2665);

class SequentialContainer extends _ContainerBase.Container {}

var _default = SequentialContainer;

exports["default"] = _default;
//# sourceMappingURL=index.js.map


/***/ }),

/***/ 3949:
/***/ ((__unused_webpack_module, exports, __nccwpck_require__) => {

"use strict";


Object.defineProperty(exports, "t", ({
    value: true
}));

exports["default"] = void 0;

var _Base = _interopRequireDefault(__nccwpck_require__(3315));

var _RandomIterator = __nccwpck_require__(5569);

function _interopRequireDefault(t) {
    return t && t.t ? t : {
        default: t
    };
}

class DequeIterator extends _RandomIterator.RandomIterator {
    constructor(t, i, s) {
        super(t, s);
        this.container = i;
    }
    copy() {
        return new DequeIterator(this.o, this.container, this.iteratorType);
    }
}

class Deque extends _Base.default {
    constructor(t = [], i = 1 << 12) {
        super();
        this.j = 0;
        this.D = 0;
        this.R = 0;
        this.N = 0;
        this.P = 0;
        this.A = [];
        const s = (() => {
            if (typeof t.length === "number") return t.length;
            if (typeof t.size === "number") return t.size;
            if (typeof t.size === "function") return t.size();
            throw new TypeError("Cannot get the length or size of the container");
        })();
        this.F = i;
        this.P = Math.max(Math.ceil(s / this.F), 1);
        for (let t = 0; t < this.P; ++t) {
            this.A.push(new Array(this.F));
        }
        const h = Math.ceil(s / this.F);
        this.j = this.R = (this.P >> 1) - (h >> 1);
        this.D = this.N = this.F - s % this.F >> 1;
        const e = this;
        t.forEach((function(t) {
            e.pushBack(t);
        }));
    }
    T() {
        const t = [];
        const i = Math.max(this.P >> 1, 1);
        for (let s = 0; s < i; ++s) {
            t[s] = new Array(this.F);
        }
        for (let i = this.j; i < this.P; ++i) {
            t[t.length] = this.A[i];
        }
        for (let i = 0; i < this.R; ++i) {
            t[t.length] = this.A[i];
        }
        t[t.length] = [ ...this.A[this.R] ];
        this.j = i;
        this.R = t.length - 1;
        for (let s = 0; s < i; ++s) {
            t[t.length] = new Array(this.F);
        }
        this.A = t;
        this.P = t.length;
    }
    O(t) {
        const i = this.D + t + 1;
        const s = i % this.F;
        let h = s - 1;
        let e = this.j + (i - s) / this.F;
        if (s === 0) e -= 1;
        e %= this.P;
        if (h < 0) h += this.F;
        return {
            curNodeBucketIndex: e,
            curNodePointerIndex: h
        };
    }
    clear() {
        this.A = [ new Array(this.F) ];
        this.P = 1;
        this.j = this.R = this.i = 0;
        this.D = this.N = this.F >> 1;
    }
    begin() {
        return new DequeIterator(0, this);
    }
    end() {
        return new DequeIterator(this.i, this);
    }
    rBegin() {
        return new DequeIterator(this.i - 1, this, 1);
    }
    rEnd() {
        return new DequeIterator(-1, this, 1);
    }
    front() {
        if (this.i === 0) return;
        return this.A[this.j][this.D];
    }
    back() {
        if (this.i === 0) return;
        return this.A[this.R][this.N];
    }
    pushBack(t) {
        if (this.i) {
            if (this.N < this.F - 1) {
                this.N += 1;
            } else if (this.R < this.P - 1) {
                this.R += 1;
                this.N = 0;
            } else {
                this.R = 0;
                this.N = 0;
            }
            if (this.R === this.j && this.N === this.D) this.T();
        }
        this.i += 1;
        this.A[this.R][this.N] = t;
        return this.i;
    }
    popBack() {
        if (this.i === 0) return;
        const t = this.A[this.R][this.N];
        if (this.i !== 1) {
            if (this.N > 0) {
                this.N -= 1;
            } else if (this.R > 0) {
                this.R -= 1;
                this.N = this.F - 1;
            } else {
                this.R = this.P - 1;
                this.N = this.F - 1;
            }
        }
        this.i -= 1;
        return t;
    }
    pushFront(t) {
        if (this.i) {
            if (this.D > 0) {
                this.D -= 1;
            } else if (this.j > 0) {
                this.j -= 1;
                this.D = this.F - 1;
            } else {
                this.j = this.P - 1;
                this.D = this.F - 1;
            }
            if (this.j === this.R && this.D === this.N) this.T();
        }
        this.i += 1;
        this.A[this.j][this.D] = t;
        return this.i;
    }
    popFront() {
        if (this.i === 0) return;
        const t = this.A[this.j][this.D];
        if (this.i !== 1) {
            if (this.D < this.F - 1) {
                this.D += 1;
            } else if (this.j < this.P - 1) {
                this.j += 1;
                this.D = 0;
            } else {
                this.j = 0;
                this.D = 0;
            }
        }
        this.i -= 1;
        return t;
    }
    getElementByPos(t) {
        if (t < 0 || t > this.i - 1) {
            throw new RangeError;
        }
        const {curNodeBucketIndex: i, curNodePointerIndex: s} = this.O(t);
        return this.A[i][s];
    }
    setElementByPos(t, i) {
        if (t < 0 || t > this.i - 1) {
            throw new RangeError;
        }
        const {curNodeBucketIndex: s, curNodePointerIndex: h} = this.O(t);
        this.A[s][h] = i;
    }
    insert(t, i, s = 1) {
        if (t < 0 || t > this.i) {
            throw new RangeError;
        }
        if (t === 0) {
            while (s--) this.pushFront(i);
        } else if (t === this.i) {
            while (s--) this.pushBack(i);
        } else {
            const h = [];
            for (let i = t; i < this.i; ++i) {
                h.push(this.getElementByPos(i));
            }
            this.cut(t - 1);
            for (let t = 0; t < s; ++t) this.pushBack(i);
            for (let t = 0; t < h.length; ++t) this.pushBack(h[t]);
        }
        return this.i;
    }
    cut(t) {
        if (t < 0) {
            this.clear();
            return 0;
        }
        const {curNodeBucketIndex: i, curNodePointerIndex: s} = this.O(t);
        this.R = i;
        this.N = s;
        this.i = t + 1;
        return this.i;
    }
    eraseElementByPos(t) {
        if (t < 0 || t > this.i - 1) {
            throw new RangeError;
        }
        if (t === 0) this.popFront(); else if (t === this.i - 1) this.popBack(); else {
            const i = [];
            for (let s = t + 1; s < this.i; ++s) {
                i.push(this.getElementByPos(s));
            }
            this.cut(t);
            this.popBack();
            const s = this;
            i.forEach((function(t) {
                s.pushBack(t);
            }));
        }
        return this.i;
    }
    eraseElementByValue(t) {
        if (this.i === 0) return 0;
        const i = [];
        for (let s = 0; s < this.i; ++s) {
            const h = this.getElementByPos(s);
            if (h !== t) i.push(h);
        }
        const s = i.length;
        for (let t = 0; t < s; ++t) this.setElementByPos(t, i[t]);
        return this.cut(s - 1);
    }
    eraseElementByIterator(t) {
        const i = t.o;
        this.eraseElementByPos(i);
        t = t.next();
        return t;
    }
    find(t) {
        for (let i = 0; i < this.i; ++i) {
            if (this.getElementByPos(i) === t) {
                return new DequeIterator(i, this);
            }
        }
        return this.end();
    }
    reverse() {
        let t = 0;
        let i = this.i - 1;
        while (t < i) {
            const s = this.getElementByPos(t);
            this.setElementByPos(t, this.getElementByPos(i));
            this.setElementByPos(i, s);
            t += 1;
            i -= 1;
        }
    }
    unique() {
        if (this.i <= 1) {
            return this.i;
        }
        let t = 1;
        let i = this.getElementByPos(0);
        for (let s = 1; s < this.i; ++s) {
            const h = this.getElementByPos(s);
            if (h !== i) {
                i = h;
                this.setElementByPos(t++, h);
            }
        }
        while (this.i > t) this.popBack();
        return this.i;
    }
    sort(t) {
        const i = [];
        for (let t = 0; t < this.i; ++t) {
            i.push(this.getElementByPos(t));
        }
        i.sort(t);
        for (let t = 0; t < this.i; ++t) this.setElementByPos(t, i[t]);
    }
    shrinkToFit() {
        if (this.i === 0) return;
        const t = [];
        this.forEach((function(i) {
            t.push(i);
        }));
        this.P = Math.max(Math.ceil(this.i / this.F), 1);
        this.i = this.j = this.R = this.D = this.N = 0;
        this.A = [];
        for (let t = 0; t < this.P; ++t) {
            this.A.push(new Array(this.F));
        }
        for (let i = 0; i < t.length; ++i) this.pushBack(t[i]);
    }
    forEach(t) {
        for (let i = 0; i < this.i; ++i) {
            t(this.getElementByPos(i), i, this);
        }
    }
    [Symbol.iterator]() {
        return function*() {
            for (let t = 0; t < this.i; ++t) {
                yield this.getElementByPos(t);
            }
        }.bind(this)();
    }
}

var _default = Deque;

exports["default"] = _default;
//# sourceMappingURL=Deque.js.map


/***/ }),

/***/ 7908:
/***/ ((__unused_webpack_module, exports, __nccwpck_require__) => {

"use strict";


Object.defineProperty(exports, "t", ({
    value: true
}));

exports["default"] = void 0;

var _Base = _interopRequireDefault(__nccwpck_require__(3315));

var _ContainerBase = __nccwpck_require__(2665);

var _throwError = __nccwpck_require__(7422);

function _interopRequireDefault(t) {
    return t && t.t ? t : {
        default: t
    };
}

class LinkListIterator extends _ContainerBase.ContainerIterator {
    constructor(t, i, s, r) {
        super(r);
        this.o = t;
        this.h = i;
        this.container = s;
        if (this.iteratorType === 0) {
            this.pre = function() {
                if (this.o.L === this.h) {
                    (0, _throwError.throwIteratorAccessError)();
                }
                this.o = this.o.L;
                return this;
            };
            this.next = function() {
                if (this.o === this.h) {
                    (0, _throwError.throwIteratorAccessError)();
                }
                this.o = this.o.B;
                return this;
            };
        } else {
            this.pre = function() {
                if (this.o.B === this.h) {
                    (0, _throwError.throwIteratorAccessError)();
                }
                this.o = this.o.B;
                return this;
            };
            this.next = function() {
                if (this.o === this.h) {
                    (0, _throwError.throwIteratorAccessError)();
                }
                this.o = this.o.L;
                return this;
            };
        }
    }
    get pointer() {
        if (this.o === this.h) {
            (0, _throwError.throwIteratorAccessError)();
        }
        return this.o.l;
    }
    set pointer(t) {
        if (this.o === this.h) {
            (0, _throwError.throwIteratorAccessError)();
        }
        this.o.l = t;
    }
    copy() {
        return new LinkListIterator(this.o, this.h, this.container, this.iteratorType);
    }
}

class LinkList extends _Base.default {
    constructor(t = []) {
        super();
        this.h = {};
        this.p = this._ = this.h.L = this.h.B = this.h;
        const i = this;
        t.forEach((function(t) {
            i.pushBack(t);
        }));
    }
    V(t) {
        const {L: i, B: s} = t;
        i.B = s;
        s.L = i;
        if (t === this.p) {
            this.p = s;
        }
        if (t === this._) {
            this._ = i;
        }
        this.i -= 1;
    }
    G(t, i) {
        const s = i.B;
        const r = {
            l: t,
            L: i,
            B: s
        };
        i.B = r;
        s.L = r;
        if (i === this.h) {
            this.p = r;
        }
        if (s === this.h) {
            this._ = r;
        }
        this.i += 1;
    }
    clear() {
        this.i = 0;
        this.p = this._ = this.h.L = this.h.B = this.h;
    }
    begin() {
        return new LinkListIterator(this.p, this.h, this);
    }
    end() {
        return new LinkListIterator(this.h, this.h, this);
    }
    rBegin() {
        return new LinkListIterator(this._, this.h, this, 1);
    }
    rEnd() {
        return new LinkListIterator(this.h, this.h, this, 1);
    }
    front() {
        return this.p.l;
    }
    back() {
        return this._.l;
    }
    getElementByPos(t) {
        if (t < 0 || t > this.i - 1) {
            throw new RangeError;
        }
        let i = this.p;
        while (t--) {
            i = i.B;
        }
        return i.l;
    }
    eraseElementByPos(t) {
        if (t < 0 || t > this.i - 1) {
            throw new RangeError;
        }
        let i = this.p;
        while (t--) {
            i = i.B;
        }
        this.V(i);
        return this.i;
    }
    eraseElementByValue(t) {
        let i = this.p;
        while (i !== this.h) {
            if (i.l === t) {
                this.V(i);
            }
            i = i.B;
        }
        return this.i;
    }
    eraseElementByIterator(t) {
        const i = t.o;
        if (i === this.h) {
            (0, _throwError.throwIteratorAccessError)();
        }
        t = t.next();
        this.V(i);
        return t;
    }
    pushBack(t) {
        this.G(t, this._);
        return this.i;
    }
    popBack() {
        if (this.i === 0) return;
        const t = this._.l;
        this.V(this._);
        return t;
    }
    pushFront(t) {
        this.G(t, this.h);
        return this.i;
    }
    popFront() {
        if (this.i === 0) return;
        const t = this.p.l;
        this.V(this.p);
        return t;
    }
    setElementByPos(t, i) {
        if (t < 0 || t > this.i - 1) {
            throw new RangeError;
        }
        let s = this.p;
        while (t--) {
            s = s.B;
        }
        s.l = i;
    }
    insert(t, i, s = 1) {
        if (t < 0 || t > this.i) {
            throw new RangeError;
        }
        if (s <= 0) return this.i;
        if (t === 0) {
            while (s--) this.pushFront(i);
        } else if (t === this.i) {
            while (s--) this.pushBack(i);
        } else {
            let r = this.p;
            for (let i = 1; i < t; ++i) {
                r = r.B;
            }
            const e = r.B;
            this.i += s;
            while (s--) {
                r.B = {
                    l: i,
                    L: r
                };
                r.B.L = r;
                r = r.B;
            }
            r.B = e;
            e.L = r;
        }
        return this.i;
    }
    find(t) {
        let i = this.p;
        while (i !== this.h) {
            if (i.l === t) {
                return new LinkListIterator(i, this.h, this);
            }
            i = i.B;
        }
        return this.end();
    }
    reverse() {
        if (this.i <= 1) return;
        let t = this.p;
        let i = this._;
        let s = 0;
        while (s << 1 < this.i) {
            const r = t.l;
            t.l = i.l;
            i.l = r;
            t = t.B;
            i = i.L;
            s += 1;
        }
    }
    unique() {
        if (this.i <= 1) {
            return this.i;
        }
        let t = this.p;
        while (t !== this.h) {
            let i = t;
            while (i.B !== this.h && i.l === i.B.l) {
                i = i.B;
                this.i -= 1;
            }
            t.B = i.B;
            t.B.L = t;
            t = t.B;
        }
        return this.i;
    }
    sort(t) {
        if (this.i <= 1) return;
        const i = [];
        this.forEach((function(t) {
            i.push(t);
        }));
        i.sort(t);
        let s = this.p;
        i.forEach((function(t) {
            s.l = t;
            s = s.B;
        }));
    }
    merge(t) {
        const i = this;
        if (this.i === 0) {
            t.forEach((function(t) {
                i.pushBack(t);
            }));
        } else {
            let s = this.p;
            t.forEach((function(t) {
                while (s !== i.h && s.l <= t) {
                    s = s.B;
                }
                i.G(t, s.L);
            }));
        }
        return this.i;
    }
    forEach(t) {
        let i = this.p;
        let s = 0;
        while (i !== this.h) {
            t(i.l, s++, this);
            i = i.B;
        }
    }
    [Symbol.iterator]() {
        return function*() {
            if (this.i === 0) return;
            let t = this.p;
            while (t !== this.h) {
                yield t.l;
                t = t.B;
            }
        }.bind(this)();
    }
}

var _default = LinkList;

exports["default"] = _default;
//# sourceMappingURL=LinkList.js.map


/***/ }),

/***/ 1592:
/***/ ((__unused_webpack_module, exports, __nccwpck_require__) => {

"use strict";


Object.defineProperty(exports, "t", ({
    value: true
}));

exports["default"] = void 0;

var _Base = _interopRequireDefault(__nccwpck_require__(3315));

var _RandomIterator = __nccwpck_require__(5569);

function _interopRequireDefault(t) {
    return t && t.t ? t : {
        default: t
    };
}

class VectorIterator extends _RandomIterator.RandomIterator {
    constructor(t, r, e) {
        super(t, e);
        this.container = r;
    }
    copy() {
        return new VectorIterator(this.o, this.container, this.iteratorType);
    }
}

class Vector extends _Base.default {
    constructor(t = [], r = true) {
        super();
        if (Array.isArray(t)) {
            this.J = r ? [ ...t ] : t;
            this.i = t.length;
        } else {
            this.J = [];
            const r = this;
            t.forEach((function(t) {
                r.pushBack(t);
            }));
        }
    }
    clear() {
        this.i = 0;
        this.J.length = 0;
    }
    begin() {
        return new VectorIterator(0, this);
    }
    end() {
        return new VectorIterator(this.i, this);
    }
    rBegin() {
        return new VectorIterator(this.i - 1, this, 1);
    }
    rEnd() {
        return new VectorIterator(-1, this, 1);
    }
    front() {
        return this.J[0];
    }
    back() {
        return this.J[this.i - 1];
    }
    getElementByPos(t) {
        if (t < 0 || t > this.i - 1) {
            throw new RangeError;
        }
        return this.J[t];
    }
    eraseElementByPos(t) {
        if (t < 0 || t > this.i - 1) {
            throw new RangeError;
        }
        this.J.splice(t, 1);
        this.i -= 1;
        return this.i;
    }
    eraseElementByValue(t) {
        let r = 0;
        for (let e = 0; e < this.i; ++e) {
            if (this.J[e] !== t) {
                this.J[r++] = this.J[e];
            }
        }
        this.i = this.J.length = r;
        return this.i;
    }
    eraseElementByIterator(t) {
        const r = t.o;
        t = t.next();
        this.eraseElementByPos(r);
        return t;
    }
    pushBack(t) {
        this.J.push(t);
        this.i += 1;
        return this.i;
    }
    popBack() {
        if (this.i === 0) return;
        this.i -= 1;
        return this.J.pop();
    }
    setElementByPos(t, r) {
        if (t < 0 || t > this.i - 1) {
            throw new RangeError;
        }
        this.J[t] = r;
    }
    insert(t, r, e = 1) {
        if (t < 0 || t > this.i) {
            throw new RangeError;
        }
        this.J.splice(t, 0, ...new Array(e).fill(r));
        this.i += e;
        return this.i;
    }
    find(t) {
        for (let r = 0; r < this.i; ++r) {
            if (this.J[r] === t) {
                return new VectorIterator(r, this);
            }
        }
        return this.end();
    }
    reverse() {
        this.J.reverse();
    }
    unique() {
        let t = 1;
        for (let r = 1; r < this.i; ++r) {
            if (this.J[r] !== this.J[r - 1]) {
                this.J[t++] = this.J[r];
            }
        }
        this.i = this.J.length = t;
        return this.i;
    }
    sort(t) {
        this.J.sort(t);
    }
    forEach(t) {
        for (let r = 0; r < this.i; ++r) {
            t(this.J[r], r, this);
        }
    }
    [Symbol.iterator]() {
        return function*() {
            yield* this.J;
        }.bind(this)();
    }
}

var _default = Vector;

exports["default"] = _default;
//# sourceMappingURL=Vector.js.map


/***/ }),

/***/ 5001:
/***/ ((__unused_webpack_module, exports, __nccwpck_require__) => {

"use strict";


Object.defineProperty(exports, "t", ({
    value: true
}));

exports["default"] = void 0;

var _ContainerBase = __nccwpck_require__(2665);

var _throwError = __nccwpck_require__(7422);

class TreeIterator extends _ContainerBase.ContainerIterator {
    constructor(t, r, i) {
        super(i);
        this.o = t;
        this.h = r;
        if (this.iteratorType === 0) {
            this.pre = function() {
                if (this.o === this.h.U) {
                    (0, _throwError.throwIteratorAccessError)();
                }
                this.o = this.o.L();
                return this;
            };
            this.next = function() {
                if (this.o === this.h) {
                    (0, _throwError.throwIteratorAccessError)();
                }
                this.o = this.o.B();
                return this;
            };
        } else {
            this.pre = function() {
                if (this.o === this.h.W) {
                    (0, _throwError.throwIteratorAccessError)();
                }
                this.o = this.o.B();
                return this;
            };
            this.next = function() {
                if (this.o === this.h) {
                    (0, _throwError.throwIteratorAccessError)();
                }
                this.o = this.o.L();
                return this;
            };
        }
    }
    get index() {
        let t = this.o;
        const r = this.h.tt;
        if (t === this.h) {
            if (r) {
                return r.rt - 1;
            }
            return 0;
        }
        let i = 0;
        if (t.U) {
            i += t.U.rt;
        }
        while (t !== r) {
            const r = t.tt;
            if (t === r.W) {
                i += 1;
                if (r.U) {
                    i += r.U.rt;
                }
            }
            t = r;
        }
        return i;
    }
}

var _default = TreeIterator;

exports["default"] = _default;
//# sourceMappingURL=TreeIterator.js.map


/***/ }),

/***/ 6711:
/***/ ((__unused_webpack_module, exports) => {

"use strict";


Object.defineProperty(exports, "t", ({
    value: true
}));

exports.TreeNodeEnableIndex = exports.TreeNode = void 0;

class TreeNode {
    constructor(e, t) {
        this.ee = 1;
        this.u = undefined;
        this.l = undefined;
        this.U = undefined;
        this.W = undefined;
        this.tt = undefined;
        this.u = e;
        this.l = t;
    }
    L() {
        let e = this;
        if (e.ee === 1 && e.tt.tt === e) {
            e = e.W;
        } else if (e.U) {
            e = e.U;
            while (e.W) {
                e = e.W;
            }
        } else {
            let t = e.tt;
            while (t.U === e) {
                e = t;
                t = e.tt;
            }
            e = t;
        }
        return e;
    }
    B() {
        let e = this;
        if (e.W) {
            e = e.W;
            while (e.U) {
                e = e.U;
            }
            return e;
        } else {
            let t = e.tt;
            while (t.W === e) {
                e = t;
                t = e.tt;
            }
            if (e.W !== t) {
                return t;
            } else return e;
        }
    }
    te() {
        const e = this.tt;
        const t = this.W;
        const s = t.U;
        if (e.tt === this) e.tt = t; else if (e.U === this) e.U = t; else e.W = t;
        t.tt = e;
        t.U = this;
        this.tt = t;
        this.W = s;
        if (s) s.tt = this;
        return t;
    }
    se() {
        const e = this.tt;
        const t = this.U;
        const s = t.W;
        if (e.tt === this) e.tt = t; else if (e.U === this) e.U = t; else e.W = t;
        t.tt = e;
        t.W = this;
        this.tt = t;
        this.U = s;
        if (s) s.tt = this;
        return t;
    }
}

exports.TreeNode = TreeNode;

class TreeNodeEnableIndex extends TreeNode {
    constructor() {
        super(...arguments);
        this.rt = 1;
    }
    te() {
        const e = super.te();
        this.ie();
        e.ie();
        return e;
    }
    se() {
        const e = super.se();
        this.ie();
        e.ie();
        return e;
    }
    ie() {
        this.rt = 1;
        if (this.U) {
            this.rt += this.U.rt;
        }
        if (this.W) {
            this.rt += this.W.rt;
        }
    }
}

exports.TreeNodeEnableIndex = TreeNodeEnableIndex;
//# sourceMappingURL=TreeNode.js.map


/***/ }),

/***/ 4851:
/***/ ((__unused_webpack_module, exports, __nccwpck_require__) => {

"use strict";


Object.defineProperty(exports, "t", ({
    value: true
}));

exports["default"] = void 0;

var _TreeNode = __nccwpck_require__(6711);

var _ContainerBase = __nccwpck_require__(2665);

var _throwError = __nccwpck_require__(7422);

class TreeContainer extends _ContainerBase.Container {
    constructor(e = function(e, t) {
        if (e < t) return -1;
        if (e > t) return 1;
        return 0;
    }, t = false) {
        super();
        this.Y = undefined;
        this.v = e;
        if (t) {
            this.re = _TreeNode.TreeNodeEnableIndex;
            this.M = function(e, t, i) {
                const s = this.ne(e, t, i);
                if (s) {
                    let e = s.tt;
                    while (e !== this.h) {
                        e.rt += 1;
                        e = e.tt;
                    }
                    const t = this.he(s);
                    if (t) {
                        const {parentNode: e, grandParent: i, curNode: s} = t;
                        e.ie();
                        i.ie();
                        s.ie();
                    }
                }
                return this.i;
            };
            this.V = function(e) {
                let t = this.fe(e);
                while (t !== this.h) {
                    t.rt -= 1;
                    t = t.tt;
                }
            };
        } else {
            this.re = _TreeNode.TreeNode;
            this.M = function(e, t, i) {
                const s = this.ne(e, t, i);
                if (s) this.he(s);
                return this.i;
            };
            this.V = this.fe;
        }
        this.h = new this.re;
    }
    X(e, t) {
        let i = this.h;
        while (e) {
            const s = this.v(e.u, t);
            if (s < 0) {
                e = e.W;
            } else if (s > 0) {
                i = e;
                e = e.U;
            } else return e;
        }
        return i;
    }
    Z(e, t) {
        let i = this.h;
        while (e) {
            const s = this.v(e.u, t);
            if (s <= 0) {
                e = e.W;
            } else {
                i = e;
                e = e.U;
            }
        }
        return i;
    }
    $(e, t) {
        let i = this.h;
        while (e) {
            const s = this.v(e.u, t);
            if (s < 0) {
                i = e;
                e = e.W;
            } else if (s > 0) {
                e = e.U;
            } else return e;
        }
        return i;
    }
    rr(e, t) {
        let i = this.h;
        while (e) {
            const s = this.v(e.u, t);
            if (s < 0) {
                i = e;
                e = e.W;
            } else {
                e = e.U;
            }
        }
        return i;
    }
    ue(e) {
        while (true) {
            const t = e.tt;
            if (t === this.h) return;
            if (e.ee === 1) {
                e.ee = 0;
                return;
            }
            if (e === t.U) {
                const i = t.W;
                if (i.ee === 1) {
                    i.ee = 0;
                    t.ee = 1;
                    if (t === this.Y) {
                        this.Y = t.te();
                    } else t.te();
                } else {
                    if (i.W && i.W.ee === 1) {
                        i.ee = t.ee;
                        t.ee = 0;
                        i.W.ee = 0;
                        if (t === this.Y) {
                            this.Y = t.te();
                        } else t.te();
                        return;
                    } else if (i.U && i.U.ee === 1) {
                        i.ee = 1;
                        i.U.ee = 0;
                        i.se();
                    } else {
                        i.ee = 1;
                        e = t;
                    }
                }
            } else {
                const i = t.U;
                if (i.ee === 1) {
                    i.ee = 0;
                    t.ee = 1;
                    if (t === this.Y) {
                        this.Y = t.se();
                    } else t.se();
                } else {
                    if (i.U && i.U.ee === 1) {
                        i.ee = t.ee;
                        t.ee = 0;
                        i.U.ee = 0;
                        if (t === this.Y) {
                            this.Y = t.se();
                        } else t.se();
                        return;
                    } else if (i.W && i.W.ee === 1) {
                        i.ee = 1;
                        i.W.ee = 0;
                        i.te();
                    } else {
                        i.ee = 1;
                        e = t;
                    }
                }
            }
        }
    }
    fe(e) {
        if (this.i === 1) {
            this.clear();
            return this.h;
        }
        let t = e;
        while (t.U || t.W) {
            if (t.W) {
                t = t.W;
                while (t.U) t = t.U;
            } else {
                t = t.U;
            }
            [e.u, t.u] = [ t.u, e.u ];
            [e.l, t.l] = [ t.l, e.l ];
            e = t;
        }
        if (this.h.U === t) {
            this.h.U = t.tt;
        } else if (this.h.W === t) {
            this.h.W = t.tt;
        }
        this.ue(t);
        const i = t.tt;
        if (t === i.U) {
            i.U = undefined;
        } else i.W = undefined;
        this.i -= 1;
        this.Y.ee = 0;
        return i;
    }
    oe(e, t) {
        if (e === undefined) return false;
        const i = this.oe(e.U, t);
        if (i) return true;
        if (t(e)) return true;
        return this.oe(e.W, t);
    }
    he(e) {
        while (true) {
            const t = e.tt;
            if (t.ee === 0) return;
            const i = t.tt;
            if (t === i.U) {
                const s = i.W;
                if (s && s.ee === 1) {
                    s.ee = t.ee = 0;
                    if (i === this.Y) return;
                    i.ee = 1;
                    e = i;
                    continue;
                } else if (e === t.W) {
                    e.ee = 0;
                    if (e.U) e.U.tt = t;
                    if (e.W) e.W.tt = i;
                    t.W = e.U;
                    i.U = e.W;
                    e.U = t;
                    e.W = i;
                    if (i === this.Y) {
                        this.Y = e;
                        this.h.tt = e;
                    } else {
                        const t = i.tt;
                        if (t.U === i) {
                            t.U = e;
                        } else t.W = e;
                    }
                    e.tt = i.tt;
                    t.tt = e;
                    i.tt = e;
                    i.ee = 1;
                    return {
                        parentNode: t,
                        grandParent: i,
                        curNode: e
                    };
                } else {
                    t.ee = 0;
                    if (i === this.Y) {
                        this.Y = i.se();
                    } else i.se();
                    i.ee = 1;
                }
            } else {
                const s = i.U;
                if (s && s.ee === 1) {
                    s.ee = t.ee = 0;
                    if (i === this.Y) return;
                    i.ee = 1;
                    e = i;
                    continue;
                } else if (e === t.U) {
                    e.ee = 0;
                    if (e.U) e.U.tt = i;
                    if (e.W) e.W.tt = t;
                    i.W = e.U;
                    t.U = e.W;
                    e.U = i;
                    e.W = t;
                    if (i === this.Y) {
                        this.Y = e;
                        this.h.tt = e;
                    } else {
                        const t = i.tt;
                        if (t.U === i) {
                            t.U = e;
                        } else t.W = e;
                    }
                    e.tt = i.tt;
                    t.tt = e;
                    i.tt = e;
                    i.ee = 1;
                    return {
                        parentNode: t,
                        grandParent: i,
                        curNode: e
                    };
                } else {
                    t.ee = 0;
                    if (i === this.Y) {
                        this.Y = i.te();
                    } else i.te();
                    i.ee = 1;
                }
            }
            return;
        }
    }
    ne(e, t, i) {
        if (this.Y === undefined) {
            this.i += 1;
            this.Y = new this.re(e, t);
            this.Y.ee = 0;
            this.Y.tt = this.h;
            this.h.tt = this.Y;
            this.h.U = this.Y;
            this.h.W = this.Y;
            return;
        }
        let s;
        const r = this.h.U;
        const n = this.v(r.u, e);
        if (n === 0) {
            r.l = t;
            return;
        } else if (n > 0) {
            r.U = new this.re(e, t);
            r.U.tt = r;
            s = r.U;
            this.h.U = s;
        } else {
            const r = this.h.W;
            const n = this.v(r.u, e);
            if (n === 0) {
                r.l = t;
                return;
            } else if (n < 0) {
                r.W = new this.re(e, t);
                r.W.tt = r;
                s = r.W;
                this.h.W = s;
            } else {
                if (i !== undefined) {
                    const r = i.o;
                    if (r !== this.h) {
                        const i = this.v(r.u, e);
                        if (i === 0) {
                            r.l = t;
                            return;
                        } else if (i > 0) {
                            const i = r.L();
                            const n = this.v(i.u, e);
                            if (n === 0) {
                                i.l = t;
                                return;
                            } else if (n < 0) {
                                s = new this.re(e, t);
                                if (i.W === undefined) {
                                    i.W = s;
                                    s.tt = i;
                                } else {
                                    r.U = s;
                                    s.tt = r;
                                }
                            }
                        }
                    }
                }
                if (s === undefined) {
                    s = this.Y;
                    while (true) {
                        const i = this.v(s.u, e);
                        if (i > 0) {
                            if (s.U === undefined) {
                                s.U = new this.re(e, t);
                                s.U.tt = s;
                                s = s.U;
                                break;
                            }
                            s = s.U;
                        } else if (i < 0) {
                            if (s.W === undefined) {
                                s.W = new this.re(e, t);
                                s.W.tt = s;
                                s = s.W;
                                break;
                            }
                            s = s.W;
                        } else {
                            s.l = t;
                            return;
                        }
                    }
                }
            }
        }
        this.i += 1;
        return s;
    }
    I(e, t) {
        while (e) {
            const i = this.v(e.u, t);
            if (i < 0) {
                e = e.W;
            } else if (i > 0) {
                e = e.U;
            } else return e;
        }
        return e || this.h;
    }
    clear() {
        this.i = 0;
        this.Y = undefined;
        this.h.tt = undefined;
        this.h.U = this.h.W = undefined;
    }
    updateKeyByIterator(e, t) {
        const i = e.o;
        if (i === this.h) {
            (0, _throwError.throwIteratorAccessError)();
        }
        if (this.i === 1) {
            i.u = t;
            return true;
        }
        if (i === this.h.U) {
            if (this.v(i.B().u, t) > 0) {
                i.u = t;
                return true;
            }
            return false;
        }
        if (i === this.h.W) {
            if (this.v(i.L().u, t) < 0) {
                i.u = t;
                return true;
            }
            return false;
        }
        const s = i.L().u;
        if (this.v(s, t) >= 0) return false;
        const r = i.B().u;
        if (this.v(r, t) <= 0) return false;
        i.u = t;
        return true;
    }
    eraseElementByPos(e) {
        if (e < 0 || e > this.i - 1) {
            throw new RangeError;
        }
        let t = 0;
        const i = this;
        this.oe(this.Y, (function(s) {
            if (e === t) {
                i.V(s);
                return true;
            }
            t += 1;
            return false;
        }));
        return this.i;
    }
    eraseElementByKey(e) {
        if (this.i === 0) return false;
        const t = this.I(this.Y, e);
        if (t === this.h) return false;
        this.V(t);
        return true;
    }
    eraseElementByIterator(e) {
        const t = e.o;
        if (t === this.h) {
            (0, _throwError.throwIteratorAccessError)();
        }
        const i = t.W === undefined;
        const s = e.iteratorType === 0;
        if (s) {
            if (i) e.next();
        } else {
            if (!i || t.U === undefined) e.next();
        }
        this.V(t);
        return e;
    }
    forEach(e) {
        let t = 0;
        for (const i of this) e(i, t++, this);
    }
    getElementByPos(e) {
        if (e < 0 || e > this.i - 1) {
            throw new RangeError;
        }
        let t;
        let i = 0;
        for (const s of this) {
            if (i === e) {
                t = s;
                break;
            }
            i += 1;
        }
        return t;
    }
    getHeight() {
        if (this.i === 0) return 0;
        const traversal = function(e) {
            if (!e) return 0;
            return Math.max(traversal(e.U), traversal(e.W)) + 1;
        };
        return traversal(this.Y);
    }
}

var _default = TreeContainer;

exports["default"] = _default;
//# sourceMappingURL=index.js.map


/***/ }),

/***/ 8570:
/***/ ((__unused_webpack_module, exports, __nccwpck_require__) => {

"use strict";


Object.defineProperty(exports, "t", ({
    value: true
}));

exports["default"] = void 0;

var _Base = _interopRequireDefault(__nccwpck_require__(4851));

var _TreeIterator = _interopRequireDefault(__nccwpck_require__(5001));

var _throwError = __nccwpck_require__(7422);

function _interopRequireDefault(r) {
    return r && r.t ? r : {
        default: r
    };
}

class OrderedMapIterator extends _TreeIterator.default {
    constructor(r, t, e, s) {
        super(r, t, s);
        this.container = e;
    }
    get pointer() {
        if (this.o === this.h) {
            (0, _throwError.throwIteratorAccessError)();
        }
        const r = this;
        return new Proxy([], {
            get(t, e) {
                if (e === "0") return r.o.u; else if (e === "1") return r.o.l;
            },
            set(t, e, s) {
                if (e !== "1") {
                    throw new TypeError("props must be 1");
                }
                r.o.l = s;
                return true;
            }
        });
    }
    copy() {
        return new OrderedMapIterator(this.o, this.h, this.container, this.iteratorType);
    }
}

class OrderedMap extends _Base.default {
    constructor(r = [], t, e) {
        super(t, e);
        const s = this;
        r.forEach((function(r) {
            s.setElement(r[0], r[1]);
        }));
    }
    * K(r) {
        if (r === undefined) return;
        yield* this.K(r.U);
        yield [ r.u, r.l ];
        yield* this.K(r.W);
    }
    begin() {
        return new OrderedMapIterator(this.h.U || this.h, this.h, this);
    }
    end() {
        return new OrderedMapIterator(this.h, this.h, this);
    }
    rBegin() {
        return new OrderedMapIterator(this.h.W || this.h, this.h, this, 1);
    }
    rEnd() {
        return new OrderedMapIterator(this.h, this.h, this, 1);
    }
    front() {
        if (this.i === 0) return;
        const r = this.h.U;
        return [ r.u, r.l ];
    }
    back() {
        if (this.i === 0) return;
        const r = this.h.W;
        return [ r.u, r.l ];
    }
    lowerBound(r) {
        const t = this.X(this.Y, r);
        return new OrderedMapIterator(t, this.h, this);
    }
    upperBound(r) {
        const t = this.Z(this.Y, r);
        return new OrderedMapIterator(t, this.h, this);
    }
    reverseLowerBound(r) {
        const t = this.$(this.Y, r);
        return new OrderedMapIterator(t, this.h, this);
    }
    reverseUpperBound(r) {
        const t = this.rr(this.Y, r);
        return new OrderedMapIterator(t, this.h, this);
    }
    setElement(r, t, e) {
        return this.M(r, t, e);
    }
    find(r) {
        const t = this.I(this.Y, r);
        return new OrderedMapIterator(t, this.h, this);
    }
    getElementByKey(r) {
        const t = this.I(this.Y, r);
        return t.l;
    }
    union(r) {
        const t = this;
        r.forEach((function(r) {
            t.setElement(r[0], r[1]);
        }));
        return this.i;
    }
    [Symbol.iterator]() {
        return this.K(this.Y);
    }
}

var _default = OrderedMap;

exports["default"] = _default;
//# sourceMappingURL=OrderedMap.js.map


/***/ }),

/***/ 5204:
/***/ ((__unused_webpack_module, exports, __nccwpck_require__) => {

"use strict";


Object.defineProperty(exports, "t", ({
    value: true
}));

exports["default"] = void 0;

var _Base = _interopRequireDefault(__nccwpck_require__(4851));

var _TreeIterator = _interopRequireDefault(__nccwpck_require__(5001));

var _throwError = __nccwpck_require__(7422);

function _interopRequireDefault(e) {
    return e && e.t ? e : {
        default: e
    };
}

class OrderedSetIterator extends _TreeIterator.default {
    constructor(e, t, r, i) {
        super(e, t, i);
        this.container = r;
    }
    get pointer() {
        if (this.o === this.h) {
            (0, _throwError.throwIteratorAccessError)();
        }
        return this.o.u;
    }
    copy() {
        return new OrderedSetIterator(this.o, this.h, this.container, this.iteratorType);
    }
}

class OrderedSet extends _Base.default {
    constructor(e = [], t, r) {
        super(t, r);
        const i = this;
        e.forEach((function(e) {
            i.insert(e);
        }));
    }
    * K(e) {
        if (e === undefined) return;
        yield* this.K(e.U);
        yield e.u;
        yield* this.K(e.W);
    }
    begin() {
        return new OrderedSetIterator(this.h.U || this.h, this.h, this);
    }
    end() {
        return new OrderedSetIterator(this.h, this.h, this);
    }
    rBegin() {
        return new OrderedSetIterator(this.h.W || this.h, this.h, this, 1);
    }
    rEnd() {
        return new OrderedSetIterator(this.h, this.h, this, 1);
    }
    front() {
        return this.h.U ? this.h.U.u : undefined;
    }
    back() {
        return this.h.W ? this.h.W.u : undefined;
    }
    insert(e, t) {
        return this.M(e, undefined, t);
    }
    find(e) {
        const t = this.I(this.Y, e);
        return new OrderedSetIterator(t, this.h, this);
    }
    lowerBound(e) {
        const t = this.X(this.Y, e);
        return new OrderedSetIterator(t, this.h, this);
    }
    upperBound(e) {
        const t = this.Z(this.Y, e);
        return new OrderedSetIterator(t, this.h, this);
    }
    reverseLowerBound(e) {
        const t = this.$(this.Y, e);
        return new OrderedSetIterator(t, this.h, this);
    }
    reverseUpperBound(e) {
        const t = this.rr(this.Y, e);
        return new OrderedSetIterator(t, this.h, this);
    }
    union(e) {
        const t = this;
        e.forEach((function(e) {
            t.insert(e);
        }));
        return this.i;
    }
    [Symbol.iterator]() {
        return this.K(this.Y);
    }
}

var _default = OrderedSet;

exports["default"] = _default;
//# sourceMappingURL=OrderedSet.js.map


/***/ }),

/***/ 9274:
/***/ ((__unused_webpack_module, exports, __nccwpck_require__) => {

"use strict";
var __webpack_unused_export__;


__webpack_unused_export__ = ({
    value: true
});

__webpack_unused_export__ = ({
    enumerable: true,
    get: function() {
        return _Deque.default;
    }
});

__webpack_unused_export__ = ({
    enumerable: true,
    get: function() {
        return _HashMap.default;
    }
});

__webpack_unused_export__ = ({
    enumerable: true,
    get: function() {
        return _HashSet.default;
    }
});

__webpack_unused_export__ = ({
    enumerable: true,
    get: function() {
        return _LinkList.default;
    }
});

__webpack_unused_export__ = ({
    enumerable: true,
    get: function() {
        return _OrderedMap.default;
    }
});

Object.defineProperty(exports, "hU", ({
    enumerable: true,
    get: function() {
        return _OrderedSet.default;
    }
}));

__webpack_unused_export__ = ({
    enumerable: true,
    get: function() {
        return _PriorityQueue.default;
    }
});

__webpack_unused_export__ = ({
    enumerable: true,
    get: function() {
        return _Queue.default;
    }
});

__webpack_unused_export__ = ({
    enumerable: true,
    get: function() {
        return _Stack.default;
    }
});

__webpack_unused_export__ = ({
    enumerable: true,
    get: function() {
        return _Vector.default;
    }
});

var _Stack = _interopRequireDefault(__nccwpck_require__(7501));

var _Queue = _interopRequireDefault(__nccwpck_require__(2174));

var _PriorityQueue = _interopRequireDefault(__nccwpck_require__(7732));

var _Vector = _interopRequireDefault(__nccwpck_require__(1592));

var _LinkList = _interopRequireDefault(__nccwpck_require__(7908));

var _Deque = _interopRequireDefault(__nccwpck_require__(3949));

var _OrderedSet = _interopRequireDefault(__nccwpck_require__(5204));

var _OrderedMap = _interopRequireDefault(__nccwpck_require__(8570));

var _HashSet = _interopRequireDefault(__nccwpck_require__(3664));

var _HashMap = _interopRequireDefault(__nccwpck_require__(2528));

function _interopRequireDefault(e) {
    return e && e.t ? e : {
        default: e
    };
}
//# sourceMappingURL=index.js.map


/***/ }),

/***/ 8338:
/***/ ((__unused_webpack_module, exports) => {

"use strict";


Object.defineProperty(exports, "t", ({
    value: true
}));

exports["default"] = checkObject;

function checkObject(e) {
    const t = typeof e;
    return t === "object" && e !== null || t === "function";
}
//# sourceMappingURL=checkObject.js.map


/***/ }),

/***/ 7422:
/***/ ((__unused_webpack_module, exports) => {

"use strict";


Object.defineProperty(exports, "t", ({
    value: true
}));

exports.throwIteratorAccessError = throwIteratorAccessError;

function throwIteratorAccessError() {
    throw new RangeError("Iterator access denied!");
}
//# sourceMappingURL=throwError.js.map


/***/ }),

/***/ 7129:
/***/ ((module, __unused_webpack_exports, __nccwpck_require__) => {

"use strict";


// A linked list to keep track of recently-used-ness
const Yallist = __nccwpck_require__(665)

const MAX = Symbol('max')
const LENGTH = Symbol('length')
const LENGTH_CALCULATOR = Symbol('lengthCalculator')
const ALLOW_STALE = Symbol('allowStale')
const MAX_AGE = Symbol('maxAge')
const DISPOSE = Symbol('dispose')
const NO_DISPOSE_ON_SET = Symbol('noDisposeOnSet')
const LRU_LIST = Symbol('lruList')
const CACHE = Symbol('cache')
const UPDATE_AGE_ON_GET = Symbol('updateAgeOnGet')

const naiveLength = () => 1

// lruList is a yallist where the head is the youngest
// item, and the tail is the oldest.  the list contains the Hit
// objects as the entries.
// Each Hit object has a reference to its Yallist.Node.  This
// never changes.
//
// cache is a Map (or PseudoMap) that matches the keys to
// the Yallist.Node object.
class LRUCache {
  constructor (options) {
    if (typeof options === 'number')
      options = { max: options }

    if (!options)
      options = {}

    if (options.max && (typeof options.max !== 'number' || options.max < 0))
      throw new TypeError('max must be a non-negative number')
    // Kind of weird to have a default max of Infinity, but oh well.
    const max = this[MAX] = options.max || Infinity

    const lc = options.length || naiveLength
    this[LENGTH_CALCULATOR] = (typeof lc !== 'function') ? naiveLength : lc
    this[ALLOW_STALE] = options.stale || false
    if (options.maxAge && typeof options.maxAge !== 'number')
      throw new TypeError('maxAge must be a number')
    this[MAX_AGE] = options.maxAge || 0
    this[DISPOSE] = options.dispose
    this[NO_DISPOSE_ON_SET] = options.noDisposeOnSet || false
    this[UPDATE_AGE_ON_GET] = options.updateAgeOnGet || false
    this.reset()
  }

  // resize the cache when the max changes.
  set max (mL) {
    if (typeof mL !== 'number' || mL < 0)
      throw new TypeError('max must be a non-negative number')

    this[MAX] = mL || Infinity
    trim(this)
  }
  get max () {
    return this[MAX]
  }

  set allowStale (allowStale) {
    this[ALLOW_STALE] = !!allowStale
  }
  get allowStale () {
    return this[ALLOW_STALE]
  }

  set maxAge (mA) {
    if (typeof mA !== 'number')
      throw new TypeError('maxAge must be a non-negative number')

    this[MAX_AGE] = mA
    trim(this)
  }
  get maxAge () {
    return this[MAX_AGE]
  }

  // resize the cache when the lengthCalculator changes.
  set lengthCalculator (lC) {
    if (typeof lC !== 'function')
      lC = naiveLength

    if (lC !== this[LENGTH_CALCULATOR]) {
      this[LENGTH_CALCULATOR] = lC
      this[LENGTH] = 0
      this[LRU_LIST].forEach(hit => {
        hit.length = this[LENGTH_CALCULATOR](hit.value, hit.key)
        this[LENGTH] += hit.length
      })
    }
    trim(this)
  }
  get lengthCalculator () { return this[LENGTH_CALCULATOR] }

  get length () { return this[LENGTH] }
  get itemCount () { return this[LRU_LIST].length }

  rforEach (fn, thisp) {
    thisp = thisp || this
    for (let walker = this[LRU_LIST].tail; walker !== null;) {
      const prev = walker.prev
      forEachStep(this, fn, walker, thisp)
      walker = prev
    }
  }

  forEach (fn, thisp) {
    thisp = thisp || this
    for (let walker = this[LRU_LIST].head; walker !== null;) {
      const next = walker.next
      forEachStep(this, fn, walker, thisp)
      walker = next
    }
  }

  keys () {
    return this[LRU_LIST].toArray().map(k => k.key)
  }

  values () {
    return this[LRU_LIST].toArray().map(k => k.value)
  }

  reset () {
    if (this[DISPOSE] &&
        this[LRU_LIST] &&
        this[LRU_LIST].length) {
      this[LRU_LIST].forEach(hit => this[DISPOSE](hit.key, hit.value))
    }

    this[CACHE] = new Map() // hash of items by key
    this[LRU_LIST] = new Yallist() // list of items in order of use recency
    this[LENGTH] = 0 // length of items in the list
  }

  dump () {
    return this[LRU_LIST].map(hit =>
      isStale(this, hit) ? false : {
        k: hit.key,
        v: hit.value,
        e: hit.now + (hit.maxAge || 0)
      }).toArray().filter(h => h)
  }

  dumpLru () {
    return this[LRU_LIST]
  }

  set (key, value, maxAge) {
    maxAge = maxAge || this[MAX_AGE]

    if (maxAge && typeof maxAge !== 'number')
      throw new TypeError('maxAge must be a number')

    const now = maxAge ? Date.now() : 0
    const len = this[LENGTH_CALCULATOR](value, key)

    if (this[CACHE].has(key)) {
      if (len > this[MAX]) {
        del(this, this[CACHE].get(key))
        return false
      }

      const node = this[CACHE].get(key)
      const item = node.value

      // dispose of the old one before overwriting
      // split out into 2 ifs for better coverage tracking
      if (this[DISPOSE]) {
        if (!this[NO_DISPOSE_ON_SET])
          this[DISPOSE](key, item.value)
      }

      item.now = now
      item.maxAge = maxAge
      item.value = value
      this[LENGTH] += len - item.length
      item.length = len
      this.get(key)
      trim(this)
      return true
    }

    const hit = new Entry(key, value, len, now, maxAge)

    // oversized objects fall out of cache automatically.
    if (hit.length > this[MAX]) {
      if (this[DISPOSE])
        this[DISPOSE](key, value)

      return false
    }

    this[LENGTH] += hit.length
    this[LRU_LIST].unshift(hit)
    this[CACHE].set(key, this[LRU_LIST].head)
    trim(this)
    return true
  }

  has (key) {
    if (!this[CACHE].has(key)) return false
    const hit = this[CACHE].get(key).value
    return !isStale(this, hit)
  }

  get (key) {
    return get(this, key, true)
  }

  peek (key) {
    return get(this, key, false)
  }

  pop () {
    const node = this[LRU_LIST].tail
    if (!node)
      return null

    del(this, node)
    return node.value
  }

  del (key) {
    del(this, this[CACHE].get(key))
  }

  load (arr) {
    // reset the cache
    this.reset()

    const now = Date.now()
    // A previous serialized cache has the most recent items first
    for (let l = arr.length - 1; l >= 0; l--) {
      const hit = arr[l]
      const expiresAt = hit.e || 0
      if (expiresAt === 0)
        // the item was created without expiration in a non aged cache
        this.set(hit.k, hit.v)
      else {
        const maxAge = expiresAt - now
        // dont add already expired items
        if (maxAge > 0) {
          this.set(hit.k, hit.v, maxAge)
        }
      }
    }
  }

  prune () {
    this[CACHE].forEach((value, key) => get(this, key, false))
  }
}

const get = (self, key, doUse) => {
  const node = self[CACHE].get(key)
  if (node) {
    const hit = node.value
    if (isStale(self, hit)) {
      del(self, node)
      if (!self[ALLOW_STALE])
        return undefined
    } else {
      if (doUse) {
        if (self[UPDATE_AGE_ON_GET])
          node.value.now = Date.now()
        self[LRU_LIST].unshiftNode(node)
      }
    }
    return hit.value
  }
}

const isStale = (self, hit) => {
  if (!hit || (!hit.maxAge && !self[MAX_AGE]))
    return false

  const diff = Date.now() - hit.now
  return hit.maxAge ? diff > hit.maxAge
    : self[MAX_AGE] && (diff > self[MAX_AGE])
}

const trim = self => {
  if (self[LENGTH] > self[MAX]) {
    for (let walker = self[LRU_LIST].tail;
      self[LENGTH] > self[MAX] && walker !== null;) {
      // We know that we're about to delete this one, and also
      // what the next least recently used key will be, so just
      // go ahead and set it now.
      const prev = walker.prev
      del(self, walker)
      walker = prev
    }
  }
}

const del = (self, node) => {
  if (node) {
    const hit = node.value
    if (self[DISPOSE])
      self[DISPOSE](hit.key, hit.value)

    self[LENGTH] -= hit.length
    self[CACHE].delete(hit.key)
    self[LRU_LIST].removeNode(node)
  }
}

class Entry {
  constructor (key, value, length, now, maxAge) {
    this.key = key
    this.value = value
    this.length = length
    this.now = now
    this.maxAge = maxAge || 0
  }
}

const forEachStep = (self, fn, node, thisp) => {
  let hit = node.value
  if (isStale(self, hit)) {
    del(self, node)
    if (!self[ALLOW_STALE])
      hit = undefined
  }
  if (hit)
    fn.call(thisp, hit.value, hit.key, self)
}

module.exports = LRUCache


/***/ }),

/***/ 6035:
/***/ ((module) => {

/* Protocol - protocol constants */
const protocol = module.exports

/* Command code => mnemonic */
protocol.types = {
  0: 'reserved',
  1: 'connect',
  2: 'connack',
  3: 'publish',
  4: 'puback',
  5: 'pubrec',
  6: 'pubrel',
  7: 'pubcomp',
  8: 'subscribe',
  9: 'suback',
  10: 'unsubscribe',
  11: 'unsuback',
  12: 'pingreq',
  13: 'pingresp',
  14: 'disconnect',
  15: 'auth'
}

/* Mnemonic => Command code */
protocol.codes = {}
for (const k in protocol.types) {
  const v = protocol.types[k]
  protocol.codes[v] = k
}

/* Header */
protocol.CMD_SHIFT = 4
protocol.CMD_MASK = 0xF0
protocol.DUP_MASK = 0x08
protocol.QOS_MASK = 0x03
protocol.QOS_SHIFT = 1
protocol.RETAIN_MASK = 0x01

/* Length */
protocol.VARBYTEINT_MASK = 0x7F
protocol.VARBYTEINT_FIN_MASK = 0x80
protocol.VARBYTEINT_MAX = 268435455

/* Connack */
protocol.SESSIONPRESENT_MASK = 0x01
protocol.SESSIONPRESENT_HEADER = Buffer.from([protocol.SESSIONPRESENT_MASK])
protocol.CONNACK_HEADER = Buffer.from([protocol.codes.connack << protocol.CMD_SHIFT])

/* Connect */
protocol.USERNAME_MASK = 0x80
protocol.PASSWORD_MASK = 0x40
protocol.WILL_RETAIN_MASK = 0x20
protocol.WILL_QOS_MASK = 0x18
protocol.WILL_QOS_SHIFT = 3
protocol.WILL_FLAG_MASK = 0x04
protocol.CLEAN_SESSION_MASK = 0x02
protocol.CONNECT_HEADER = Buffer.from([protocol.codes.connect << protocol.CMD_SHIFT])

/* Properties */
protocol.properties = {
  sessionExpiryInterval: 17,
  willDelayInterval: 24,
  receiveMaximum: 33,
  maximumPacketSize: 39,
  topicAliasMaximum: 34,
  requestResponseInformation: 25,
  requestProblemInformation: 23,
  userProperties: 38,
  authenticationMethod: 21,
  authenticationData: 22,
  payloadFormatIndicator: 1,
  messageExpiryInterval: 2,
  contentType: 3,
  responseTopic: 8,
  correlationData: 9,
  maximumQoS: 36,
  retainAvailable: 37,
  assignedClientIdentifier: 18,
  reasonString: 31,
  wildcardSubscriptionAvailable: 40,
  subscriptionIdentifiersAvailable: 41,
  sharedSubscriptionAvailable: 42,
  serverKeepAlive: 19,
  responseInformation: 26,
  serverReference: 28,
  topicAlias: 35,
  subscriptionIdentifier: 11
}
protocol.propertiesCodes = {}
for (const prop in protocol.properties) {
  const id = protocol.properties[prop]
  protocol.propertiesCodes[id] = prop
}
protocol.propertiesTypes = {
  sessionExpiryInterval: 'int32',
  willDelayInterval: 'int32',
  receiveMaximum: 'int16',
  maximumPacketSize: 'int32',
  topicAliasMaximum: 'int16',
  requestResponseInformation: 'byte',
  requestProblemInformation: 'byte',
  userProperties: 'pair',
  authenticationMethod: 'string',
  authenticationData: 'binary',
  payloadFormatIndicator: 'byte',
  messageExpiryInterval: 'int32',
  contentType: 'string',
  responseTopic: 'string',
  correlationData: 'binary',
  maximumQoS: 'int8',
  retainAvailable: 'byte',
  assignedClientIdentifier: 'string',
  reasonString: 'string',
  wildcardSubscriptionAvailable: 'byte',
  subscriptionIdentifiersAvailable: 'byte',
  sharedSubscriptionAvailable: 'byte',
  serverKeepAlive: 'int16',
  responseInformation: 'string',
  serverReference: 'string',
  topicAlias: 'int16',
  subscriptionIdentifier: 'var'
}

function genHeader (type) {
  return [0, 1, 2].map(qos => {
    return [0, 1].map(dup => {
      return [0, 1].map(retain => {
        const buf = Buffer.alloc(1)
        buf.writeUInt8(
          protocol.codes[type] << protocol.CMD_SHIFT |
          (dup ? protocol.DUP_MASK : 0) |
          qos << protocol.QOS_SHIFT | retain, 0, true)
        return buf
      })
    })
  })
}

/* Publish */
protocol.PUBLISH_HEADER = genHeader('publish')

/* Subscribe */
protocol.SUBSCRIBE_HEADER = genHeader('subscribe')
protocol.SUBSCRIBE_OPTIONS_QOS_MASK = 0x03
protocol.SUBSCRIBE_OPTIONS_NL_MASK = 0x01
protocol.SUBSCRIBE_OPTIONS_NL_SHIFT = 2
protocol.SUBSCRIBE_OPTIONS_RAP_MASK = 0x01
protocol.SUBSCRIBE_OPTIONS_RAP_SHIFT = 3
protocol.SUBSCRIBE_OPTIONS_RH_MASK = 0x03
protocol.SUBSCRIBE_OPTIONS_RH_SHIFT = 4
protocol.SUBSCRIBE_OPTIONS_RH = [0x00, 0x10, 0x20]
protocol.SUBSCRIBE_OPTIONS_NL = 0x04
protocol.SUBSCRIBE_OPTIONS_RAP = 0x08
protocol.SUBSCRIBE_OPTIONS_QOS = [0x00, 0x01, 0x02]

/* Unsubscribe */
protocol.UNSUBSCRIBE_HEADER = genHeader('unsubscribe')

/* Confirmations */
protocol.ACKS = {
  unsuback: genHeader('unsuback'),
  puback: genHeader('puback'),
  pubcomp: genHeader('pubcomp'),
  pubrel: genHeader('pubrel'),
  pubrec: genHeader('pubrec')
}

protocol.SUBACK_HEADER = Buffer.from([protocol.codes.suback << protocol.CMD_SHIFT])

/* Protocol versions */
protocol.VERSION3 = Buffer.from([3])
protocol.VERSION4 = Buffer.from([4])
protocol.VERSION5 = Buffer.from([5])
protocol.VERSION131 = Buffer.from([131])
protocol.VERSION132 = Buffer.from([132])

/* QoS */
protocol.QOS = [0, 1, 2].map(qos => {
  return Buffer.from([qos])
})

/* Empty packets */
protocol.EMPTY = {
  pingreq: Buffer.from([protocol.codes.pingreq << 4, 0]),
  pingresp: Buffer.from([protocol.codes.pingresp << 4, 0]),
  disconnect: Buffer.from([protocol.codes.disconnect << 4, 0])
}


/***/ }),

/***/ 7918:
/***/ ((module, __unused_webpack_exports, __nccwpck_require__) => {

const writeToStream = __nccwpck_require__(7593)
const EventEmitter = __nccwpck_require__(2361)

function generate (packet, opts) {
  const stream = new Accumulator()
  writeToStream(packet, stream, opts)
  return stream.concat()
}

class Accumulator extends EventEmitter {
  constructor () {
    super()
    this._array = new Array(20)
    this._i = 0
  }

  write (chunk) {
    this._array[this._i++] = chunk
    return true
  }

  concat () {
    let length = 0
    const lengths = new Array(this._array.length)
    const list = this._array
    let pos = 0
    let i

    for (i = 0; i < list.length && list[i] !== undefined; i++) {
      if (typeof list[i] !== 'string') lengths[i] = list[i].length
      else lengths[i] = Buffer.byteLength(list[i])

      length += lengths[i]
    }

    const result = Buffer.allocUnsafe(length)

    for (i = 0; i < list.length && list[i] !== undefined; i++) {
      if (typeof list[i] !== 'string') {
        list[i].copy(result, pos)
        pos += lengths[i]
      } else {
        result.write(list[i], pos)
        pos += lengths[i]
      }
    }

    return result
  }
}

module.exports = generate


/***/ }),

/***/ 835:
/***/ ((__unused_webpack_module, exports, __nccwpck_require__) => {

exports.parser = __nccwpck_require__(8564).parser
exports.generate = __nccwpck_require__(7918)
exports.writeToStream = __nccwpck_require__(7593)


/***/ }),

/***/ 8653:
/***/ ((module) => {

const max = 65536
const cache = {}

// in node 6 Buffer.subarray returns a Uint8Array instead of a Buffer
// later versions return a Buffer
// alternative is Buffer.slice but that creates a new buffer
// creating new buffers takes time
// SubOk is only false on node < 8
const SubOk = Buffer.isBuffer(Buffer.from([1, 2]).subarray(0, 1))

function generateBuffer (i) {
  const buffer = Buffer.allocUnsafe(2)
  buffer.writeUInt8(i >> 8, 0)
  buffer.writeUInt8(i & 0x00FF, 0 + 1)

  return buffer
}

function generateCache () {
  for (let i = 0; i < max; i++) {
    cache[i] = generateBuffer(i)
  }
}

function genBufVariableByteInt (num) {
  const maxLength = 4 // max 4 bytes
  let digit = 0
  let pos = 0
  const buffer = Buffer.allocUnsafe(maxLength)

  do {
    digit = num % 128 | 0
    num = num / 128 | 0
    if (num > 0) digit = digit | 0x80

    buffer.writeUInt8(digit, pos++)
  } while (num > 0 && pos < maxLength)

  if (num > 0) {
    pos = 0
  }

  return SubOk ? buffer.subarray(0, pos) : buffer.slice(0, pos)
}

function generate4ByteBuffer (num) {
  const buffer = Buffer.allocUnsafe(4)
  buffer.writeUInt32BE(num, 0)
  return buffer
}

module.exports = {
  cache,
  generateCache,
  generateNumber: generateBuffer,
  genBufVariableByteInt,
  generate4ByteBuffer
}


/***/ }),

/***/ 5030:
/***/ ((module) => {

class Packet {
  constructor () {
    this.cmd = null
    this.retain = false
    this.qos = 0
    this.dup = false
    this.length = -1
    this.topic = null
    this.payload = null
  }
}

module.exports = Packet


/***/ }),

/***/ 8564:
/***/ ((module, __unused_webpack_exports, __nccwpck_require__) => {

const bl = __nccwpck_require__(336)
const EventEmitter = __nccwpck_require__(2361)
const Packet = __nccwpck_require__(5030)
const constants = __nccwpck_require__(6035)
const debug = __nccwpck_require__(8237)('mqtt-packet:parser')

class Parser extends EventEmitter {
  constructor () {
    super()
    this.parser = this.constructor.parser
  }

  static parser (opt) {
    if (!(this instanceof Parser)) return (new Parser()).parser(opt)

    this.settings = opt || {}

    this._states = [
      '_parseHeader',
      '_parseLength',
      '_parsePayload',
      '_newPacket'
    ]

    this._resetState()
    return this
  }

  _resetState () {
    debug('_resetState: resetting packet, error, _list, and _stateCounter')
    this.packet = new Packet()
    this.error = null
    this._list = bl()
    this._stateCounter = 0
  }

  parse (buf) {
    if (this.error) this._resetState()

    this._list.append(buf)
    debug('parse: current state: %s', this._states[this._stateCounter])
    while ((this.packet.length !== -1 || this._list.length > 0) &&
      this[this._states[this._stateCounter]]() &&
      !this.error) {
      this._stateCounter++
      debug('parse: state complete. _stateCounter is now: %d', this._stateCounter)
      debug('parse: packet.length: %d, buffer list length: %d', this.packet.length, this._list.length)
      if (this._stateCounter >= this._states.length) this._stateCounter = 0
    }
    debug('parse: exited while loop. packet: %d, buffer list length: %d', this.packet.length, this._list.length)
    return this._list.length
  }

  _parseHeader () {
    // There is at least one byte in the buffer
    const zero = this._list.readUInt8(0)
    this.packet.cmd = constants.types[zero >> constants.CMD_SHIFT]
    this.packet.retain = (zero & constants.RETAIN_MASK) !== 0
    this.packet.qos = (zero >> constants.QOS_SHIFT) & constants.QOS_MASK
    this.packet.dup = (zero & constants.DUP_MASK) !== 0
    debug('_parseHeader: packet: %o', this.packet)

    this._list.consume(1)

    return true
  }

  _parseLength () {
    // There is at least one byte in the list
    const result = this._parseVarByteNum(true)

    if (result) {
      this.packet.length = result.value
      this._list.consume(result.bytes)
    }
    debug('_parseLength %d', result.value)
    return !!result
  }

  _parsePayload () {
    debug('_parsePayload: payload %O', this._list)
    let result = false

    // Do we have a payload? Do we have enough data to complete the payload?
    // PINGs have no payload
    if (this.packet.length === 0 || this._list.length >= this.packet.length) {
      this._pos = 0

      switch (this.packet.cmd) {
        case 'connect':
          this._parseConnect()
          break
        case 'connack':
          this._parseConnack()
          break
        case 'publish':
          this._parsePublish()
          break
        case 'puback':
        case 'pubrec':
        case 'pubrel':
        case 'pubcomp':
          this._parseConfirmation()
          break
        case 'subscribe':
          this._parseSubscribe()
          break
        case 'suback':
          this._parseSuback()
          break
        case 'unsubscribe':
          this._parseUnsubscribe()
          break
        case 'unsuback':
          this._parseUnsuback()
          break
        case 'pingreq':
        case 'pingresp':
          // These are empty, nothing to do
          break
        case 'disconnect':
          this._parseDisconnect()
          break
        case 'auth':
          this._parseAuth()
          break
        default:
          this._emitError(new Error('Not supported'))
      }

      result = true
    }
    debug('_parsePayload complete result: %s', result)
    return result
  }

  _parseConnect () {
    debug('_parseConnect')
    let topic // Will topic
    let payload // Will payload
    let password // Password
    let username // Username
    const flags = {}
    const packet = this.packet

    // Parse protocolId
    const protocolId = this._parseString()

    if (protocolId === null) return this._emitError(new Error('Cannot parse protocolId'))
    if (protocolId !== 'MQTT' && protocolId !== 'MQIsdp') {
      return this._emitError(new Error('Invalid protocolId'))
    }

    packet.protocolId = protocolId

    // Parse constants version number
    if (this._pos >= this._list.length) return this._emitError(new Error('Packet too short'))

    packet.protocolVersion = this._list.readUInt8(this._pos)

    if (packet.protocolVersion >= 128) {
      packet.bridgeMode = true
      packet.protocolVersion = packet.protocolVersion - 128
    }

    if (packet.protocolVersion !== 3 && packet.protocolVersion !== 4 && packet.protocolVersion !== 5) {
      return this._emitError(new Error('Invalid protocol version'))
    }

    this._pos++

    if (this._pos >= this._list.length) {
      return this._emitError(new Error('Packet too short'))
    }

    // Parse connect flags
    flags.username = (this._list.readUInt8(this._pos) & constants.USERNAME_MASK)
    flags.password = (this._list.readUInt8(this._pos) & constants.PASSWORD_MASK)
    flags.will = (this._list.readUInt8(this._pos) & constants.WILL_FLAG_MASK)

    if (flags.will) {
      packet.will = {}
      packet.will.retain = (this._list.readUInt8(this._pos) & constants.WILL_RETAIN_MASK) !== 0
      packet.will.qos = (this._list.readUInt8(this._pos) &
        constants.WILL_QOS_MASK) >> constants.WILL_QOS_SHIFT
    }

    packet.clean = (this._list.readUInt8(this._pos) & constants.CLEAN_SESSION_MASK) !== 0
    this._pos++

    // Parse keepalive
    packet.keepalive = this._parseNum()
    if (packet.keepalive === -1) return this._emitError(new Error('Packet too short'))

    // parse properties
    if (packet.protocolVersion === 5) {
      const properties = this._parseProperties()
      if (Object.getOwnPropertyNames(properties).length) {
        packet.properties = properties
      }
    }
    // Parse clientId
    const clientId = this._parseString()
    if (clientId === null) return this._emitError(new Error('Packet too short'))
    packet.clientId = clientId
    debug('_parseConnect: packet.clientId: %s', packet.clientId)

    if (flags.will) {
      if (packet.protocolVersion === 5) {
        const willProperties = this._parseProperties()
        if (Object.getOwnPropertyNames(willProperties).length) {
          packet.will.properties = willProperties
        }
      }
      // Parse will topic
      topic = this._parseString()
      if (topic === null) return this._emitError(new Error('Cannot parse will topic'))
      packet.will.topic = topic
      debug('_parseConnect: packet.will.topic: %s', packet.will.topic)

      // Parse will payload
      payload = this._parseBuffer()
      if (payload === null) return this._emitError(new Error('Cannot parse will payload'))
      packet.will.payload = payload
      debug('_parseConnect: packet.will.paylaod: %s', packet.will.payload)
    }

    // Parse username
    if (flags.username) {
      username = this._parseString()
      if (username === null) return this._emitError(new Error('Cannot parse username'))
      packet.username = username
      debug('_parseConnect: packet.username: %s', packet.username)
    }

    // Parse password
    if (flags.password) {
      password = this._parseBuffer()
      if (password === null) return this._emitError(new Error('Cannot parse password'))
      packet.password = password
    }
    // need for right parse auth packet and self set up
    this.settings = packet
    debug('_parseConnect: complete')
    return packet
  }

  _parseConnack () {
    debug('_parseConnack')
    const packet = this.packet

    if (this._list.length < 1) return null
    packet.sessionPresent = !!(this._list.readUInt8(this._pos++) & constants.SESSIONPRESENT_MASK)

    if (this.settings.protocolVersion === 5) {
      if (this._list.length >= 2) {
        packet.reasonCode = this._list.readUInt8(this._pos++)
      } else {
        packet.reasonCode = 0
      }
    } else {
      if (this._list.length < 2) return null
      packet.returnCode = this._list.readUInt8(this._pos++)
    }

    if (packet.returnCode === -1 || packet.reasonCode === -1) return this._emitError(new Error('Cannot parse return code'))
    // mqtt 5 properties
    if (this.settings.protocolVersion === 5) {
      const properties = this._parseProperties()
      if (Object.getOwnPropertyNames(properties).length) {
        packet.properties = properties
      }
    }
    debug('_parseConnack: complete')
  }

  _parsePublish () {
    debug('_parsePublish')
    const packet = this.packet
    packet.topic = this._parseString()

    if (packet.topic === null) return this._emitError(new Error('Cannot parse topic'))

    // Parse messageId
    if (packet.qos > 0) if (!this._parseMessageId()) { return }

    // Properties mqtt 5
    if (this.settings.protocolVersion === 5) {
      const properties = this._parseProperties()
      if (Object.getOwnPropertyNames(properties).length) {
        packet.properties = properties
      }
    }

    packet.payload = this._list.slice(this._pos, packet.length)
    debug('_parsePublish: payload from buffer list: %o', packet.payload)
  }

  _parseSubscribe () {
    debug('_parseSubscribe')
    const packet = this.packet
    let topic
    let options
    let qos
    let rh
    let rap
    let nl
    let subscription

    if (packet.qos !== 1) {
      return this._emitError(new Error('Wrong subscribe header'))
    }

    packet.subscriptions = []

    if (!this._parseMessageId()) { return }

    // Properties mqtt 5
    if (this.settings.protocolVersion === 5) {
      const properties = this._parseProperties()
      if (Object.getOwnPropertyNames(properties).length) {
        packet.properties = properties
      }
    }

    while (this._pos < packet.length) {
      // Parse topic
      topic = this._parseString()
      if (topic === null) return this._emitError(new Error('Cannot parse topic'))
      if (this._pos >= packet.length) return this._emitError(new Error('Malformed Subscribe Payload'))

      options = this._parseByte()
      qos = options & constants.SUBSCRIBE_OPTIONS_QOS_MASK
      nl = ((options >> constants.SUBSCRIBE_OPTIONS_NL_SHIFT) & constants.SUBSCRIBE_OPTIONS_NL_MASK) !== 0
      rap = ((options >> constants.SUBSCRIBE_OPTIONS_RAP_SHIFT) & constants.SUBSCRIBE_OPTIONS_RAP_MASK) !== 0
      rh = (options >> constants.SUBSCRIBE_OPTIONS_RH_SHIFT) & constants.SUBSCRIBE_OPTIONS_RH_MASK

      subscription = { topic, qos }

      // mqtt 5 options
      if (this.settings.protocolVersion === 5) {
        subscription.nl = nl
        subscription.rap = rap
        subscription.rh = rh
      } else if (this.settings.bridgeMode) {
        subscription.rh = 0
        subscription.rap = true
        subscription.nl = true
      }

      // Push pair to subscriptions
      debug('_parseSubscribe: push subscription `%s` to subscription', subscription)
      packet.subscriptions.push(subscription)
    }
  }

  _parseSuback () {
    debug('_parseSuback')
    const packet = this.packet
    this.packet.granted = []

    if (!this._parseMessageId()) { return }

    // Properties mqtt 5
    if (this.settings.protocolVersion === 5) {
      const properties = this._parseProperties()
      if (Object.getOwnPropertyNames(properties).length) {
        packet.properties = properties
      }
    }

    // Parse granted QoSes
    while (this._pos < this.packet.length) {
      this.packet.granted.push(this._list.readUInt8(this._pos++))
    }
  }

  _parseUnsubscribe () {
    debug('_parseUnsubscribe')
    const packet = this.packet

    packet.unsubscriptions = []

    // Parse messageId
    if (!this._parseMessageId()) { return }

    // Properties mqtt 5
    if (this.settings.protocolVersion === 5) {
      const properties = this._parseProperties()
      if (Object.getOwnPropertyNames(properties).length) {
        packet.properties = properties
      }
    }

    while (this._pos < packet.length) {
      // Parse topic
      const topic = this._parseString()
      if (topic === null) return this._emitError(new Error('Cannot parse topic'))

      // Push topic to unsubscriptions
      debug('_parseUnsubscribe: push topic `%s` to unsubscriptions', topic)
      packet.unsubscriptions.push(topic)
    }
  }

  _parseUnsuback () {
    debug('_parseUnsuback')
    const packet = this.packet
    if (!this._parseMessageId()) return this._emitError(new Error('Cannot parse messageId'))
    // Properties mqtt 5
    if (this.settings.protocolVersion === 5) {
      const properties = this._parseProperties()
      if (Object.getOwnPropertyNames(properties).length) {
        packet.properties = properties
      }
      // Parse granted QoSes
      packet.granted = []
      while (this._pos < this.packet.length) {
        this.packet.granted.push(this._list.readUInt8(this._pos++))
      }
    }
  }

  // parse packets like puback, pubrec, pubrel, pubcomp
  _parseConfirmation () {
    debug('_parseConfirmation: packet.cmd: `%s`', this.packet.cmd)
    const packet = this.packet

    this._parseMessageId()

    if (this.settings.protocolVersion === 5) {
      if (packet.length > 2) {
        // response code
        packet.reasonCode = this._parseByte()
        debug('_parseConfirmation: packet.reasonCode `%d`', packet.reasonCode)
      } else {
        packet.reasonCode = 0
      }

      if (packet.length > 3) {
        // properies mqtt 5
        const properties = this._parseProperties()
        if (Object.getOwnPropertyNames(properties).length) {
          packet.properties = properties
        }
      }
    }

    return true
  }

  // parse disconnect packet
  _parseDisconnect () {
    const packet = this.packet
    debug('_parseDisconnect')

    if (this.settings.protocolVersion === 5) {
      // response code
      if (this._list.length > 0) {
        packet.reasonCode = this._parseByte()
      } else {
        packet.reasonCode = 0
      }
      // properies mqtt 5
      const properties = this._parseProperties()
      if (Object.getOwnPropertyNames(properties).length) {
        packet.properties = properties
      }
    }

    debug('_parseDisconnect result: true')
    return true
  }

  // parse auth packet
  _parseAuth () {
    debug('_parseAuth')
    const packet = this.packet

    if (this.settings.protocolVersion !== 5) {
      return this._emitError(new Error('Not supported auth packet for this version MQTT'))
    }

    // response code
    packet.reasonCode = this._parseByte()
    // properies mqtt 5
    const properties = this._parseProperties()
    if (Object.getOwnPropertyNames(properties).length) {
      packet.properties = properties
    }

    debug('_parseAuth: result: true')
    return true
  }

  _parseMessageId () {
    const packet = this.packet

    packet.messageId = this._parseNum()

    if (packet.messageId === null) {
      this._emitError(new Error('Cannot parse messageId'))
      return false
    }

    debug('_parseMessageId: packet.messageId %d', packet.messageId)
    return true
  }

  _parseString (maybeBuffer) {
    const length = this._parseNum()
    const end = length + this._pos

    if (length === -1 || end > this._list.length || end > this.packet.length) return null

    const result = this._list.toString('utf8', this._pos, end)
    this._pos += length
    debug('_parseString: result: %s', result)
    return result
  }

  _parseStringPair () {
    debug('_parseStringPair')
    return {
      name: this._parseString(),
      value: this._parseString()
    }
  }

  _parseBuffer () {
    const length = this._parseNum()
    const end = length + this._pos

    if (length === -1 || end > this._list.length || end > this.packet.length) return null

    const result = this._list.slice(this._pos, end)

    this._pos += length
    debug('_parseBuffer: result: %o', result)
    return result
  }

  _parseNum () {
    if (this._list.length - this._pos < 2) return -1

    const result = this._list.readUInt16BE(this._pos)
    this._pos += 2
    debug('_parseNum: result: %s', result)
    return result
  }

  _parse4ByteNum () {
    if (this._list.length - this._pos < 4) return -1

    const result = this._list.readUInt32BE(this._pos)
    this._pos += 4
    debug('_parse4ByteNum: result: %s', result)
    return result
  }

  _parseVarByteNum (fullInfoFlag) {
    debug('_parseVarByteNum')
    const maxBytes = 4
    let bytes = 0
    let mul = 1
    let value = 0
    let result = false
    let current
    const padding = this._pos ? this._pos : 0

    while (bytes < maxBytes && (padding + bytes) < this._list.length) {
      current = this._list.readUInt8(padding + bytes++)
      value += mul * (current & constants.VARBYTEINT_MASK)
      mul *= 0x80

      if ((current & constants.VARBYTEINT_FIN_MASK) === 0) {
        result = true
        break
      }
      if (this._list.length <= bytes) {
        break
      }
    }

    if (!result && bytes === maxBytes && this._list.length >= bytes) {
      this._emitError(new Error('Invalid variable byte integer'))
    }

    if (padding) {
      this._pos += bytes
    }

    result = result
      ? fullInfoFlag ? {
        bytes,
        value
      } : value
      : false

    debug('_parseVarByteNum: result: %o', result)
    return result
  }

  _parseByte () {
    let result
    if (this._pos < this._list.length) {
      result = this._list.readUInt8(this._pos)
      this._pos++
    }
    debug('_parseByte: result: %o', result)
    return result
  }

  _parseByType (type) {
    debug('_parseByType: type: %s', type)
    switch (type) {
      case 'byte': {
        return this._parseByte() !== 0
      }
      case 'int8': {
        return this._parseByte()
      }
      case 'int16': {
        return this._parseNum()
      }
      case 'int32': {
        return this._parse4ByteNum()
      }
      case 'var': {
        return this._parseVarByteNum()
      }
      case 'string': {
        return this._parseString()
      }
      case 'pair': {
        return this._parseStringPair()
      }
      case 'binary': {
        return this._parseBuffer()
      }
    }
  }

  _parseProperties () {
    debug('_parseProperties')
    const length = this._parseVarByteNum()
    const start = this._pos
    const end = start + length
    const result = {}
    while (this._pos < end) {
      const type = this._parseByte()
      if (!type) {
        this._emitError(new Error('Cannot parse property code type'))
        return false
      }
      const name = constants.propertiesCodes[type]
      if (!name) {
        this._emitError(new Error('Unknown property'))
        return false
      }
      // user properties process
      if (name === 'userProperties') {
        if (!result[name]) {
          result[name] = Object.create(null)
        }
        const currentUserProperty = this._parseByType(constants.propertiesTypes[name])
        if (result[name][currentUserProperty.name]) {
          if (Array.isArray(result[name][currentUserProperty.name])) {
            result[name][currentUserProperty.name].push(currentUserProperty.value)
          } else {
            const currentValue = result[name][currentUserProperty.name]
            result[name][currentUserProperty.name] = [currentValue]
            result[name][currentUserProperty.name].push(currentUserProperty.value)
          }
        } else {
          result[name][currentUserProperty.name] = currentUserProperty.value
        }
        continue
      }
      if (result[name]) {
        if (Array.isArray(result[name])) {
          result[name].push(this._parseByType(constants.propertiesTypes[name]))
        } else {
          result[name] = [result[name]]
          result[name].push(this._parseByType(constants.propertiesTypes[name]))
        }
      } else {
        result[name] = this._parseByType(constants.propertiesTypes[name])
      }
    }
    return result
  }

  _newPacket () {
    debug('_newPacket')
    if (this.packet) {
      this._list.consume(this.packet.length)
      debug('_newPacket: parser emit packet: packet.cmd: %s, packet.payload: %s, packet.length: %d', this.packet.cmd, this.packet.payload, this.packet.length)
      this.emit('packet', this.packet)
    }
    debug('_newPacket: new packet')
    this.packet = new Packet()

    this._pos = 0

    return true
  }

  _emitError (err) {
    debug('_emitError')
    this.error = err
    this.emit('error', err)
  }
}

module.exports = Parser


/***/ }),

/***/ 7593:
/***/ ((module, __unused_webpack_exports, __nccwpck_require__) => {

const protocol = __nccwpck_require__(6035)
const empty = Buffer.allocUnsafe(0)
const zeroBuf = Buffer.from([0])
const numbers = __nccwpck_require__(8653)
const nextTick = (__nccwpck_require__(7810).nextTick)
const debug = __nccwpck_require__(8237)('mqtt-packet:writeToStream')

const numCache = numbers.cache
const generateNumber = numbers.generateNumber
const generateCache = numbers.generateCache
const genBufVariableByteInt = numbers.genBufVariableByteInt
const generate4ByteBuffer = numbers.generate4ByteBuffer
let writeNumber = writeNumberCached
let toGenerate = true

function generate (packet, stream, opts) {
  debug('generate called')
  if (stream.cork) {
    stream.cork()
    nextTick(uncork, stream)
  }

  if (toGenerate) {
    toGenerate = false
    generateCache()
  }
  debug('generate: packet.cmd: %s', packet.cmd)
  switch (packet.cmd) {
    case 'connect':
      return connect(packet, stream, opts)
    case 'connack':
      return connack(packet, stream, opts)
    case 'publish':
      return publish(packet, stream, opts)
    case 'puback':
    case 'pubrec':
    case 'pubrel':
    case 'pubcomp':
      return confirmation(packet, stream, opts)
    case 'subscribe':
      return subscribe(packet, stream, opts)
    case 'suback':
      return suback(packet, stream, opts)
    case 'unsubscribe':
      return unsubscribe(packet, stream, opts)
    case 'unsuback':
      return unsuback(packet, stream, opts)
    case 'pingreq':
    case 'pingresp':
      return emptyPacket(packet, stream, opts)
    case 'disconnect':
      return disconnect(packet, stream, opts)
    case 'auth':
      return auth(packet, stream, opts)
    default:
      stream.emit('error', new Error('Unknown command'))
      return false
  }
}
/**
 * Controls numbers cache.
 * Set to "false" to allocate buffers on-the-flight instead of pre-generated cache
 */
Object.defineProperty(generate, 'cacheNumbers', {
  get () {
    return writeNumber === writeNumberCached
  },
  set (value) {
    if (value) {
      if (!numCache || Object.keys(numCache).length === 0) toGenerate = true
      writeNumber = writeNumberCached
    } else {
      toGenerate = false
      writeNumber = writeNumberGenerated
    }
  }
})

function uncork (stream) {
  stream.uncork()
}

function connect (packet, stream, opts) {
  const settings = packet || {}
  const protocolId = settings.protocolId || 'MQTT'
  let protocolVersion = settings.protocolVersion || 4
  const will = settings.will
  let clean = settings.clean
  const keepalive = settings.keepalive || 0
  const clientId = settings.clientId || ''
  const username = settings.username
  const password = settings.password
  /* mqtt5 new oprions */
  const properties = settings.properties

  if (clean === undefined) clean = true

  let length = 0

  // Must be a string and non-falsy
  if (!protocolId ||
     (typeof protocolId !== 'string' && !Buffer.isBuffer(protocolId))) {
    stream.emit('error', new Error('Invalid protocolId'))
    return false
  } else length += protocolId.length + 2

  // Must be 3 or 4 or 5
  if (protocolVersion !== 3 && protocolVersion !== 4 && protocolVersion !== 5) {
    stream.emit('error', new Error('Invalid protocol version'))
    return false
  } else length += 1

  // ClientId might be omitted in 3.1.1 and 5, but only if cleanSession is set to 1
  if ((typeof clientId === 'string' || Buffer.isBuffer(clientId)) &&
     (clientId || protocolVersion >= 4) && (clientId || clean)) {
    length += Buffer.byteLength(clientId) + 2
  } else {
    if (protocolVersion < 4) {
      stream.emit('error', new Error('clientId must be supplied before 3.1.1'))
      return false
    }
    if ((clean * 1) === 0) {
      stream.emit('error', new Error('clientId must be given if cleanSession set to 0'))
      return false
    }
  }

  // Must be a two byte number
  if (typeof keepalive !== 'number' ||
      keepalive < 0 ||
      keepalive > 65535 ||
      keepalive % 1 !== 0) {
    stream.emit('error', new Error('Invalid keepalive'))
    return false
  } else length += 2

  // Connect flags
  length += 1

  // Properties
  if (protocolVersion === 5) {
    var propertiesData = getProperties(stream, properties)
    if (!propertiesData) { return false }
    length += propertiesData.length
  }

  // If will exists...
  if (will) {
    // It must be an object
    if (typeof will !== 'object') {
      stream.emit('error', new Error('Invalid will'))
      return false
    }
    // It must have topic typeof string
    if (!will.topic || typeof will.topic !== 'string') {
      stream.emit('error', new Error('Invalid will topic'))
      return false
    } else {
      length += Buffer.byteLength(will.topic) + 2
    }

    // Payload
    length += 2 // payload length
    if (will.payload) {
      if (will.payload.length >= 0) {
        if (typeof will.payload === 'string') {
          length += Buffer.byteLength(will.payload)
        } else {
          length += will.payload.length
        }
      } else {
        stream.emit('error', new Error('Invalid will payload'))
        return false
      }
    }
    // will properties
    var willProperties = {}
    if (protocolVersion === 5) {
      willProperties = getProperties(stream, will.properties)
      if (!willProperties) { return false }
      length += willProperties.length
    }
  }

  // Username
  let providedUsername = false
  if (username != null) {
    if (isStringOrBuffer(username)) {
      providedUsername = true
      length += Buffer.byteLength(username) + 2
    } else {
      stream.emit('error', new Error('Invalid username'))
      return false
    }
  }

  // Password
  if (password != null) {
    if (!providedUsername) {
      stream.emit('error', new Error('Username is required to use password'))
      return false
    }

    if (isStringOrBuffer(password)) {
      length += byteLength(password) + 2
    } else {
      stream.emit('error', new Error('Invalid password'))
      return false
    }
  }

  // Generate header
  stream.write(protocol.CONNECT_HEADER)

  // Generate length
  writeVarByteInt(stream, length)

  // Generate protocol ID
  writeStringOrBuffer(stream, protocolId)

  if (settings.bridgeMode) {
    protocolVersion += 128
  }

  stream.write(
    protocolVersion === 131
      ? protocol.VERSION131
      : protocolVersion === 132
        ? protocol.VERSION132
        : protocolVersion === 4
          ? protocol.VERSION4
          : protocolVersion === 5
            ? protocol.VERSION5
            : protocol.VERSION3
  )

  // Connect flags
  let flags = 0
  flags |= (username != null) ? protocol.USERNAME_MASK : 0
  flags |= (password != null) ? protocol.PASSWORD_MASK : 0
  flags |= (will && will.retain) ? protocol.WILL_RETAIN_MASK : 0
  flags |= (will && will.qos) ? will.qos << protocol.WILL_QOS_SHIFT : 0
  flags |= will ? protocol.WILL_FLAG_MASK : 0
  flags |= clean ? protocol.CLEAN_SESSION_MASK : 0

  stream.write(Buffer.from([flags]))

  // Keepalive
  writeNumber(stream, keepalive)

  // Properties
  if (protocolVersion === 5) {
    propertiesData.write()
  }

  // Client ID
  writeStringOrBuffer(stream, clientId)

  // Will
  if (will) {
    if (protocolVersion === 5) {
      willProperties.write()
    }
    writeString(stream, will.topic)
    writeStringOrBuffer(stream, will.payload)
  }

  // Username and password
  if (username != null) {
    writeStringOrBuffer(stream, username)
  }
  if (password != null) {
    writeStringOrBuffer(stream, password)
  }
  // This is a small packet that happens only once on a stream
  // We assume the stream is always free to receive more data after this
  return true
}

function connack (packet, stream, opts) {
  const version = opts ? opts.protocolVersion : 4
  const settings = packet || {}
  const rc = version === 5 ? settings.reasonCode : settings.returnCode
  const properties = settings.properties
  let length = 2 // length of rc and sessionHeader

  // Check return code
  if (typeof rc !== 'number') {
    stream.emit('error', new Error('Invalid return code'))
    return false
  }
  // mqtt5 properties
  let propertiesData = null
  if (version === 5) {
    propertiesData = getProperties(stream, properties)
    if (!propertiesData) { return false }
    length += propertiesData.length
  }

  stream.write(protocol.CONNACK_HEADER)
  // length
  writeVarByteInt(stream, length)
  stream.write(settings.sessionPresent ? protocol.SESSIONPRESENT_HEADER : zeroBuf)

  stream.write(Buffer.from([rc]))
  if (propertiesData != null) {
    propertiesData.write()
  }
  return true
}

function publish (packet, stream, opts) {
  debug('publish: packet: %o', packet)
  const version = opts ? opts.protocolVersion : 4
  const settings = packet || {}
  const qos = settings.qos || 0
  const retain = settings.retain ? protocol.RETAIN_MASK : 0
  const topic = settings.topic
  const payload = settings.payload || empty
  const id = settings.messageId
  const properties = settings.properties

  let length = 0

  // Topic must be a non-empty string or Buffer
  if (typeof topic === 'string') length += Buffer.byteLength(topic) + 2
  else if (Buffer.isBuffer(topic)) length += topic.length + 2
  else {
    stream.emit('error', new Error('Invalid topic'))
    return false
  }

  // Get the payload length
  if (!Buffer.isBuffer(payload)) length += Buffer.byteLength(payload)
  else length += payload.length

  // Message ID must a number if qos > 0
  if (qos && typeof id !== 'number') {
    stream.emit('error', new Error('Invalid messageId'))
    return false
  } else if (qos) length += 2

  // mqtt5 properties
  let propertiesData = null
  if (version === 5) {
    propertiesData = getProperties(stream, properties)
    if (!propertiesData) { return false }
    length += propertiesData.length
  }

  // Header
  stream.write(protocol.PUBLISH_HEADER[qos][settings.dup ? 1 : 0][retain ? 1 : 0])

  // Remaining length
  writeVarByteInt(stream, length)

  // Topic
  writeNumber(stream, byteLength(topic))
  stream.write(topic)

  // Message ID
  if (qos > 0) writeNumber(stream, id)

  // Properties
  if (propertiesData != null) {
    propertiesData.write()
  }

  // Payload
  debug('publish: payload: %o', payload)
  return stream.write(payload)
}

/* Puback, pubrec, pubrel and pubcomp */
function confirmation (packet, stream, opts) {
  const version = opts ? opts.protocolVersion : 4
  const settings = packet || {}
  const type = settings.cmd || 'puback'
  const id = settings.messageId
  const dup = (settings.dup && type === 'pubrel') ? protocol.DUP_MASK : 0
  let qos = 0
  const reasonCode = settings.reasonCode
  const properties = settings.properties
  let length = version === 5 ? 3 : 2

  if (type === 'pubrel') qos = 1

  // Check message ID
  if (typeof id !== 'number') {
    stream.emit('error', new Error('Invalid messageId'))
    return false
  }

  // properies mqtt 5
  let propertiesData = null
  if (version === 5) {
    // Confirm should not add empty property length with no properties (rfc 3.4.2.2.1)
    if (typeof properties === 'object') {
      propertiesData = getPropertiesByMaximumPacketSize(stream, properties, opts, length)
      if (!propertiesData) { return false }
      length += propertiesData.length
    }
  }

  // Header
  stream.write(protocol.ACKS[type][qos][dup][0])

  // Length
  writeVarByteInt(stream, length)

  // Message ID
  writeNumber(stream, id)

  // reason code in header
  if (version === 5) {
    stream.write(Buffer.from([reasonCode]))
  }

  // properies mqtt 5
  if (propertiesData !== null) {
    propertiesData.write()
  }
  return true
}

function subscribe (packet, stream, opts) {
  debug('subscribe: packet: ')
  const version = opts ? opts.protocolVersion : 4
  const settings = packet || {}
  const dup = settings.dup ? protocol.DUP_MASK : 0
  const id = settings.messageId
  const subs = settings.subscriptions
  const properties = settings.properties

  let length = 0

  // Check message ID
  if (typeof id !== 'number') {
    stream.emit('error', new Error('Invalid messageId'))
    return false
  } else length += 2

  // properies mqtt 5
  let propertiesData = null
  if (version === 5) {
    propertiesData = getProperties(stream, properties)
    if (!propertiesData) { return false }
    length += propertiesData.length
  }

  // Check subscriptions
  if (typeof subs === 'object' && subs.length) {
    for (let i = 0; i < subs.length; i += 1) {
      const itopic = subs[i].topic
      const iqos = subs[i].qos

      if (typeof itopic !== 'string') {
        stream.emit('error', new Error('Invalid subscriptions - invalid topic'))
        return false
      }
      if (typeof iqos !== 'number') {
        stream.emit('error', new Error('Invalid subscriptions - invalid qos'))
        return false
      }

      if (version === 5) {
        const nl = subs[i].nl || false
        if (typeof nl !== 'boolean') {
          stream.emit('error', new Error('Invalid subscriptions - invalid No Local'))
          return false
        }
        const rap = subs[i].rap || false
        if (typeof rap !== 'boolean') {
          stream.emit('error', new Error('Invalid subscriptions - invalid Retain as Published'))
          return false
        }
        const rh = subs[i].rh || 0
        if (typeof rh !== 'number' || rh > 2) {
          stream.emit('error', new Error('Invalid subscriptions - invalid Retain Handling'))
          return false
        }
      }

      length += Buffer.byteLength(itopic) + 2 + 1
    }
  } else {
    stream.emit('error', new Error('Invalid subscriptions'))
    return false
  }

  // Generate header
  debug('subscribe: writing to stream: %o', protocol.SUBSCRIBE_HEADER)
  stream.write(protocol.SUBSCRIBE_HEADER[1][dup ? 1 : 0][0])

  // Generate length
  writeVarByteInt(stream, length)

  // Generate message ID
  writeNumber(stream, id)

  // properies mqtt 5
  if (propertiesData !== null) {
    propertiesData.write()
  }

  let result = true

  // Generate subs
  for (const sub of subs) {
    const jtopic = sub.topic
    const jqos = sub.qos
    const jnl = +sub.nl
    const jrap = +sub.rap
    const jrh = sub.rh
    let joptions

    // Write topic string
    writeString(stream, jtopic)

    // options process
    joptions = protocol.SUBSCRIBE_OPTIONS_QOS[jqos]
    if (version === 5) {
      joptions |= jnl ? protocol.SUBSCRIBE_OPTIONS_NL : 0
      joptions |= jrap ? protocol.SUBSCRIBE_OPTIONS_RAP : 0
      joptions |= jrh ? protocol.SUBSCRIBE_OPTIONS_RH[jrh] : 0
    }
    // Write options
    result = stream.write(Buffer.from([joptions]))
  }

  return result
}

function suback (packet, stream, opts) {
  const version = opts ? opts.protocolVersion : 4
  const settings = packet || {}
  const id = settings.messageId
  const granted = settings.granted
  const properties = settings.properties
  let length = 0

  // Check message ID
  if (typeof id !== 'number') {
    stream.emit('error', new Error('Invalid messageId'))
    return false
  } else length += 2

  // Check granted qos vector
  if (typeof granted === 'object' && granted.length) {
    for (let i = 0; i < granted.length; i += 1) {
      if (typeof granted[i] !== 'number') {
        stream.emit('error', new Error('Invalid qos vector'))
        return false
      }
      length += 1
    }
  } else {
    stream.emit('error', new Error('Invalid qos vector'))
    return false
  }

  // properies mqtt 5
  let propertiesData = null
  if (version === 5) {
    propertiesData = getPropertiesByMaximumPacketSize(stream, properties, opts, length)
    if (!propertiesData) { return false }
    length += propertiesData.length
  }

  // header
  stream.write(protocol.SUBACK_HEADER)

  // Length
  writeVarByteInt(stream, length)

  // Message ID
  writeNumber(stream, id)

  // properies mqtt 5
  if (propertiesData !== null) {
    propertiesData.write()
  }

  return stream.write(Buffer.from(granted))
}

function unsubscribe (packet, stream, opts) {
  const version = opts ? opts.protocolVersion : 4
  const settings = packet || {}
  const id = settings.messageId
  const dup = settings.dup ? protocol.DUP_MASK : 0
  const unsubs = settings.unsubscriptions
  const properties = settings.properties

  let length = 0

  // Check message ID
  if (typeof id !== 'number') {
    stream.emit('error', new Error('Invalid messageId'))
    return false
  } else {
    length += 2
  }
  // Check unsubs
  if (typeof unsubs === 'object' && unsubs.length) {
    for (let i = 0; i < unsubs.length; i += 1) {
      if (typeof unsubs[i] !== 'string') {
        stream.emit('error', new Error('Invalid unsubscriptions'))
        return false
      }
      length += Buffer.byteLength(unsubs[i]) + 2
    }
  } else {
    stream.emit('error', new Error('Invalid unsubscriptions'))
    return false
  }
  // properies mqtt 5
  let propertiesData = null
  if (version === 5) {
    propertiesData = getProperties(stream, properties)
    if (!propertiesData) { return false }
    length += propertiesData.length
  }

  // Header
  stream.write(protocol.UNSUBSCRIBE_HEADER[1][dup ? 1 : 0][0])

  // Length
  writeVarByteInt(stream, length)

  // Message ID
  writeNumber(stream, id)

  // properies mqtt 5
  if (propertiesData !== null) {
    propertiesData.write()
  }

  // Unsubs
  let result = true
  for (let j = 0; j < unsubs.length; j++) {
    result = writeString(stream, unsubs[j])
  }

  return result
}

function unsuback (packet, stream, opts) {
  const version = opts ? opts.protocolVersion : 4
  const settings = packet || {}
  const id = settings.messageId
  const dup = settings.dup ? protocol.DUP_MASK : 0
  const granted = settings.granted
  const properties = settings.properties
  const type = settings.cmd
  const qos = 0

  let length = 2

  // Check message ID
  if (typeof id !== 'number') {
    stream.emit('error', new Error('Invalid messageId'))
    return false
  }

  // Check granted
  if (version === 5) {
    if (typeof granted === 'object' && granted.length) {
      for (let i = 0; i < granted.length; i += 1) {
        if (typeof granted[i] !== 'number') {
          stream.emit('error', new Error('Invalid qos vector'))
          return false
        }
        length += 1
      }
    } else {
      stream.emit('error', new Error('Invalid qos vector'))
      return false
    }
  }

  // properies mqtt 5
  let propertiesData = null
  if (version === 5) {
    propertiesData = getPropertiesByMaximumPacketSize(stream, properties, opts, length)
    if (!propertiesData) { return false }
    length += propertiesData.length
  }

  // Header
  stream.write(protocol.ACKS[type][qos][dup][0])

  // Length
  writeVarByteInt(stream, length)

  // Message ID
  writeNumber(stream, id)

  // properies mqtt 5
  if (propertiesData !== null) {
    propertiesData.write()
  }

  // payload
  if (version === 5) {
    stream.write(Buffer.from(granted))
  }
  return true
}

function emptyPacket (packet, stream, opts) {
  return stream.write(protocol.EMPTY[packet.cmd])
}

function disconnect (packet, stream, opts) {
  const version = opts ? opts.protocolVersion : 4
  const settings = packet || {}
  const reasonCode = settings.reasonCode
  const properties = settings.properties
  let length = version === 5 ? 1 : 0

  // properies mqtt 5
  let propertiesData = null
  if (version === 5) {
    propertiesData = getPropertiesByMaximumPacketSize(stream, properties, opts, length)
    if (!propertiesData) { return false }
    length += propertiesData.length
  }

  // Header
  stream.write(Buffer.from([protocol.codes.disconnect << 4]))

  // Length
  writeVarByteInt(stream, length)

  // reason code in header
  if (version === 5) {
    stream.write(Buffer.from([reasonCode]))
  }

  // properies mqtt 5
  if (propertiesData !== null) {
    propertiesData.write()
  }

  return true
}

function auth (packet, stream, opts) {
  const version = opts ? opts.protocolVersion : 4
  const settings = packet || {}
  const reasonCode = settings.reasonCode
  const properties = settings.properties
  let length = version === 5 ? 1 : 0

  if (version !== 5) stream.emit('error', new Error('Invalid mqtt version for auth packet'))

  // properies mqtt 5
  const propertiesData = getPropertiesByMaximumPacketSize(stream, properties, opts, length)
  if (!propertiesData) { return false }
  length += propertiesData.length

  // Header
  stream.write(Buffer.from([protocol.codes.auth << 4]))

  // Length
  writeVarByteInt(stream, length)

  // reason code in header
  stream.write(Buffer.from([reasonCode]))

  // properies mqtt 5
  if (propertiesData !== null) {
    propertiesData.write()
  }
  return true
}

/**
 * writeVarByteInt - write an MQTT style variable byte integer to the buffer
 *
 * @param <Buffer> buffer - destination
 * @param <Number> pos - offset
 * @param <Number> length - length (>0)
 * @returns <Number> number of bytes written
 *
 * @api private
 */

const varByteIntCache = {}
function writeVarByteInt (stream, num) {
  if (num > protocol.VARBYTEINT_MAX) {
    stream.emit('error', new Error(`Invalid variable byte integer: ${num}`))
    return false
  }

  let buffer = varByteIntCache[num]

  if (!buffer) {
    buffer = genBufVariableByteInt(num)
    if (num < 16384) varByteIntCache[num] = buffer
  }
  debug('writeVarByteInt: writing to stream: %o', buffer)
  return stream.write(buffer)
}

/**
 * writeString - write a utf8 string to the buffer
 *
 * @param <Buffer> buffer - destination
 * @param <Number> pos - offset
 * @param <String> string - string to write
 * @return <Number> number of bytes written
 *
 * @api private
 */

function writeString (stream, string) {
  const strlen = Buffer.byteLength(string)
  writeNumber(stream, strlen)

  debug('writeString: %s', string)
  return stream.write(string, 'utf8')
}

/**
 * writeStringPair - write a utf8 string pairs to the buffer
 *
 * @param <Buffer> buffer - destination
 * @param <String> name - string name to write
 * @param <String> value - string value to write
 * @return <Number> number of bytes written
 *
 * @api private
 */
function writeStringPair (stream, name, value) {
  writeString(stream, name)
  writeString(stream, value)
}

/**
 * writeNumber - write a two byte number to the buffer
 *
 * @param <Buffer> buffer - destination
 * @param <Number> pos - offset
 * @param <String> number - number to write
 * @return <Number> number of bytes written
 *
 * @api private
 */
function writeNumberCached (stream, number) {
  debug('writeNumberCached: number: %d', number)
  debug('writeNumberCached: %o', numCache[number])
  return stream.write(numCache[number])
}
function writeNumberGenerated (stream, number) {
  const generatedNumber = generateNumber(number)
  debug('writeNumberGenerated: %o', generatedNumber)
  return stream.write(generatedNumber)
}
function write4ByteNumber (stream, number) {
  const generated4ByteBuffer = generate4ByteBuffer(number)
  debug('write4ByteNumber: %o', generated4ByteBuffer)
  return stream.write(generated4ByteBuffer)
}
/**
 * writeStringOrBuffer - write a String or Buffer with the its length prefix
 *
 * @param <Buffer> buffer - destination
 * @param <Number> pos - offset
 * @param <String> toWrite - String or Buffer
 * @return <Number> number of bytes written
 */
function writeStringOrBuffer (stream, toWrite) {
  if (typeof toWrite === 'string') {
    writeString(stream, toWrite)
  } else if (toWrite) {
    writeNumber(stream, toWrite.length)
    stream.write(toWrite)
  } else writeNumber(stream, 0)
}

function getProperties (stream, properties) {
  /* connect properties */
  if (typeof properties !== 'object' || properties.length != null) {
    return {
      length: 1,
      write () {
        writeProperties(stream, {}, 0)
      }
    }
  }
  let propertiesLength = 0
  function getLengthProperty (name, value) {
    const type = protocol.propertiesTypes[name]
    let length = 0
    switch (type) {
      case 'byte': {
        if (typeof value !== 'boolean') {
          stream.emit('error', new Error(`Invalid ${name}: ${value}`))
          return false
        }
        length += 1 + 1
        break
      }
      case 'int8': {
        if (typeof value !== 'number' || value < 0 || value > 0xff) {
          stream.emit('error', new Error(`Invalid ${name}: ${value}`))
          return false
        }
        length += 1 + 1
        break
      }
      case 'binary': {
        if (value && value === null) {
          stream.emit('error', new Error(`Invalid ${name}: ${value}`))
          return false
        }
        length += 1 + Buffer.byteLength(value) + 2
        break
      }
      case 'int16': {
        if (typeof value !== 'number' || value < 0 || value > 0xffff) {
          stream.emit('error', new Error(`Invalid ${name}: ${value}`))
          return false
        }
        length += 1 + 2
        break
      }
      case 'int32': {
        if (typeof value !== 'number' || value < 0 || value > 0xffffffff) {
          stream.emit('error', new Error(`Invalid ${name}: ${value}`))
          return false
        }
        length += 1 + 4
        break
      }
      case 'var': {
        // var byte integer is max 24 bits packed in 32 bits
        if (typeof value !== 'number' || value < 0 || value > 0x0fffffff) {
          stream.emit('error', new Error(`Invalid ${name}: ${value}`))
          return false
        }
        length += 1 + Buffer.byteLength(genBufVariableByteInt(value))
        break
      }
      case 'string': {
        if (typeof value !== 'string') {
          stream.emit('error', new Error(`Invalid ${name}: ${value}`))
          return false
        }
        length += 1 + 2 + Buffer.byteLength(value.toString())
        break
      }
      case 'pair': {
        if (typeof value !== 'object') {
          stream.emit('error', new Error(`Invalid ${name}: ${value}`))
          return false
        }
        length += Object.getOwnPropertyNames(value).reduce((result, name) => {
          const currentValue = value[name]
          if (Array.isArray(currentValue)) {
            result += currentValue.reduce((currentLength, value) => {
              currentLength += 1 + 2 + Buffer.byteLength(name.toString()) + 2 + Buffer.byteLength(value.toString())
              return currentLength
            }, 0)
          } else {
            result += 1 + 2 + Buffer.byteLength(name.toString()) + 2 + Buffer.byteLength(value[name].toString())
          }
          return result
        }, 0)
        break
      }
      default: {
        stream.emit('error', new Error(`Invalid property ${name}: ${value}`))
        return false
      }
    }
    return length
  }
  if (properties) {
    for (const propName in properties) {
      let propLength = 0
      let propValueLength = 0
      const propValue = properties[propName]
      if (Array.isArray(propValue)) {
        for (let valueIndex = 0; valueIndex < propValue.length; valueIndex++) {
          propValueLength = getLengthProperty(propName, propValue[valueIndex])
          if (!propValueLength) { return false }
          propLength += propValueLength
        }
      } else {
        propValueLength = getLengthProperty(propName, propValue)
        if (!propValueLength) { return false }
        propLength = propValueLength
      }
      if (!propLength) return false
      propertiesLength += propLength
    }
  }
  const propertiesLengthLength = Buffer.byteLength(genBufVariableByteInt(propertiesLength))

  return {
    length: propertiesLengthLength + propertiesLength,
    write () {
      writeProperties(stream, properties, propertiesLength)
    }
  }
}

function getPropertiesByMaximumPacketSize (stream, properties, opts, length) {
  const mayEmptyProps = ['reasonString', 'userProperties']
  const maximumPacketSize = opts && opts.properties && opts.properties.maximumPacketSize ? opts.properties.maximumPacketSize : 0

  let propertiesData = getProperties(stream, properties)
  if (maximumPacketSize) {
    while (length + propertiesData.length > maximumPacketSize) {
      const currentMayEmptyProp = mayEmptyProps.shift()
      if (currentMayEmptyProp && properties[currentMayEmptyProp]) {
        delete properties[currentMayEmptyProp]
        propertiesData = getProperties(stream, properties)
      } else {
        return false
      }
    }
  }
  return propertiesData
}

function writeProperty (stream, propName, value) {
  const type = protocol.propertiesTypes[propName]
  switch (type) {
    case 'byte': {
      stream.write(Buffer.from([protocol.properties[propName]]))
      stream.write(Buffer.from([+value]))
      break
    }
    case 'int8': {
      stream.write(Buffer.from([protocol.properties[propName]]))
      stream.write(Buffer.from([value]))
      break
    }
    case 'binary': {
      stream.write(Buffer.from([protocol.properties[propName]]))
      writeStringOrBuffer(stream, value)
      break
    }
    case 'int16': {
      stream.write(Buffer.from([protocol.properties[propName]]))
      writeNumber(stream, value)
      break
    }
    case 'int32': {
      stream.write(Buffer.from([protocol.properties[propName]]))
      write4ByteNumber(stream, value)
      break
    }
    case 'var': {
      stream.write(Buffer.from([protocol.properties[propName]]))
      writeVarByteInt(stream, value)
      break
    }
    case 'string': {
      stream.write(Buffer.from([protocol.properties[propName]]))
      writeString(stream, value)
      break
    }
    case 'pair': {
      Object.getOwnPropertyNames(value).forEach(name => {
        const currentValue = value[name]
        if (Array.isArray(currentValue)) {
          currentValue.forEach(value => {
            stream.write(Buffer.from([protocol.properties[propName]]))
            writeStringPair(stream, name.toString(), value.toString())
          })
        } else {
          stream.write(Buffer.from([protocol.properties[propName]]))
          writeStringPair(stream, name.toString(), currentValue.toString())
        }
      })
      break
    }
    default: {
      stream.emit('error', new Error(`Invalid property ${propName} value: ${value}`))
      return false
    }
  }
}

function writeProperties (stream, properties, propertiesLength) {
  /* write properties to stream */
  writeVarByteInt(stream, propertiesLength)
  for (const propName in properties) {
    if (Object.prototype.hasOwnProperty.call(properties, propName) && properties[propName] !== null) {
      const value = properties[propName]
      if (Array.isArray(value)) {
        for (let valueIndex = 0; valueIndex < value.length; valueIndex++) {
          writeProperty(stream, propName, value[valueIndex])
        }
      } else {
        writeProperty(stream, propName, value)
      }
    }
  }
}

function byteLength (bufOrString) {
  if (!bufOrString) return 0
  else if (bufOrString instanceof Buffer) return bufOrString.length
  else return Buffer.byteLength(bufOrString)
}

function isStringOrBuffer (field) {
  return typeof field === 'string' || field instanceof Buffer
}

module.exports = generate


/***/ }),

/***/ 5823:
/***/ ((module, __unused_webpack_exports, __nccwpck_require__) => {

"use strict";


/**
 * Module dependencies
 */
const EventEmitter = (__nccwpck_require__(2361).EventEmitter)
const Store = __nccwpck_require__(5498)
const TopicAliasRecv = __nccwpck_require__(9198)
const TopicAliasSend = __nccwpck_require__(9456)
const mqttPacket = __nccwpck_require__(835)
const DefaultMessageIdProvider = __nccwpck_require__(1966)
const Writable = (__nccwpck_require__(1642).Writable)
const inherits = __nccwpck_require__(4124)
const reInterval = __nccwpck_require__(8045)
const clone = __nccwpck_require__(3189)
const validations = __nccwpck_require__(9465)
const xtend = __nccwpck_require__(1208)
const debug = __nccwpck_require__(8237)('mqttjs:client')
const nextTick = process ? process.nextTick : function (callback) { setTimeout(callback, 0) }
const setImmediate = global.setImmediate || function (callback) {
  // works in node v0.8
  nextTick(callback)
}
const defaultConnectOptions = {
  keepalive: 60,
  reschedulePings: true,
  protocolId: 'MQTT',
  protocolVersion: 4,
  reconnectPeriod: 1000,
  connectTimeout: 30 * 1000,
  clean: true,
  resubscribe: true
}

const socketErrors = [
  'ECONNREFUSED',
  'EADDRINUSE',
  'ECONNRESET',
  'ENOTFOUND'
]

// Other Socket Errors: EADDRINUSE, ECONNRESET, ENOTFOUND.

const errors = {
  0: '',
  1: 'Unacceptable protocol version',
  2: 'Identifier rejected',
  3: 'Server unavailable',
  4: 'Bad username or password',
  5: 'Not authorized',
  16: 'No matching subscribers',
  17: 'No subscription existed',
  128: 'Unspecified error',
  129: 'Malformed Packet',
  130: 'Protocol Error',
  131: 'Implementation specific error',
  132: 'Unsupported Protocol Version',
  133: 'Client Identifier not valid',
  134: 'Bad User Name or Password',
  135: 'Not authorized',
  136: 'Server unavailable',
  137: 'Server busy',
  138: 'Banned',
  139: 'Server shutting down',
  140: 'Bad authentication method',
  141: 'Keep Alive timeout',
  142: 'Session taken over',
  143: 'Topic Filter invalid',
  144: 'Topic Name invalid',
  145: 'Packet identifier in use',
  146: 'Packet Identifier not found',
  147: 'Receive Maximum exceeded',
  148: 'Topic Alias invalid',
  149: 'Packet too large',
  150: 'Message rate too high',
  151: 'Quota exceeded',
  152: 'Administrative action',
  153: 'Payload format invalid',
  154: 'Retain not supported',
  155: 'QoS not supported',
  156: 'Use another server',
  157: 'Server moved',
  158: 'Shared Subscriptions not supported',
  159: 'Connection rate exceeded',
  160: 'Maximum connect time',
  161: 'Subscription Identifiers not supported',
  162: 'Wildcard Subscriptions not supported'
}

function defaultId () {
  return 'mqttjs_' + Math.random().toString(16).substr(2, 8)
}

function applyTopicAlias (client, packet) {
  if (client.options.protocolVersion === 5) {
    if (packet.cmd === 'publish') {
      let alias
      if (packet.properties) {
        alias = packet.properties.topicAlias
      }
      const topic = packet.topic.toString()
      if (client.topicAliasSend) {
        if (alias) {
          if (topic.length !== 0) {
            // register topic alias
            debug('applyTopicAlias :: register topic: %s - alias: %d', topic, alias)
            if (!client.topicAliasSend.put(topic, alias)) {
              debug('applyTopicAlias :: error out of range. topic: %s - alias: %d', topic, alias)
              return new Error('Sending Topic Alias out of range')
            }
          }
        } else {
          if (topic.length !== 0) {
            if (client.options.autoAssignTopicAlias) {
              alias = client.topicAliasSend.getAliasByTopic(topic)
              if (alias) {
                packet.topic = ''
                packet.properties = { ...(packet.properties), topicAlias: alias }
                debug('applyTopicAlias :: auto assign(use) topic: %s - alias: %d', topic, alias)
              } else {
                alias = client.topicAliasSend.getLruAlias()
                client.topicAliasSend.put(topic, alias)
                packet.properties = { ...(packet.properties), topicAlias: alias }
                debug('applyTopicAlias :: auto assign topic: %s - alias: %d', topic, alias)
              }
            } else if (client.options.autoUseTopicAlias) {
              alias = client.topicAliasSend.getAliasByTopic(topic)
              if (alias) {
                packet.topic = ''
                packet.properties = { ...(packet.properties), topicAlias: alias }
                debug('applyTopicAlias :: auto use topic: %s - alias: %d', topic, alias)
              }
            }
          }
        }
      } else if (alias) {
        debug('applyTopicAlias :: error out of range. topic: %s - alias: %d', topic, alias)
        return new Error('Sending Topic Alias out of range')
      }
    }
  }
}

function removeTopicAliasAndRecoverTopicName (client, packet) {
  let alias
  if (packet.properties) {
    alias = packet.properties.topicAlias
  }

  let topic = packet.topic.toString()
  if (topic.length === 0) {
    // restore topic from alias
    if (typeof alias === 'undefined') {
      return new Error('Unregistered Topic Alias')
    } else {
      topic = client.topicAliasSend.getTopicByAlias(alias)
      if (typeof topic === 'undefined') {
        return new Error('Unregistered Topic Alias')
      } else {
        packet.topic = topic
      }
    }
  }
  if (alias) {
    delete packet.properties.topicAlias
  }
}

function sendPacket (client, packet, cb) {
  debug('sendPacket :: packet: %O', packet)
  debug('sendPacket :: emitting `packetsend`')

  client.emit('packetsend', packet)

  debug('sendPacket :: writing to stream')
  const result = mqttPacket.writeToStream(packet, client.stream, client.options)
  debug('sendPacket :: writeToStream result %s', result)
  if (!result && cb && cb !== nop) {
    debug('sendPacket :: handle events on `drain` once through callback.')
    client.stream.once('drain', cb)
  } else if (cb) {
    debug('sendPacket :: invoking cb')
    cb()
  }
}

function flush (queue) {
  if (queue) {
    debug('flush: queue exists? %b', !!(queue))
    Object.keys(queue).forEach(function (messageId) {
      if (typeof queue[messageId].cb === 'function') {
        queue[messageId].cb(new Error('Connection closed'))
        // This is suspicious.  Why do we only delete this if we have a callbck?
        // If this is by-design, then adding no as callback would cause this to get deleted unintentionally.
        delete queue[messageId]
      }
    })
  }
}

function flushVolatile (queue) {
  if (queue) {
    debug('flushVolatile :: deleting volatile messages from the queue and setting their callbacks as error function')
    Object.keys(queue).forEach(function (messageId) {
      if (queue[messageId].volatile && typeof queue[messageId].cb === 'function') {
        queue[messageId].cb(new Error('Connection closed'))
        delete queue[messageId]
      }
    })
  }
}

function storeAndSend (client, packet, cb, cbStorePut) {
  debug('storeAndSend :: store packet with cmd %s to outgoingStore', packet.cmd)
  let storePacket = packet
  let err
  if (storePacket.cmd === 'publish') {
    // The original packet is for sending.
    // The cloned storePacket is for storing to resend on reconnect.
    // Topic Alias must not be used after disconnected.
    storePacket = clone(packet)
    err = removeTopicAliasAndRecoverTopicName(client, storePacket)
    if (err) {
      return cb && cb(err)
    }
  }
  client.outgoingStore.put(storePacket, function storedPacket (err) {
    if (err) {
      return cb && cb(err)
    }
    cbStorePut()
    sendPacket(client, packet, cb)
  })
}

function nop (error) {
  debug('nop ::', error)
}

/**
 * MqttClient constructor
 *
 * @param {Stream} stream - stream
 * @param {Object} [options] - connection options
 * (see Connection#connect)
 */
function MqttClient (streamBuilder, options) {
  let k
  const that = this

  if (!(this instanceof MqttClient)) {
    return new MqttClient(streamBuilder, options)
  }

  this.options = options || {}

  // Defaults
  for (k in defaultConnectOptions) {
    if (typeof this.options[k] === 'undefined') {
      this.options[k] = defaultConnectOptions[k]
    } else {
      this.options[k] = options[k]
    }
  }

  debug('MqttClient :: options.protocol', options.protocol)
  debug('MqttClient :: options.protocolVersion', options.protocolVersion)
  debug('MqttClient :: options.username', options.username)
  debug('MqttClient :: options.keepalive', options.keepalive)
  debug('MqttClient :: options.reconnectPeriod', options.reconnectPeriod)
  debug('MqttClient :: options.rejectUnauthorized', options.rejectUnauthorized)
  debug('MqttClient :: options.topicAliasMaximum', options.topicAliasMaximum)

  this.options.clientId = (typeof options.clientId === 'string') ? options.clientId : defaultId()

  debug('MqttClient :: clientId', this.options.clientId)

  this.options.customHandleAcks = (options.protocolVersion === 5 && options.customHandleAcks) ? options.customHandleAcks : function () { arguments[3](0) }

  this.streamBuilder = streamBuilder

  this.messageIdProvider = (typeof this.options.messageIdProvider === 'undefined') ? new DefaultMessageIdProvider() : this.options.messageIdProvider

  // Inflight message storages
  this.outgoingStore = options.outgoingStore || new Store()
  this.incomingStore = options.incomingStore || new Store()

  // Should QoS zero messages be queued when the connection is broken?
  this.queueQoSZero = options.queueQoSZero === undefined ? true : options.queueQoSZero

  // map of subscribed topics to support reconnection
  this._resubscribeTopics = {}

  // map of a subscribe messageId and a topic
  this.messageIdToTopic = {}

  // Ping timer, setup in _setupPingTimer
  this.pingTimer = null
  // Is the client connected?
  this.connected = false
  // Are we disconnecting?
  this.disconnecting = false
  // Packet queue
  this.queue = []
  // connack timer
  this.connackTimer = null
  // Reconnect timer
  this.reconnectTimer = null
  // Is processing store?
  this._storeProcessing = false
  // Packet Ids are put into the store during store processing
  this._packetIdsDuringStoreProcessing = {}
  // Store processing queue
  this._storeProcessingQueue = []

  // Inflight callbacks
  this.outgoing = {}

  // True if connection is first time.
  this._firstConnection = true

  if (options.topicAliasMaximum > 0) {
    if (options.topicAliasMaximum > 0xffff) {
      debug('MqttClient :: options.topicAliasMaximum is out of range')
    } else {
      this.topicAliasRecv = new TopicAliasRecv(options.topicAliasMaximum)
    }
  }

  // Send queued packets
  this.on('connect', function () {
    const queue = this.queue

    function deliver () {
      const entry = queue.shift()
      debug('deliver :: entry %o', entry)
      let packet = null

      if (!entry) {
        that._resubscribe()
        return
      }

      packet = entry.packet
      debug('deliver :: call _sendPacket for %o', packet)
      let send = true
      if (packet.messageId && packet.messageId !== 0) {
        if (!that.messageIdProvider.register(packet.messageId)) {
          send = false
        }
      }
      if (send) {
        that._sendPacket(
          packet,
          function (err) {
            if (entry.cb) {
              entry.cb(err)
            }
            deliver()
          }
        )
      } else {
        debug('messageId: %d has already used. The message is skipped and removed.', packet.messageId)
        deliver()
      }
    }

    debug('connect :: sending queued packets')
    deliver()
  })

  this.on('close', function () {
    debug('close :: connected set to `false`')
    this.connected = false

    debug('close :: clearing connackTimer')
    clearTimeout(this.connackTimer)

    debug('close :: clearing ping timer')
    if (that.pingTimer !== null) {
      that.pingTimer.clear()
      that.pingTimer = null
    }

    if (this.topicAliasRecv) {
      this.topicAliasRecv.clear()
    }

    debug('close :: calling _setupReconnect')
    this._setupReconnect()
  })
  EventEmitter.call(this)

  debug('MqttClient :: setting up stream')
  this._setupStream()
}
inherits(MqttClient, EventEmitter)

/**
 * setup the event handlers in the inner stream.
 *
 * @api private
 */
MqttClient.prototype._setupStream = function () {
  const that = this
  const writable = new Writable()
  const parser = mqttPacket.parser(this.options)
  let completeParse = null
  const packets = []

  debug('_setupStream :: calling method to clear reconnect')
  this._clearReconnect()

  debug('_setupStream :: using streamBuilder provided to client to create stream')
  this.stream = this.streamBuilder(this)

  parser.on('packet', function (packet) {
    debug('parser :: on packet push to packets array.')
    packets.push(packet)
  })

  function nextTickWork () {
    if (packets.length) {
      nextTick(work)
    } else {
      const done = completeParse
      completeParse = null
      done()
    }
  }

  function work () {
    debug('work :: getting next packet in queue')
    const packet = packets.shift()

    if (packet) {
      debug('work :: packet pulled from queue')
      that._handlePacket(packet, nextTickWork)
    } else {
      debug('work :: no packets in queue')
      const done = completeParse
      completeParse = null
      debug('work :: done flag is %s', !!(done))
      if (done) done()
    }
  }

  writable._write = function (buf, enc, done) {
    completeParse = done
    debug('writable stream :: parsing buffer')
    parser.parse(buf)
    work()
  }

  function streamErrorHandler (error) {
    debug('streamErrorHandler :: error', error.message)
    if (socketErrors.includes(error.code)) {
      // handle error
      debug('streamErrorHandler :: emitting error')
      that.emit('error', error)
    } else {
      nop(error)
    }
  }

  debug('_setupStream :: pipe stream to writable stream')
  this.stream.pipe(writable)

  // Suppress connection errors
  this.stream.on('error', streamErrorHandler)

  // Echo stream close
  this.stream.on('close', function () {
    debug('(%s)stream :: on close', that.options.clientId)
    flushVolatile(that.outgoing)
    debug('stream: emit close to MqttClient')
    that.emit('close')
  })

  // Send a connect packet
  debug('_setupStream: sending packet `connect`')
  const connectPacket = Object.create(this.options)
  connectPacket.cmd = 'connect'
  if (this.topicAliasRecv) {
    if (!connectPacket.properties) {
      connectPacket.properties = {}
    }
    if (this.topicAliasRecv) {
      connectPacket.properties.topicAliasMaximum = this.topicAliasRecv.max
    }
  }
  // avoid message queue
  sendPacket(this, connectPacket)

  // Echo connection errors
  parser.on('error', this.emit.bind(this, 'error'))

  // auth
  if (this.options.properties) {
    if (!this.options.properties.authenticationMethod && this.options.properties.authenticationData) {
      that.end(() =>
        this.emit('error', new Error('Packet has no Authentication Method')
        ))
      return this
    }
    if (this.options.properties.authenticationMethod && this.options.authPacket && typeof this.options.authPacket === 'object') {
      const authPacket = xtend({ cmd: 'auth', reasonCode: 0 }, this.options.authPacket)
      sendPacket(this, authPacket)
    }
  }

  // many drain listeners are needed for qos 1 callbacks if the connection is intermittent
  this.stream.setMaxListeners(1000)

  clearTimeout(this.connackTimer)
  this.connackTimer = setTimeout(function () {
    debug('!!connectTimeout hit!! Calling _cleanUp with force `true`')
    that._cleanUp(true)
  }, this.options.connectTimeout)
}

MqttClient.prototype._handlePacket = function (packet, done) {
  const options = this.options

  if (options.protocolVersion === 5 && options.properties && options.properties.maximumPacketSize && options.properties.maximumPacketSize < packet.length) {
    this.emit('error', new Error('exceeding packets size ' + packet.cmd))
    this.end({ reasonCode: 149, properties: { reasonString: 'Maximum packet size was exceeded' } })
    return this
  }
  debug('_handlePacket :: emitting packetreceive')
  this.emit('packetreceive', packet)

  switch (packet.cmd) {
    case 'publish':
      this._handlePublish(packet, done)
      break
    case 'puback':
    case 'pubrec':
    case 'pubcomp':
    case 'suback':
    case 'unsuback':
      this._handleAck(packet)
      done()
      break
    case 'pubrel':
      this._handlePubrel(packet, done)
      break
    case 'connack':
      this._handleConnack(packet)
      done()
      break
    case 'auth':
      this._handleAuth(packet)
      done()
      break
    case 'pingresp':
      this._handlePingresp(packet)
      done()
      break
    case 'disconnect':
      this._handleDisconnect(packet)
      done()
      break
    default:
      // do nothing
      // maybe we should do an error handling
      // or just log it
      break
  }
}

MqttClient.prototype._checkDisconnecting = function (callback) {
  if (this.disconnecting) {
    if (callback && callback !== nop) {
      callback(new Error('client disconnecting'))
    } else {
      this.emit('error', new Error('client disconnecting'))
    }
  }
  return this.disconnecting
}

/**
 * publish - publish <message> to <topic>
 *
 * @param {String} topic - topic to publish to
 * @param {String, Buffer} message - message to publish
 * @param {Object} [opts] - publish options, includes:
 *    {Number} qos - qos level to publish on
 *    {Boolean} retain - whether or not to retain the message
 *    {Boolean} dup - whether or not mark a message as duplicate
 *    {Function} cbStorePut - function(){} called when message is put into `outgoingStore`
 * @param {Function} [callback] - function(err){}
 *    called when publish succeeds or fails
 * @returns {MqttClient} this - for chaining
 * @api public
 *
 * @example client.publish('topic', 'message');
 * @example
 *     client.publish('topic', 'message', {qos: 1, retain: true, dup: true});
 * @example client.publish('topic', 'message', console.log);
 */
MqttClient.prototype.publish = function (topic, message, opts, callback) {
  debug('publish :: message `%s` to topic `%s`', message, topic)
  const options = this.options

  // .publish(topic, payload, cb);
  if (typeof opts === 'function') {
    callback = opts
    opts = null
  }

  // default opts
  const defaultOpts = { qos: 0, retain: false, dup: false }
  opts = xtend(defaultOpts, opts)

  if (this._checkDisconnecting(callback)) {
    return this
  }

  const that = this
  const publishProc = function () {
    let messageId = 0
    if (opts.qos === 1 || opts.qos === 2) {
      messageId = that._nextId()
      if (messageId === null) {
        debug('No messageId left')
        return false
      }
    }
    const packet = {
      cmd: 'publish',
      topic: topic,
      payload: message,
      qos: opts.qos,
      retain: opts.retain,
      messageId: messageId,
      dup: opts.dup
    }

    if (options.protocolVersion === 5) {
      packet.properties = opts.properties
    }

    debug('publish :: qos', opts.qos)
    switch (opts.qos) {
      case 1:
      case 2:
        // Add to callbacks
        that.outgoing[packet.messageId] = {
          volatile: false,
          cb: callback || nop
        }
        debug('MqttClient:publish: packet cmd: %s', packet.cmd)
        that._sendPacket(packet, undefined, opts.cbStorePut)
        break
      default:
        debug('MqttClient:publish: packet cmd: %s', packet.cmd)
        that._sendPacket(packet, callback, opts.cbStorePut)
        break
    }
    return true
  }

  if (this._storeProcessing || this._storeProcessingQueue.length > 0 || !publishProc()) {
    this._storeProcessingQueue.push(
      {
        invoke: publishProc,
        cbStorePut: opts.cbStorePut,
        callback: callback
      }
    )
  }
  return this
}

/**
 * subscribe - subscribe to <topic>
 *
 * @param {String, Array, Object} topic - topic(s) to subscribe to, supports objects in the form {'topic': qos}
 * @param {Object} [opts] - optional subscription options, includes:
 *    {Number} qos - subscribe qos level
 * @param {Function} [callback] - function(err, granted){} where:
 *    {Error} err - subscription error (none at the moment!)
 *    {Array} granted - array of {topic: 't', qos: 0}
 * @returns {MqttClient} this - for chaining
 * @api public
 * @example client.subscribe('topic');
 * @example client.subscribe('topic', {qos: 1});
 * @example client.subscribe({'topic': {qos: 0}, 'topic2': {qos: 1}}, console.log);
 * @example client.subscribe('topic', console.log);
 */
MqttClient.prototype.subscribe = function () {
  const that = this
  const args = new Array(arguments.length)
  for (let i = 0; i < arguments.length; i++) {
    args[i] = arguments[i]
  }
  const subs = []
  let obj = args.shift()
  const resubscribe = obj.resubscribe
  let callback = args.pop() || nop
  let opts = args.pop()
  const version = this.options.protocolVersion

  delete obj.resubscribe

  if (typeof obj === 'string') {
    obj = [obj]
  }

  if (typeof callback !== 'function') {
    opts = callback
    callback = nop
  }

  const invalidTopic = validations.validateTopics(obj)
  if (invalidTopic !== null) {
    setImmediate(callback, new Error('Invalid topic ' + invalidTopic))
    return this
  }

  if (this._checkDisconnecting(callback)) {
    debug('subscribe: discconecting true')
    return this
  }

  const defaultOpts = {
    qos: 0
  }
  if (version === 5) {
    defaultOpts.nl = false
    defaultOpts.rap = false
    defaultOpts.rh = 0
  }
  opts = xtend(defaultOpts, opts)

  if (Array.isArray(obj)) {
    obj.forEach(function (topic) {
      debug('subscribe: array topic %s', topic)
      if (!Object.prototype.hasOwnProperty.call(that._resubscribeTopics, topic) ||
        that._resubscribeTopics[topic].qos < opts.qos ||
          resubscribe) {
        const currentOpts = {
          topic: topic,
          qos: opts.qos
        }
        if (version === 5) {
          currentOpts.nl = opts.nl
          currentOpts.rap = opts.rap
          currentOpts.rh = opts.rh
          currentOpts.properties = opts.properties
        }
        debug('subscribe: pushing topic `%s` and qos `%s` to subs list', currentOpts.topic, currentOpts.qos)
        subs.push(currentOpts)
      }
    })
  } else {
    Object
      .keys(obj)
      .forEach(function (k) {
        debug('subscribe: object topic %s', k)
        if (!Object.prototype.hasOwnProperty.call(that._resubscribeTopics, k) ||
          that._resubscribeTopics[k].qos < obj[k].qos ||
            resubscribe) {
          const currentOpts = {
            topic: k,
            qos: obj[k].qos
          }
          if (version === 5) {
            currentOpts.nl = obj[k].nl
            currentOpts.rap = obj[k].rap
            currentOpts.rh = obj[k].rh
            currentOpts.properties = opts.properties
          }
          debug('subscribe: pushing `%s` to subs list', currentOpts)
          subs.push(currentOpts)
        }
      })
  }

  if (!subs.length) {
    callback(null, [])
    return this
  }

  const subscribeProc = function () {
    const messageId = that._nextId()
    if (messageId === null) {
      debug('No messageId left')
      return false
    }

    const packet = {
      cmd: 'subscribe',
      subscriptions: subs,
      qos: 1,
      retain: false,
      dup: false,
      messageId: messageId
    }

    if (opts.properties) {
      packet.properties = opts.properties
    }

    // subscriptions to resubscribe to in case of disconnect
    if (that.options.resubscribe) {
      debug('subscribe :: resubscribe true')
      const topics = []
      subs.forEach(function (sub) {
        if (that.options.reconnectPeriod > 0) {
          const topic = { qos: sub.qos }
          if (version === 5) {
            topic.nl = sub.nl || false
            topic.rap = sub.rap || false
            topic.rh = sub.rh || 0
            topic.properties = sub.properties
          }
          that._resubscribeTopics[sub.topic] = topic
          topics.push(sub.topic)
        }
      })
      that.messageIdToTopic[packet.messageId] = topics
    }

    that.outgoing[packet.messageId] = {
      volatile: true,
      cb: function (err, packet) {
        if (!err) {
          const granted = packet.granted
          for (let i = 0; i < granted.length; i += 1) {
            subs[i].qos = granted[i]
          }
        }

        callback(err, subs)
      }
    }
    debug('subscribe :: call _sendPacket')
    that._sendPacket(packet)
    return true
  }

  if (this._storeProcessing || this._storeProcessingQueue.length > 0 || !subscribeProc()) {
    this._storeProcessingQueue.push(
      {
        invoke: subscribeProc,
        callback: callback
      }
    )
  }

  return this
}

/**
 * unsubscribe - unsubscribe from topic(s)
 *
 * @param {String, Array} topic - topics to unsubscribe from
 * @param {Object} [opts] - optional subscription options, includes:
 *    {Object} properties - properties of unsubscribe packet
 * @param {Function} [callback] - callback fired on unsuback
 * @returns {MqttClient} this - for chaining
 * @api public
 * @example client.unsubscribe('topic');
 * @example client.unsubscribe('topic', console.log);
 */
MqttClient.prototype.unsubscribe = function () {
  const that = this
  const args = new Array(arguments.length)
  for (let i = 0; i < arguments.length; i++) {
    args[i] = arguments[i]
  }
  let topic = args.shift()
  let callback = args.pop() || nop
  let opts = args.pop()
  if (typeof topic === 'string') {
    topic = [topic]
  }

  if (typeof callback !== 'function') {
    opts = callback
    callback = nop
  }

  const invalidTopic = validations.validateTopics(topic)
  if (invalidTopic !== null) {
    setImmediate(callback, new Error('Invalid topic ' + invalidTopic))
    return this
  }

  if (that._checkDisconnecting(callback)) {
    return this
  }

  const unsubscribeProc = function () {
    const messageId = that._nextId()
    if (messageId === null) {
      debug('No messageId left')
      return false
    }
    const packet = {
      cmd: 'unsubscribe',
      qos: 1,
      messageId: messageId
    }

    if (typeof topic === 'string') {
      packet.unsubscriptions = [topic]
    } else if (Array.isArray(topic)) {
      packet.unsubscriptions = topic
    }

    if (that.options.resubscribe) {
      packet.unsubscriptions.forEach(function (topic) {
        delete that._resubscribeTopics[topic]
      })
    }

    if (typeof opts === 'object' && opts.properties) {
      packet.properties = opts.properties
    }

    that.outgoing[packet.messageId] = {
      volatile: true,
      cb: callback
    }

    debug('unsubscribe: call _sendPacket')
    that._sendPacket(packet)

    return true
  }

  if (this._storeProcessing || this._storeProcessingQueue.length > 0 || !unsubscribeProc()) {
    this._storeProcessingQueue.push(
      {
        invoke: unsubscribeProc,
        callback: callback
      }
    )
  }

  return this
}

/**
 * end - close connection
 *
 * @returns {MqttClient} this - for chaining
 * @param {Boolean} force - do not wait for all in-flight messages to be acked
 * @param {Object} opts - added to the disconnect packet
 * @param {Function} cb - called when the client has been closed
 *
 * @api public
 */
MqttClient.prototype.end = function (force, opts, cb) {
  const that = this

  debug('end :: (%s)', this.options.clientId)

  if (force == null || typeof force !== 'boolean') {
    cb = opts || nop
    opts = force
    force = false
    if (typeof opts !== 'object') {
      cb = opts
      opts = null
      if (typeof cb !== 'function') {
        cb = nop
      }
    }
  }

  if (typeof opts !== 'object') {
    cb = opts
    opts = null
  }

  debug('end :: cb? %s', !!cb)
  cb = cb || nop

  function closeStores () {
    debug('end :: closeStores: closing incoming and outgoing stores')
    that.disconnected = true
    that.incomingStore.close(function (e1) {
      that.outgoingStore.close(function (e2) {
        debug('end :: closeStores: emitting end')
        that.emit('end')
        if (cb) {
          const err = e1 || e2
          debug('end :: closeStores: invoking callback with args')
          cb(err)
        }
      })
    })
    if (that._deferredReconnect) {
      that._deferredReconnect()
    }
  }

  function finish () {
    // defer closesStores of an I/O cycle,
    // just to make sure things are
    // ok for websockets
    debug('end :: (%s) :: finish :: calling _cleanUp with force %s', that.options.clientId, force)
    that._cleanUp(force, () => {
      debug('end :: finish :: calling process.nextTick on closeStores')
      // const boundProcess = nextTick.bind(null, closeStores)
      nextTick(closeStores.bind(that))
    }, opts)
  }

  if (this.disconnecting) {
    cb()
    return this
  }

  this._clearReconnect()

  this.disconnecting = true

  if (!force && Object.keys(this.outgoing).length > 0) {
    // wait 10ms, just to be sure we received all of it
    debug('end :: (%s) :: calling finish in 10ms once outgoing is empty', that.options.clientId)
    this.once('outgoingEmpty', setTimeout.bind(null, finish, 10))
  } else {
    debug('end :: (%s) :: immediately calling finish', that.options.clientId)
    finish()
  }

  return this
}

/**
 * removeOutgoingMessage - remove a message in outgoing store
 * the outgoing callback will be called withe Error('Message removed') if the message is removed
 *
 * @param {Number} messageId - messageId to remove message
 * @returns {MqttClient} this - for chaining
 * @api public
 *
 * @example client.removeOutgoingMessage(client.getLastAllocated());
 */
MqttClient.prototype.removeOutgoingMessage = function (messageId) {
  const cb = this.outgoing[messageId] ? this.outgoing[messageId].cb : null
  delete this.outgoing[messageId]
  this.outgoingStore.del({ messageId: messageId }, function () {
    cb(new Error('Message removed'))
  })
  return this
}

/**
 * reconnect - connect again using the same options as connect()
 *
 * @param {Object} [opts] - optional reconnect options, includes:
 *    {Store} incomingStore - a store for the incoming packets
 *    {Store} outgoingStore - a store for the outgoing packets
 *    if opts is not given, current stores are used
 * @returns {MqttClient} this - for chaining
 *
 * @api public
 */
MqttClient.prototype.reconnect = function (opts) {
  debug('client reconnect')
  const that = this
  const f = function () {
    if (opts) {
      that.options.incomingStore = opts.incomingStore
      that.options.outgoingStore = opts.outgoingStore
    } else {
      that.options.incomingStore = null
      that.options.outgoingStore = null
    }
    that.incomingStore = that.options.incomingStore || new Store()
    that.outgoingStore = that.options.outgoingStore || new Store()
    that.disconnecting = false
    that.disconnected = false
    that._deferredReconnect = null
    that._reconnect()
  }

  if (this.disconnecting && !this.disconnected) {
    this._deferredReconnect = f
  } else {
    f()
  }
  return this
}

/**
 * _reconnect - implement reconnection
 * @api privateish
 */
MqttClient.prototype._reconnect = function () {
  debug('_reconnect: emitting reconnect to client')
  this.emit('reconnect')
  if (this.connected) {
    this.end(() => { this._setupStream() })
    debug('client already connected. disconnecting first.')
  } else {
    debug('_reconnect: calling _setupStream')
    this._setupStream()
  }
}

/**
 * _setupReconnect - setup reconnect timer
 */
MqttClient.prototype._setupReconnect = function () {
  const that = this

  if (!that.disconnecting && !that.reconnectTimer && (that.options.reconnectPeriod > 0)) {
    if (!this.reconnecting) {
      debug('_setupReconnect :: emit `offline` state')
      this.emit('offline')
      debug('_setupReconnect :: set `reconnecting` to `true`')
      this.reconnecting = true
    }
    debug('_setupReconnect :: setting reconnectTimer for %d ms', that.options.reconnectPeriod)
    that.reconnectTimer = setInterval(function () {
      debug('reconnectTimer :: reconnect triggered!')
      that._reconnect()
    }, that.options.reconnectPeriod)
  } else {
    debug('_setupReconnect :: doing nothing...')
  }
}

/**
 * _clearReconnect - clear the reconnect timer
 */
MqttClient.prototype._clearReconnect = function () {
  debug('_clearReconnect : clearing reconnect timer')
  if (this.reconnectTimer) {
    clearInterval(this.reconnectTimer)
    this.reconnectTimer = null
  }
}

/**
 * _cleanUp - clean up on connection end
 * @api private
 */
MqttClient.prototype._cleanUp = function (forced, done) {
  const opts = arguments[2]
  if (done) {
    debug('_cleanUp :: done callback provided for on stream close')
    this.stream.on('close', done)
  }

  debug('_cleanUp :: forced? %s', forced)
  if (forced) {
    if ((this.options.reconnectPeriod === 0) && this.options.clean) {
      flush(this.outgoing)
    }
    debug('_cleanUp :: (%s) :: destroying stream', this.options.clientId)
    this.stream.destroy()
  } else {
    const packet = xtend({ cmd: 'disconnect' }, opts)
    debug('_cleanUp :: (%s) :: call _sendPacket with disconnect packet', this.options.clientId)
    this._sendPacket(
      packet,
      setImmediate.bind(
        null,
        this.stream.end.bind(this.stream)
      )
    )
  }

  if (!this.disconnecting) {
    debug('_cleanUp :: client not disconnecting. Clearing and resetting reconnect.')
    this._clearReconnect()
    this._setupReconnect()
  }

  if (this.pingTimer !== null) {
    debug('_cleanUp :: clearing pingTimer')
    this.pingTimer.clear()
    this.pingTimer = null
  }

  if (done && !this.connected) {
    debug('_cleanUp :: (%s) :: removing stream `done` callback `close` listener', this.options.clientId)
    this.stream.removeListener('close', done)
    done()
  }
}

/**
 * _sendPacket - send or queue a packet
 * @param {Object} packet - packet options
 * @param {Function} cb - callback when the packet is sent
 * @param {Function} cbStorePut - called when message is put into outgoingStore
 * @api private
 */
MqttClient.prototype._sendPacket = function (packet, cb, cbStorePut) {
  debug('_sendPacket :: (%s) ::  start', this.options.clientId)
  cbStorePut = cbStorePut || nop
  cb = cb || nop

  const err = applyTopicAlias(this, packet)
  if (err) {
    cb(err)
    return
  }

  if (!this.connected) {
    // allow auth packets to be sent while authenticating with the broker (mqtt5 enhanced auth)
    if (packet.cmd === 'auth') {
      this._shiftPingInterval()
      sendPacket(this, packet, cb)
      return
    }

    debug('_sendPacket :: client not connected. Storing packet offline.')
    this._storePacket(packet, cb, cbStorePut)
    return
  }

  // When sending a packet, reschedule the ping timer
  this._shiftPingInterval()

  switch (packet.cmd) {
    case 'publish':
      break
    case 'pubrel':
      storeAndSend(this, packet, cb, cbStorePut)
      return
    default:
      sendPacket(this, packet, cb)
      return
  }

  switch (packet.qos) {
    case 2:
    case 1:
      storeAndSend(this, packet, cb, cbStorePut)
      break
    /**
     * no need of case here since it will be caught by default
     * and jshint comply that before default it must be a break
     * anyway it will result in -1 evaluation
     */
    case 0:
      /* falls through */
    default:
      sendPacket(this, packet, cb)
      break
  }
  debug('_sendPacket :: (%s) ::  end', this.options.clientId)
}

/**
 * _storePacket - queue a packet
 * @param {Object} packet - packet options
 * @param {Function} cb - callback when the packet is sent
 * @param {Function} cbStorePut - called when message is put into outgoingStore
 * @api private
 */
MqttClient.prototype._storePacket = function (packet, cb, cbStorePut) {
  debug('_storePacket :: packet: %o', packet)
  debug('_storePacket :: cb? %s', !!cb)
  cbStorePut = cbStorePut || nop

  let storePacket = packet
  if (storePacket.cmd === 'publish') {
    // The original packet is for sending.
    // The cloned storePacket is for storing to resend on reconnect.
    // Topic Alias must not be used after disconnected.
    storePacket = clone(packet)
    const err = removeTopicAliasAndRecoverTopicName(this, storePacket)
    if (err) {
      return cb && cb(err)
    }
  }
  // check that the packet is not a qos of 0, or that the command is not a publish
  if (((storePacket.qos || 0) === 0 && this.queueQoSZero) || storePacket.cmd !== 'publish') {
    this.queue.push({ packet: storePacket, cb: cb })
  } else if (storePacket.qos > 0) {
    cb = this.outgoing[storePacket.messageId] ? this.outgoing[storePacket.messageId].cb : null
    this.outgoingStore.put(storePacket, function (err) {
      if (err) {
        return cb && cb(err)
      }
      cbStorePut()
    })
  } else if (cb) {
    cb(new Error('No connection to broker'))
  }
}

/**
 * _setupPingTimer - setup the ping timer
 *
 * @api private
 */
MqttClient.prototype._setupPingTimer = function () {
  debug('_setupPingTimer :: keepalive %d (seconds)', this.options.keepalive)
  const that = this

  if (!this.pingTimer && this.options.keepalive) {
    this.pingResp = true
    this.pingTimer = reInterval(function () {
      that._checkPing()
    }, this.options.keepalive * 1000)
  }
}

/**
 * _shiftPingInterval - reschedule the ping interval
 *
 * @api private
 */
MqttClient.prototype._shiftPingInterval = function () {
  if (this.pingTimer && this.options.keepalive && this.options.reschedulePings) {
    this.pingTimer.reschedule(this.options.keepalive * 1000)
  }
}
/**
 * _checkPing - check if a pingresp has come back, and ping the server again
 *
 * @api private
 */
MqttClient.prototype._checkPing = function () {
  debug('_checkPing :: checking ping...')
  if (this.pingResp) {
    debug('_checkPing :: ping response received. Clearing flag and sending `pingreq`')
    this.pingResp = false
    this._sendPacket({ cmd: 'pingreq' })
  } else {
    // do a forced cleanup since socket will be in bad shape
    debug('_checkPing :: calling _cleanUp with force true')
    this._cleanUp(true)
  }
}

/**
 * _handlePingresp - handle a pingresp
 *
 * @api private
 */
MqttClient.prototype._handlePingresp = function () {
  this.pingResp = true
}

/**
 * _handleConnack
 *
 * @param {Object} packet
 * @api private
 */
MqttClient.prototype._handleConnack = function (packet) {
  debug('_handleConnack')
  const options = this.options
  const version = options.protocolVersion
  const rc = version === 5 ? packet.reasonCode : packet.returnCode

  clearTimeout(this.connackTimer)
  delete this.topicAliasSend

  if (packet.properties) {
    if (packet.properties.topicAliasMaximum) {
      if (packet.properties.topicAliasMaximum > 0xffff) {
        this.emit('error', new Error('topicAliasMaximum from broker is out of range'))
        return
      }
      if (packet.properties.topicAliasMaximum > 0) {
        this.topicAliasSend = new TopicAliasSend(packet.properties.topicAliasMaximum)
      }
    }
    if (packet.properties.serverKeepAlive && options.keepalive) {
      options.keepalive = packet.properties.serverKeepAlive
      this._shiftPingInterval()
    }
    if (packet.properties.maximumPacketSize) {
      if (!options.properties) { options.properties = {} }
      options.properties.maximumPacketSize = packet.properties.maximumPacketSize
    }
  }

  if (rc === 0) {
    this.reconnecting = false
    this._onConnect(packet)
  } else if (rc > 0) {
    const err = new Error('Connection refused: ' + errors[rc])
    err.code = rc
    this.emit('error', err)
  }
}

MqttClient.prototype._handleAuth = function (packet) {
  const options = this.options
  const version = options.protocolVersion
  const rc = version === 5 ? packet.reasonCode : packet.returnCode

  if (version !== 5) {
    const err = new Error('Protocol error: Auth packets are only supported in MQTT 5. Your version:' + version)
    err.code = rc
    this.emit('error', err)
    return
  }

  const that = this
  this.handleAuth(packet, function (err, packet) {
    if (err) {
      that.emit('error', err)
      return
    }

    if (rc === 24) {
      that.reconnecting = false
      that._sendPacket(packet)
    } else {
      const error = new Error('Connection refused: ' + errors[rc])
      err.code = rc
      that.emit('error', error)
    }
  })
}

/**
 * @param packet the packet received by the broker
 * @return the auth packet to be returned to the broker
 * @api public
 */
MqttClient.prototype.handleAuth = function (packet, callback) {
  callback()
}

/**
 * _handlePublish
 *
 * @param {Object} packet
 * @api private
 */
/*
those late 2 case should be rewrite to comply with coding style:

case 1:
case 0:
  // do not wait sending a puback
  // no callback passed
  if (1 === qos) {
    this._sendPacket({
      cmd: 'puback',
      messageId: messageId
    });
  }
  // emit the message event for both qos 1 and 0
  this.emit('message', topic, message, packet);
  this.handleMessage(packet, done);
  break;
default:
  // do nothing but every switch mus have a default
  // log or throw an error about unknown qos
  break;

for now i just suppressed the warnings
*/
MqttClient.prototype._handlePublish = function (packet, done) {
  debug('_handlePublish: packet %o', packet)
  done = typeof done !== 'undefined' ? done : nop
  let topic = packet.topic.toString()
  const message = packet.payload
  const qos = packet.qos
  const messageId = packet.messageId
  const that = this
  const options = this.options
  const validReasonCodes = [0, 16, 128, 131, 135, 144, 145, 151, 153]
  if (this.options.protocolVersion === 5) {
    let alias
    if (packet.properties) {
      alias = packet.properties.topicAlias
    }
    if (typeof alias !== 'undefined') {
      if (topic.length === 0) {
        if (alias > 0 && alias <= 0xffff) {
          const gotTopic = this.topicAliasRecv.getTopicByAlias(alias)
          if (gotTopic) {
            topic = gotTopic
            debug('_handlePublish :: topic complemented by alias. topic: %s - alias: %d', topic, alias)
          } else {
            debug('_handlePublish :: unregistered topic alias. alias: %d', alias)
            this.emit('error', new Error('Received unregistered Topic Alias'))
            return
          }
        } else {
          debug('_handlePublish :: topic alias out of range. alias: %d', alias)
          this.emit('error', new Error('Received Topic Alias is out of range'))
          return
        }
      } else {
        if (this.topicAliasRecv.put(topic, alias)) {
          debug('_handlePublish :: registered topic: %s - alias: %d', topic, alias)
        } else {
          debug('_handlePublish :: topic alias out of range. alias: %d', alias)
          this.emit('error', new Error('Received Topic Alias is out of range'))
          return
        }
      }
    }
  }
  debug('_handlePublish: qos %d', qos)
  switch (qos) {
    case 2: {
      options.customHandleAcks(topic, message, packet, function (error, code) {
        if (!(error instanceof Error)) {
          code = error
          error = null
        }
        if (error) { return that.emit('error', error) }
        if (validReasonCodes.indexOf(code) === -1) { return that.emit('error', new Error('Wrong reason code for pubrec')) }
        if (code) {
          that._sendPacket({ cmd: 'pubrec', messageId: messageId, reasonCode: code }, done)
        } else {
          that.incomingStore.put(packet, function () {
            that._sendPacket({ cmd: 'pubrec', messageId: messageId }, done)
          })
        }
      })
      break
    }
    case 1: {
      // emit the message event
      options.customHandleAcks(topic, message, packet, function (error, code) {
        if (!(error instanceof Error)) {
          code = error
          error = null
        }
        if (error) { return that.emit('error', error) }
        if (validReasonCodes.indexOf(code) === -1) { return that.emit('error', new Error('Wrong reason code for puback')) }
        if (!code) { that.emit('message', topic, message, packet) }
        that.handleMessage(packet, function (err) {
          if (err) {
            return done && done(err)
          }
          that._sendPacket({ cmd: 'puback', messageId: messageId, reasonCode: code }, done)
        })
      })
      break
    }
    case 0:
      // emit the message event
      this.emit('message', topic, message, packet)
      this.handleMessage(packet, done)
      break
    default:
      // do nothing
      debug('_handlePublish: unknown QoS. Doing nothing.')
      // log or throw an error about unknown qos
      break
  }
}

/**
 * Handle messages with backpressure support, one at a time.
 * Override at will.
 *
 * @param Packet packet the packet
 * @param Function callback call when finished
 * @api public
 */
MqttClient.prototype.handleMessage = function (packet, callback) {
  callback()
}

/**
 * _handleAck
 *
 * @param {Object} packet
 * @api private
 */

MqttClient.prototype._handleAck = function (packet) {
  /* eslint no-fallthrough: "off" */
  const messageId = packet.messageId
  const type = packet.cmd
  let response = null
  const cb = this.outgoing[messageId] ? this.outgoing[messageId].cb : null
  const that = this
  let err

  // Checking `!cb` happens to work, but it's not technically "correct".
  //
  // Why? This code assumes that "no callback" is the same as that "we're not
  // waiting for responses" (puback, pubrec, pubcomp, suback, or unsuback).
  //
  // It would be better to check `if (!this.outgoing[messageId])` here, but
  // there's no reason to change it and risk (another) regression.
  //
  // The only reason this code works is becaues code in MqttClient.publish,
  // MqttClinet.subscribe, and MqttClient.unsubscribe ensures that we will
  // have a callback even if the user doesn't pass one in.)
  if (!cb) {
    debug('_handleAck :: Server sent an ack in error. Ignoring.')
    // Server sent an ack in error, ignore it.
    return
  }

  // Process
  debug('_handleAck :: packet type', type)
  switch (type) {
    case 'pubcomp':
      // same thing as puback for QoS 2
    case 'puback': {
      const pubackRC = packet.reasonCode
      // Callback - we're done
      if (pubackRC && pubackRC > 0 && pubackRC !== 16) {
        err = new Error('Publish error: ' + errors[pubackRC])
        err.code = pubackRC
        cb(err, packet)
      }
      delete this.outgoing[messageId]
      this.outgoingStore.del(packet, cb)
      this.messageIdProvider.deallocate(messageId)
      this._invokeStoreProcessingQueue()
      break
    }
    case 'pubrec': {
      response = {
        cmd: 'pubrel',
        qos: 2,
        messageId: messageId
      }
      const pubrecRC = packet.reasonCode

      if (pubrecRC && pubrecRC > 0 && pubrecRC !== 16) {
        err = new Error('Publish error: ' + errors[pubrecRC])
        err.code = pubrecRC
        cb(err, packet)
      } else {
        this._sendPacket(response)
      }
      break
    }
    case 'suback': {
      delete this.outgoing[messageId]
      this.messageIdProvider.deallocate(messageId)
      for (let grantedI = 0; grantedI < packet.granted.length; grantedI++) {
        if ((packet.granted[grantedI] & 0x80) !== 0) {
          // suback with Failure status
          const topics = this.messageIdToTopic[messageId]
          if (topics) {
            topics.forEach(function (topic) {
              delete that._resubscribeTopics[topic]
            })
          }
        }
      }
      this._invokeStoreProcessingQueue()
      cb(null, packet)
      break
    }
    case 'unsuback': {
      delete this.outgoing[messageId]
      this.messageIdProvider.deallocate(messageId)
      this._invokeStoreProcessingQueue()
      cb(null)
      break
    }
    default:
      that.emit('error', new Error('unrecognized packet type'))
  }

  if (this.disconnecting &&
      Object.keys(this.outgoing).length === 0) {
    this.emit('outgoingEmpty')
  }
}

/**
 * _handlePubrel
 *
 * @param {Object} packet
 * @api private
 */
MqttClient.prototype._handlePubrel = function (packet, callback) {
  debug('handling pubrel packet')
  callback = typeof callback !== 'undefined' ? callback : nop
  const messageId = packet.messageId
  const that = this

  const comp = { cmd: 'pubcomp', messageId: messageId }

  that.incomingStore.get(packet, function (err, pub) {
    if (!err) {
      that.emit('message', pub.topic, pub.payload, pub)
      that.handleMessage(pub, function (err) {
        if (err) {
          return callback(err)
        }
        that.incomingStore.del(pub, nop)
        that._sendPacket(comp, callback)
      })
    } else {
      that._sendPacket(comp, callback)
    }
  })
}

/**
 * _handleDisconnect
 *
 * @param {Object} packet
 * @api private
 */
MqttClient.prototype._handleDisconnect = function (packet) {
  this.emit('disconnect', packet)
}

/**
 * _nextId
 * @return unsigned int
 */
MqttClient.prototype._nextId = function () {
  return this.messageIdProvider.allocate()
}

/**
 * getLastMessageId
 * @return unsigned int
 */
MqttClient.prototype.getLastMessageId = function () {
  return this.messageIdProvider.getLastAllocated()
}

/**
 * _resubscribe
 * @api private
 */
MqttClient.prototype._resubscribe = function () {
  debug('_resubscribe')
  const _resubscribeTopicsKeys = Object.keys(this._resubscribeTopics)
  if (!this._firstConnection &&
      (this.options.clean || (this.options.protocolVersion === 5 && !this.connackPacket.sessionPresent)) &&
      _resubscribeTopicsKeys.length > 0) {
    if (this.options.resubscribe) {
      if (this.options.protocolVersion === 5) {
        debug('_resubscribe: protocolVersion 5')
        for (let topicI = 0; topicI < _resubscribeTopicsKeys.length; topicI++) {
          const resubscribeTopic = {}
          resubscribeTopic[_resubscribeTopicsKeys[topicI]] = this._resubscribeTopics[_resubscribeTopicsKeys[topicI]]
          resubscribeTopic.resubscribe = true
          this.subscribe(resubscribeTopic, { properties: resubscribeTopic[_resubscribeTopicsKeys[topicI]].properties })
        }
      } else {
        this._resubscribeTopics.resubscribe = true
        this.subscribe(this._resubscribeTopics)
      }
    } else {
      this._resubscribeTopics = {}
    }
  }

  this._firstConnection = false
}

/**
 * _onConnect
 *
 * @api private
 */
MqttClient.prototype._onConnect = function (packet) {
  if (this.disconnected) {
    this.emit('connect', packet)
    return
  }

  const that = this

  this.connackPacket = packet
  this.messageIdProvider.clear()
  this._setupPingTimer()

  this.connected = true

  function startStreamProcess () {
    let outStore = that.outgoingStore.createStream()

    function clearStoreProcessing () {
      that._storeProcessing = false
      that._packetIdsDuringStoreProcessing = {}
    }

    that.once('close', remove)
    outStore.on('error', function (err) {
      clearStoreProcessing()
      that._flushStoreProcessingQueue()
      that.removeListener('close', remove)
      that.emit('error', err)
    })

    function remove () {
      outStore.destroy()
      outStore = null
      that._flushStoreProcessingQueue()
      clearStoreProcessing()
    }

    function storeDeliver () {
      // edge case, we wrapped this twice
      if (!outStore) {
        return
      }
      that._storeProcessing = true

      const packet = outStore.read(1)

      let cb

      if (!packet) {
        // read when data is available in the future
        outStore.once('readable', storeDeliver)
        return
      }

      // Skip already processed store packets
      if (that._packetIdsDuringStoreProcessing[packet.messageId]) {
        storeDeliver()
        return
      }

      // Avoid unnecessary stream read operations when disconnected
      if (!that.disconnecting && !that.reconnectTimer) {
        cb = that.outgoing[packet.messageId] ? that.outgoing[packet.messageId].cb : null
        that.outgoing[packet.messageId] = {
          volatile: false,
          cb: function (err, status) {
            // Ensure that the original callback passed in to publish gets invoked
            if (cb) {
              cb(err, status)
            }

            storeDeliver()
          }
        }
        that._packetIdsDuringStoreProcessing[packet.messageId] = true
        if (that.messageIdProvider.register(packet.messageId)) {
          that._sendPacket(packet)
        } else {
          debug('messageId: %d has already used.', packet.messageId)
        }
      } else if (outStore.destroy) {
        outStore.destroy()
      }
    }

    outStore.on('end', function () {
      let allProcessed = true
      for (const id in that._packetIdsDuringStoreProcessing) {
        if (!that._packetIdsDuringStoreProcessing[id]) {
          allProcessed = false
          break
        }
      }
      if (allProcessed) {
        clearStoreProcessing()
        that.removeListener('close', remove)
        that._invokeAllStoreProcessingQueue()
        that.emit('connect', packet)
      } else {
        startStreamProcess()
      }
    })
    storeDeliver()
  }
  // start flowing
  startStreamProcess()
}

MqttClient.prototype._invokeStoreProcessingQueue = function () {
  if (this._storeProcessingQueue.length > 0) {
    const f = this._storeProcessingQueue[0]
    if (f && f.invoke()) {
      this._storeProcessingQueue.shift()
      return true
    }
  }
  return false
}

MqttClient.prototype._invokeAllStoreProcessingQueue = function () {
  while (this._invokeStoreProcessingQueue()) { /* empty */ }
}

MqttClient.prototype._flushStoreProcessingQueue = function () {
  for (const f of this._storeProcessingQueue) {
    if (f.cbStorePut) f.cbStorePut(new Error('Connection closed'))
    if (f.callback) f.callback(new Error('Connection closed'))
  }
  this._storeProcessingQueue.splice(0)
}

module.exports = MqttClient


/***/ }),

/***/ 8806:
/***/ ((module, __unused_webpack_exports, __nccwpck_require__) => {

"use strict";


const { Buffer } = __nccwpck_require__(4300)
const Transform = (__nccwpck_require__(1642).Transform)
const duplexify = __nccwpck_require__(6599)

/* global FileReader */
let my
let proxy
let stream
let isInitialized = false

function buildProxy () {
  const proxy = new Transform()
  proxy._write = function (chunk, encoding, next) {
    my.sendSocketMessage({
      data: chunk.buffer,
      success: function () {
        next()
      },
      fail: function () {
        next(new Error())
      }
    })
  }
  proxy._flush = function socketEnd (done) {
    my.closeSocket({
      success: function () {
        done()
      }
    })
  }

  return proxy
}

function setDefaultOpts (opts) {
  if (!opts.hostname) {
    opts.hostname = 'localhost'
  }
  if (!opts.path) {
    opts.path = '/'
  }

  if (!opts.wsOptions) {
    opts.wsOptions = {}
  }
}

function buildUrl (opts, client) {
  const protocol = opts.protocol === 'alis' ? 'wss' : 'ws'
  let url = protocol + '://' + opts.hostname + opts.path
  if (opts.port && opts.port !== 80 && opts.port !== 443) {
    url = protocol + '://' + opts.hostname + ':' + opts.port + opts.path
  }
  if (typeof (opts.transformWsUrl) === 'function') {
    url = opts.transformWsUrl(url, opts, client)
  }
  return url
}

function bindEventHandler () {
  if (isInitialized) return

  isInitialized = true

  my.onSocketOpen(function () {
    stream.setReadable(proxy)
    stream.setWritable(proxy)
    stream.emit('connect')
  })

  my.onSocketMessage(function (res) {
    if (typeof res.data === 'string') {
      const buffer = Buffer.from(res.data, 'base64')
      proxy.push(buffer)
    } else {
      const reader = new FileReader()
      reader.addEventListener('load', function () {
        let data = reader.result

        if (data instanceof ArrayBuffer) data = Buffer.from(data)
        else data = Buffer.from(data, 'utf8')
        proxy.push(data)
      })
      reader.readAsArrayBuffer(res.data)
    }
  })

  my.onSocketClose(function () {
    stream.end()
    stream.destroy()
  })

  my.onSocketError(function (res) {
    stream.destroy(res)
  })
}

function buildStream (client, opts) {
  opts.hostname = opts.hostname || opts.host

  if (!opts.hostname) {
    throw new Error('Could not determine host. Specify host manually.')
  }

  const websocketSubProtocol =
    (opts.protocolId === 'MQIsdp') && (opts.protocolVersion === 3)
      ? 'mqttv3.1'
      : 'mqtt'

  setDefaultOpts(opts)

  const url = buildUrl(opts, client)
  my = opts.my
  my.connectSocket({
    url: url,
    protocols: websocketSubProtocol
  })

  proxy = buildProxy()
  stream = duplexify.obj()

  bindEventHandler()

  return stream
}

module.exports = buildStream


/***/ }),

/***/ 9675:
/***/ ((module, __unused_webpack_exports, __nccwpck_require__) => {

"use strict";


const MqttClient = __nccwpck_require__(5823)
const Store = __nccwpck_require__(5498)
const url = __nccwpck_require__(7310)
const xtend = __nccwpck_require__(1208)
const debug = __nccwpck_require__(8237)('mqttjs')

const protocols = {}

// eslint-disable-next-line camelcase
if ((typeof process !== 'undefined' && process.title !== 'browser') || typeof __nccwpck_require__ !== 'function') {
  protocols.mqtt = __nccwpck_require__(116)
  protocols.tcp = __nccwpck_require__(116)
  protocols.ssl = __nccwpck_require__(6998)
  protocols.tls = __nccwpck_require__(6998)
  protocols.mqtts = __nccwpck_require__(6998)
} else {
  protocols.wx = __nccwpck_require__(5525)
  protocols.wxs = __nccwpck_require__(5525)

  protocols.ali = __nccwpck_require__(8806)
  protocols.alis = __nccwpck_require__(8806)
}

protocols.ws = __nccwpck_require__(3985)
protocols.wss = __nccwpck_require__(3985)

/**
 * Parse the auth attribute and merge username and password in the options object.
 *
 * @param {Object} [opts] option object
 */
function parseAuthOptions (opts) {
  let matches
  if (opts.auth) {
    matches = opts.auth.match(/^(.+):(.+)$/)
    if (matches) {
      opts.username = matches[1]
      opts.password = matches[2]
    } else {
      opts.username = opts.auth
    }
  }
}

/**
 * connect - connect to an MQTT broker.
 *
 * @param {String} [brokerUrl] - url of the broker, optional
 * @param {Object} opts - see MqttClient#constructor
 */
function connect (brokerUrl, opts) {
  debug('connecting to an MQTT broker...')
  if ((typeof brokerUrl === 'object') && !opts) {
    opts = brokerUrl
    brokerUrl = null
  }

  opts = opts || {}

  if (brokerUrl) {
    // eslint-disable-next-line
    const parsed = url.parse(brokerUrl, true)
    if (parsed.port != null) {
      parsed.port = Number(parsed.port)
    }

    opts = xtend(parsed, opts)

    if (opts.protocol === null) {
      throw new Error('Missing protocol')
    }

    opts.protocol = opts.protocol.replace(/:$/, '')
  }

  // merge in the auth options if supplied
  parseAuthOptions(opts)

  // support clientId passed in the query string of the url
  if (opts.query && typeof opts.query.clientId === 'string') {
    opts.clientId = opts.query.clientId
  }

  if (opts.cert && opts.key) {
    if (opts.protocol) {
      if (['mqtts', 'wss', 'wxs', 'alis'].indexOf(opts.protocol) === -1) {
        switch (opts.protocol) {
          case 'mqtt':
            opts.protocol = 'mqtts'
            break
          case 'ws':
            opts.protocol = 'wss'
            break
          case 'wx':
            opts.protocol = 'wxs'
            break
          case 'ali':
            opts.protocol = 'alis'
            break
          default:
            throw new Error('Unknown protocol for secure connection: "' + opts.protocol + '"!')
        }
      }
    } else {
      // A cert and key was provided, however no protocol was specified, so we will throw an error.
      throw new Error('Missing secure protocol key')
    }
  }

  if (!protocols[opts.protocol]) {
    const isSecure = ['mqtts', 'wss'].indexOf(opts.protocol) !== -1
    opts.protocol = [
      'mqtt',
      'mqtts',
      'ws',
      'wss',
      'wx',
      'wxs',
      'ali',
      'alis'
    ].filter(function (key, index) {
      if (isSecure && index % 2 === 0) {
        // Skip insecure protocols when requesting a secure one.
        return false
      }
      return (typeof protocols[key] === 'function')
    })[0]
  }

  if (opts.clean === false && !opts.clientId) {
    throw new Error('Missing clientId for unclean clients')
  }

  if (opts.protocol) {
    opts.defaultProtocol = opts.protocol
  }

  function wrapper (client) {
    if (opts.servers) {
      if (!client._reconnectCount || client._reconnectCount === opts.servers.length) {
        client._reconnectCount = 0
      }

      opts.host = opts.servers[client._reconnectCount].host
      opts.port = opts.servers[client._reconnectCount].port
      opts.protocol = (!opts.servers[client._reconnectCount].protocol ? opts.defaultProtocol : opts.servers[client._reconnectCount].protocol)
      opts.hostname = opts.host

      client._reconnectCount++
    }

    debug('calling streambuilder for', opts.protocol)
    return protocols[opts.protocol](client, opts)
  }
  const client = new MqttClient(wrapper, opts)
  client.on('error', function () { /* Automatically set up client error handling */ })
  return client
}

module.exports = connect
module.exports.connect = connect
module.exports.MqttClient = MqttClient
module.exports.Store = Store


/***/ }),

/***/ 116:
/***/ ((module, __unused_webpack_exports, __nccwpck_require__) => {

"use strict";

const net = __nccwpck_require__(1808)
const debug = __nccwpck_require__(8237)('mqttjs:tcp')

/*
  variables port and host can be removed since
  you have all required information in opts object
*/
function streamBuilder (client, opts) {
  opts.port = opts.port || 1883
  opts.hostname = opts.hostname || opts.host || 'localhost'

  const port = opts.port
  const host = opts.hostname

  debug('port %d and host %s', port, host)
  return net.createConnection(port, host)
}

module.exports = streamBuilder


/***/ }),

/***/ 6998:
/***/ ((module, __unused_webpack_exports, __nccwpck_require__) => {

"use strict";

const tls = __nccwpck_require__(4404)
const net = __nccwpck_require__(1808)
const debug = __nccwpck_require__(8237)('mqttjs:tls')

function buildBuilder (mqttClient, opts) {
  opts.port = opts.port || 8883
  opts.host = opts.hostname || opts.host || 'localhost'

  if (net.isIP(opts.host) === 0) {
    opts.servername = opts.host
  }

  opts.rejectUnauthorized = opts.rejectUnauthorized !== false

  delete opts.path

  debug('port %d host %s rejectUnauthorized %b', opts.port, opts.host, opts.rejectUnauthorized)

  const connection = tls.connect(opts)
  /* eslint no-use-before-define: [2, "nofunc"] */
  connection.on('secureConnect', function () {
    if (opts.rejectUnauthorized && !connection.authorized) {
      connection.emit('error', new Error('TLS not authorized'))
    } else {
      connection.removeListener('error', handleTLSerrors)
    }
  })

  function handleTLSerrors (err) {
    // How can I get verify this error is a tls error?
    if (opts.rejectUnauthorized) {
      mqttClient.emit('error', err)
    }

    // close this connection to match the behaviour of net
    // otherwise all we get is an error from the connection
    // and close event doesn't fire. This is a work around
    // to enable the reconnect code to work the same as with
    // net.createConnection
    connection.end()
  }

  connection.on('error', handleTLSerrors)
  return connection
}

module.exports = buildBuilder


/***/ }),

/***/ 3985:
/***/ ((module, __unused_webpack_exports, __nccwpck_require__) => {

"use strict";


const { Buffer } = __nccwpck_require__(4300)
const WS = __nccwpck_require__(8867)
const debug = __nccwpck_require__(8237)('mqttjs:ws')
const duplexify = __nccwpck_require__(6599)
const Transform = (__nccwpck_require__(1642).Transform)

const WSS_OPTIONS = [
  'rejectUnauthorized',
  'ca',
  'cert',
  'key',
  'pfx',
  'passphrase'
]
// eslint-disable-next-line camelcase
const IS_BROWSER = (typeof process !== 'undefined' && process.title === 'browser') || typeof __nccwpck_require__ === 'function'
function buildUrl (opts, client) {
  let url = opts.protocol + '://' + opts.hostname + ':' + opts.port + opts.path
  if (typeof (opts.transformWsUrl) === 'function') {
    url = opts.transformWsUrl(url, opts, client)
  }
  return url
}

function setDefaultOpts (opts) {
  const options = opts
  if (!opts.hostname) {
    options.hostname = 'localhost'
  }
  if (!opts.port) {
    if (opts.protocol === 'wss') {
      options.port = 443
    } else {
      options.port = 80
    }
  }
  if (!opts.path) {
    options.path = '/'
  }

  if (!opts.wsOptions) {
    options.wsOptions = {}
  }
  if (!IS_BROWSER && opts.protocol === 'wss') {
    // Add cert/key/ca etc options
    WSS_OPTIONS.forEach(function (prop) {
      if (Object.prototype.hasOwnProperty.call(opts, prop) && !Object.prototype.hasOwnProperty.call(opts.wsOptions, prop)) {
        options.wsOptions[prop] = opts[prop]
      }
    })
  }

  return options
}

function setDefaultBrowserOpts (opts) {
  const options = setDefaultOpts(opts)

  if (!options.hostname) {
    options.hostname = options.host
  }

  if (!options.hostname) {
    // Throwing an error in a Web Worker if no `hostname` is given, because we
    // can not determine the `hostname` automatically.  If connecting to
    // localhost, please supply the `hostname` as an argument.
    if (typeof (document) === 'undefined') {
      throw new Error('Could not determine host. Specify host manually.')
    }
    const parsed = new URL(document.URL)
    options.hostname = parsed.hostname

    if (!options.port) {
      options.port = parsed.port
    }
  }

  // objectMode should be defined for logic
  if (options.objectMode === undefined) {
    options.objectMode = !(options.binary === true || options.binary === undefined)
  }

  return options
}

function createWebSocket (client, url, opts) {
  debug('createWebSocket')
  debug('protocol: ' + opts.protocolId + ' ' + opts.protocolVersion)
  const websocketSubProtocol =
    (opts.protocolId === 'MQIsdp') && (opts.protocolVersion === 3)
      ? 'mqttv3.1'
      : 'mqtt'

  debug('creating new Websocket for url: ' + url + ' and protocol: ' + websocketSubProtocol)
  const socket = new WS(url, [websocketSubProtocol], opts.wsOptions)
  return socket
}

function createBrowserWebSocket (client, opts) {
  const websocketSubProtocol =
  (opts.protocolId === 'MQIsdp') && (opts.protocolVersion === 3)
    ? 'mqttv3.1'
    : 'mqtt'

  const url = buildUrl(opts, client)
  /* global WebSocket */
  const socket = new WebSocket(url, [websocketSubProtocol])
  socket.binaryType = 'arraybuffer'
  return socket
}

function streamBuilder (client, opts) {
  debug('streamBuilder')
  const options = setDefaultOpts(opts)
  const url = buildUrl(options, client)
  const socket = createWebSocket(client, url, options)
  const webSocketStream = WS.createWebSocketStream(socket, options.wsOptions)
  webSocketStream.url = url
  socket.on('close', () => { webSocketStream.destroy() })
  return webSocketStream
}

function browserStreamBuilder (client, opts) {
  debug('browserStreamBuilder')
  let stream
  const options = setDefaultBrowserOpts(opts)
  // sets the maximum socket buffer size before throttling
  const bufferSize = options.browserBufferSize || 1024 * 512

  const bufferTimeout = opts.browserBufferTimeout || 1000

  const coerceToBuffer = !opts.objectMode

  const socket = createBrowserWebSocket(client, opts)

  const proxy = buildProxy(opts, socketWriteBrowser, socketEndBrowser)

  if (!opts.objectMode) {
    proxy._writev = writev
  }
  proxy.on('close', () => { socket.close() })

  const eventListenerSupport = (typeof socket.addEventListener !== 'undefined')

  // was already open when passed in
  if (socket.readyState === socket.OPEN) {
    stream = proxy
  } else {
    stream = stream = duplexify(undefined, undefined, opts)
    if (!opts.objectMode) {
      stream._writev = writev
    }

    if (eventListenerSupport) {
      socket.addEventListener('open', onopen)
    } else {
      socket.onopen = onopen
    }
  }

  stream.socket = socket

  if (eventListenerSupport) {
    socket.addEventListener('close', onclose)
    socket.addEventListener('error', onerror)
    socket.addEventListener('message', onmessage)
  } else {
    socket.onclose = onclose
    socket.onerror = onerror
    socket.onmessage = onmessage
  }

  // methods for browserStreamBuilder

  function buildProxy (options, socketWrite, socketEnd) {
    const proxy = new Transform({
      objectModeMode: options.objectMode
    })

    proxy._write = socketWrite
    proxy._flush = socketEnd

    return proxy
  }

  function onopen () {
    stream.setReadable(proxy)
    stream.setWritable(proxy)
    stream.emit('connect')
  }

  function onclose () {
    stream.end()
    stream.destroy()
  }

  function onerror (err) {
    stream.destroy(err)
  }

  function onmessage (event) {
    let data = event.data
    if (data instanceof ArrayBuffer) data = Buffer.from(data)
    else data = Buffer.from(data, 'utf8')
    proxy.push(data)
  }

  // this is to be enabled only if objectMode is false
  function writev (chunks, cb) {
    const buffers = new Array(chunks.length)
    for (let i = 0; i < chunks.length; i++) {
      if (typeof chunks[i].chunk === 'string') {
        buffers[i] = Buffer.from(chunks[i], 'utf8')
      } else {
        buffers[i] = chunks[i].chunk
      }
    }

    this._write(Buffer.concat(buffers), 'binary', cb)
  }

  function socketWriteBrowser (chunk, enc, next) {
    if (socket.bufferedAmount > bufferSize) {
      // throttle data until buffered amount is reduced.
      setTimeout(socketWriteBrowser, bufferTimeout, chunk, enc, next)
    }

    if (coerceToBuffer && typeof chunk === 'string') {
      chunk = Buffer.from(chunk, 'utf8')
    }

    try {
      socket.send(chunk)
    } catch (err) {
      return next(err)
    }

    next()
  }

  function socketEndBrowser (done) {
    socket.close()
    done()
  }

  // end methods for browserStreamBuilder

  return stream
}

if (IS_BROWSER) {
  module.exports = browserStreamBuilder
} else {
  module.exports = streamBuilder
}


/***/ }),

/***/ 5525:
/***/ ((module, __unused_webpack_exports, __nccwpck_require__) => {

"use strict";


const { Buffer } = __nccwpck_require__(4300)
const Transform = (__nccwpck_require__(1642).Transform)
const duplexify = __nccwpck_require__(6599)

/* global wx */
let socketTask, proxy, stream

function buildProxy () {
  const proxy = new Transform()
  proxy._write = function (chunk, encoding, next) {
    socketTask.send({
      data: chunk.buffer,
      success: function () {
        next()
      },
      fail: function (errMsg) {
        next(new Error(errMsg))
      }
    })
  }
  proxy._flush = function socketEnd (done) {
    socketTask.close({
      success: function () {
        done()
      }
    })
  }

  return proxy
}

function setDefaultOpts (opts) {
  if (!opts.hostname) {
    opts.hostname = 'localhost'
  }
  if (!opts.path) {
    opts.path = '/'
  }

  if (!opts.wsOptions) {
    opts.wsOptions = {}
  }
}

function buildUrl (opts, client) {
  const protocol = opts.protocol === 'wxs' ? 'wss' : 'ws'
  let url = protocol + '://' + opts.hostname + opts.path
  if (opts.port && opts.port !== 80 && opts.port !== 443) {
    url = protocol + '://' + opts.hostname + ':' + opts.port + opts.path
  }
  if (typeof (opts.transformWsUrl) === 'function') {
    url = opts.transformWsUrl(url, opts, client)
  }
  return url
}

function bindEventHandler () {
  socketTask.onOpen(function () {
    stream.setReadable(proxy)
    stream.setWritable(proxy)
    stream.emit('connect')
  })

  socketTask.onMessage(function (res) {
    let data = res.data

    if (data instanceof ArrayBuffer) data = Buffer.from(data)
    else data = Buffer.from(data, 'utf8')
    proxy.push(data)
  })

  socketTask.onClose(function () {
    stream.end()
    stream.destroy()
  })

  socketTask.onError(function (res) {
    stream.destroy(new Error(res.errMsg))
  })
}

function buildStream (client, opts) {
  opts.hostname = opts.hostname || opts.host

  if (!opts.hostname) {
    throw new Error('Could not determine host. Specify host manually.')
  }

  const websocketSubProtocol =
    (opts.protocolId === 'MQIsdp') && (opts.protocolVersion === 3)
      ? 'mqttv3.1'
      : 'mqtt'

  setDefaultOpts(opts)

  const url = buildUrl(opts, client)
  socketTask = wx.connectSocket({
    url: url,
    protocols: [websocketSubProtocol]
  })

  proxy = buildProxy()
  stream = duplexify.obj()
  stream._destroy = function (err, cb) {
    socketTask.close({
      success: function () {
        cb && cb(err)
      }
    })
  }

  const destroyRef = stream.destroy
  stream.destroy = function () {
    stream.destroy = destroyRef

    const self = this
    setTimeout(function () {
      socketTask.close({
        fail: function () {
          self._destroy(new Error())
        }
      })
    }, 0)
  }.bind(stream)

  bindEventHandler()

  return stream
}

module.exports = buildStream


/***/ }),

/***/ 1966:
/***/ ((module) => {

"use strict";


/**
 * DefaultMessageAllocator constructor
 * @constructor
 */
function DefaultMessageIdProvider () {
  if (!(this instanceof DefaultMessageIdProvider)) {
    return new DefaultMessageIdProvider()
  }

  /**
   * MessageIDs starting with 1
   * ensure that nextId is min. 1, see https://github.com/mqttjs/MQTT.js/issues/810
   */
  this.nextId = Math.max(1, Math.floor(Math.random() * 65535))
}

/**
 * allocate
 *
 * Get the next messageId.
 * @return unsigned int
 */
DefaultMessageIdProvider.prototype.allocate = function () {
  // id becomes current state of this.nextId and increments afterwards
  const id = this.nextId++
  // Ensure 16 bit unsigned int (max 65535, nextId got one higher)
  if (this.nextId === 65536) {
    this.nextId = 1
  }
  return id
}

/**
 * getLastAllocated
 * Get the last allocated messageId.
 * @return unsigned int
 */
DefaultMessageIdProvider.prototype.getLastAllocated = function () {
  return (this.nextId === 1) ? 65535 : (this.nextId - 1)
}

/**
 * register
 * Register messageId. If success return true, otherwise return false.
 * @param { unsigned int } - messageId to register,
 * @return boolean
 */
DefaultMessageIdProvider.prototype.register = function (messageId) {
  return true
}

/**
 * deallocate
 * Deallocate messageId.
 * @param { unsigned int } - messageId to deallocate,
 */
DefaultMessageIdProvider.prototype.deallocate = function (messageId) {
}

/**
 * clear
 * Deallocate all messageIds.
 */
DefaultMessageIdProvider.prototype.clear = function () {
}

module.exports = DefaultMessageIdProvider


/***/ }),

/***/ 5498:
/***/ ((module, __unused_webpack_exports, __nccwpck_require__) => {

"use strict";


/**
 * Module dependencies
 */
const xtend = __nccwpck_require__(1208)

const Readable = (__nccwpck_require__(1642).Readable)
const streamsOpts = { objectMode: true }
const defaultStoreOptions = {
  clean: true
}

/**
 * In-memory implementation of the message store
 * This can actually be saved into files.
 *
 * @param {Object} [options] - store options
 */
function Store (options) {
  if (!(this instanceof Store)) {
    return new Store(options)
  }

  this.options = options || {}

  // Defaults
  this.options = xtend(defaultStoreOptions, options)

  this._inflights = new Map()
}

/**
 * Adds a packet to the store, a packet is
 * anything that has a messageId property.
 *
 */
Store.prototype.put = function (packet, cb) {
  this._inflights.set(packet.messageId, packet)

  if (cb) {
    cb()
  }

  return this
}

/**
 * Creates a stream with all the packets in the store
 *
 */
Store.prototype.createStream = function () {
  const stream = new Readable(streamsOpts)
  const values = []
  let destroyed = false
  let i = 0

  this._inflights.forEach(function (value, key) {
    values.push(value)
  })

  stream._read = function () {
    if (!destroyed && i < values.length) {
      this.push(values[i++])
    } else {
      this.push(null)
    }
  }

  stream.destroy = function () {
    if (destroyed) {
      return
    }

    const self = this

    destroyed = true

    setTimeout(function () {
      self.emit('close')
    }, 0)
  }

  return stream
}

/**
 * deletes a packet from the store.
 */
Store.prototype.del = function (packet, cb) {
  packet = this._inflights.get(packet.messageId)
  if (packet) {
    this._inflights.delete(packet.messageId)
    cb(null, packet)
  } else if (cb) {
    cb(new Error('missing packet'))
  }

  return this
}

/**
 * get a packet from the store.
 */
Store.prototype.get = function (packet, cb) {
  packet = this._inflights.get(packet.messageId)
  if (packet) {
    cb(null, packet)
  } else if (cb) {
    cb(new Error('missing packet'))
  }

  return this
}

/**
 * Close the store
 */
Store.prototype.close = function (cb) {
  if (this.options.clean) {
    this._inflights = null
  }
  if (cb) {
    cb()
  }
}

module.exports = Store


/***/ }),

/***/ 9198:
/***/ ((module) => {

"use strict";


/**
 * Topic Alias receiving manager
 * This holds alias to topic map
 * @param {Number} [max] - topic alias maximum entries
 */
function TopicAliasRecv (max) {
  if (!(this instanceof TopicAliasRecv)) {
    return new TopicAliasRecv(max)
  }
  this.aliasToTopic = {}
  this.max = max
}

/**
 * Insert or update topic - alias entry.
 * @param {String} [topic] - topic
 * @param {Number} [alias] - topic alias
 * @returns {Boolean} - if success return true otherwise false
 */
TopicAliasRecv.prototype.put = function (topic, alias) {
  if (alias === 0 || alias > this.max) {
    return false
  }
  this.aliasToTopic[alias] = topic
  this.length = Object.keys(this.aliasToTopic).length
  return true
}

/**
 * Get topic by alias
 * @param {String} [topic] - topic
 * @returns {Number} - if mapped topic exists return topic alias, otherwise return undefined
 */
TopicAliasRecv.prototype.getTopicByAlias = function (alias) {
  return this.aliasToTopic[alias]
}

/**
 * Clear all entries
 */
TopicAliasRecv.prototype.clear = function () {
  this.aliasToTopic = {}
}

module.exports = TopicAliasRecv


/***/ }),

/***/ 9456:
/***/ ((module, __unused_webpack_exports, __nccwpck_require__) => {

"use strict";


/**
 * Module dependencies
 */
const LruMap = __nccwpck_require__(7129)
const NumberAllocator = (__nccwpck_require__(721)/* .NumberAllocator */ .Q)

/**
 * Topic Alias sending manager
 * This holds both topic to alias and alias to topic map
 * @param {Number} [max] - topic alias maximum entries
 */
function TopicAliasSend (max) {
  if (!(this instanceof TopicAliasSend)) {
    return new TopicAliasSend(max)
  }

  if (max > 0) {
    this.aliasToTopic = new LruMap({ max: max })
    this.topicToAlias = {}
    this.numberAllocator = new NumberAllocator(1, max)
    this.max = max
    this.length = 0
  }
}

/**
 * Insert or update topic - alias entry.
 * @param {String} [topic] - topic
 * @param {Number} [alias] - topic alias
 * @returns {Boolean} - if success return true otherwise false
 */
TopicAliasSend.prototype.put = function (topic, alias) {
  if (alias === 0 || alias > this.max) {
    return false
  }
  const entry = this.aliasToTopic.get(alias)
  if (entry) {
    delete this.topicToAlias[entry]
  }
  this.aliasToTopic.set(alias, topic)
  this.topicToAlias[topic] = alias
  this.numberAllocator.use(alias)
  this.length = this.aliasToTopic.length
  return true
}

/**
 * Get topic by alias
 * @param {Number} [alias] - topic alias
 * @returns {String} - if mapped topic exists return topic, otherwise return undefined
 */
TopicAliasSend.prototype.getTopicByAlias = function (alias) {
  return this.aliasToTopic.get(alias)
}

/**
 * Get topic by alias
 * @param {String} [topic] - topic
 * @returns {Number} - if mapped topic exists return topic alias, otherwise return undefined
 */
TopicAliasSend.prototype.getAliasByTopic = function (topic) {
  const alias = this.topicToAlias[topic]
  if (typeof alias !== 'undefined') {
    this.aliasToTopic.get(alias) // LRU update
  }
  return alias
}

/**
 * Clear all entries
 */
TopicAliasSend.prototype.clear = function () {
  this.aliasToTopic.reset()
  this.topicToAlias = {}
  this.numberAllocator.clear()
  this.length = 0
}

/**
 * Get Least Recently Used (LRU) topic alias
 * @returns {Number} - if vacant alias exists then return it, otherwise then return LRU alias
 */
TopicAliasSend.prototype.getLruAlias = function () {
  const alias = this.numberAllocator.firstVacant()
  if (alias) return alias
  return this.aliasToTopic.keys()[this.aliasToTopic.length - 1]
}

module.exports = TopicAliasSend


/***/ }),

/***/ 4827:
/***/ ((module, __unused_webpack_exports, __nccwpck_require__) => {

"use strict";


const NumberAllocator = (__nccwpck_require__(721)/* .NumberAllocator */ .Q)

/**
 * UniqueMessageAllocator constructor
 * @constructor
 */
function UniqueMessageIdProvider () {
  if (!(this instanceof UniqueMessageIdProvider)) {
    return new UniqueMessageIdProvider()
  }

  this.numberAllocator = new NumberAllocator(1, 65535)
}

/**
 * allocate
 *
 * Get the next messageId.
 * @return if messageId is fully allocated then return null,
 *         otherwise return the smallest usable unsigned int messageId.
 */
UniqueMessageIdProvider.prototype.allocate = function () {
  this.lastId = this.numberAllocator.alloc()
  return this.lastId
}

/**
 * getLastAllocated
 * Get the last allocated messageId.
 * @return unsigned int
 */
UniqueMessageIdProvider.prototype.getLastAllocated = function () {
  return this.lastId
}

/**
 * register
 * Register messageId. If success return true, otherwise return false.
 * @param { unsigned int } - messageId to register,
 * @return boolean
 */
UniqueMessageIdProvider.prototype.register = function (messageId) {
  return this.numberAllocator.use(messageId)
}

/**
 * deallocate
 * Deallocate messageId.
 * @param { unsigned int } - messageId to deallocate,
 */
UniqueMessageIdProvider.prototype.deallocate = function (messageId) {
  this.numberAllocator.free(messageId)
}

/**
 * clear
 * Deallocate all messageIds.
 */
UniqueMessageIdProvider.prototype.clear = function () {
  this.numberAllocator.clear()
}

module.exports = UniqueMessageIdProvider


/***/ }),

/***/ 9465:
/***/ ((module) => {

"use strict";


/**
 * Validate a topic to see if it's valid or not.
 * A topic is valid if it follow below rules:
 * - Rule #1: If any part of the topic is not `+` or `#`, then it must not contain `+` and '#'
 * - Rule #2: Part `#` must be located at the end of the mailbox
 *
 * @param {String} topic - A topic
 * @returns {Boolean} If the topic is valid, returns true. Otherwise, returns false.
 */
function validateTopic (topic) {
  const parts = topic.split('/')

  for (let i = 0; i < parts.length; i++) {
    if (parts[i] === '+') {
      continue
    }

    if (parts[i] === '#') {
      // for Rule #2
      return i === parts.length - 1
    }

    if (parts[i].indexOf('+') !== -1 || parts[i].indexOf('#') !== -1) {
      return false
    }
  }

  return true
}

/**
 * Validate an array of topics to see if any of them is valid or not
  * @param {Array} topics - Array of topics
 * @returns {String} If the topics is valid, returns null. Otherwise, returns the invalid one
 */
function validateTopics (topics) {
  if (topics.length === 0) {
    return 'empty_topic_list'
  }
  for (let i = 0; i < topics.length; i++) {
    if (!validateTopic(topics[i])) {
      return topics[i]
    }
  }
  return null
}

module.exports = {
  validateTopics: validateTopics
}


/***/ }),

/***/ 8017:
/***/ ((module, __unused_webpack_exports, __nccwpck_require__) => {

/*
 * Copyright (c) 2015-2015 MQTT.js contributors.
 * Copyright (c) 2011-2014 Adam Rudd.
 *
 * See LICENSE for more information
 */

const MqttClient = __nccwpck_require__(5823)
const connect = __nccwpck_require__(9675)
const Store = __nccwpck_require__(5498)
const DefaultMessageIdProvider = __nccwpck_require__(1966)
const UniqueMessageIdProvider = __nccwpck_require__(4827)

module.exports.connect = connect

// Expose MqttClient
module.exports.MqttClient = MqttClient
module.exports.Client = MqttClient
module.exports.Store = Store
module.exports.DefaultMessageIdProvider = DefaultMessageIdProvider
module.exports.UniqueMessageIdProvider = UniqueMessageIdProvider


/***/ }),

/***/ 900:
/***/ ((module) => {

/**
 * Helpers.
 */

var s = 1000;
var m = s * 60;
var h = m * 60;
var d = h * 24;
var w = d * 7;
var y = d * 365.25;

/**
 * Parse or format the given `val`.
 *
 * Options:
 *
 *  - `long` verbose formatting [false]
 *
 * @param {String|Number} val
 * @param {Object} [options]
 * @throws {Error} throw an error if val is not a non-empty string or a number
 * @return {String|Number}
 * @api public
 */

module.exports = function(val, options) {
  options = options || {};
  var type = typeof val;
  if (type === 'string' && val.length > 0) {
    return parse(val);
  } else if (type === 'number' && isFinite(val)) {
    return options.long ? fmtLong(val) : fmtShort(val);
  }
  throw new Error(
    'val is not a non-empty string or a valid number. val=' +
      JSON.stringify(val)
  );
};

/**
 * Parse the given `str` and return milliseconds.
 *
 * @param {String} str
 * @return {Number}
 * @api private
 */

function parse(str) {
  str = String(str);
  if (str.length > 100) {
    return;
  }
  var match = /^(-?(?:\d+)?\.?\d+) *(milliseconds?|msecs?|ms|seconds?|secs?|s|minutes?|mins?|m|hours?|hrs?|h|days?|d|weeks?|w|years?|yrs?|y)?$/i.exec(
    str
  );
  if (!match) {
    return;
  }
  var n = parseFloat(match[1]);
  var type = (match[2] || 'ms').toLowerCase();
  switch (type) {
    case 'years':
    case 'year':
    case 'yrs':
    case 'yr':
    case 'y':
      return n * y;
    case 'weeks':
    case 'week':
    case 'w':
      return n * w;
    case 'days':
    case 'day':
    case 'd':
      return n * d;
    case 'hours':
    case 'hour':
    case 'hrs':
    case 'hr':
    case 'h':
      return n * h;
    case 'minutes':
    case 'minute':
    case 'mins':
    case 'min':
    case 'm':
      return n * m;
    case 'seconds':
    case 'second':
    case 'secs':
    case 'sec':
    case 's':
      return n * s;
    case 'milliseconds':
    case 'millisecond':
    case 'msecs':
    case 'msec':
    case 'ms':
      return n;
    default:
      return undefined;
  }
}

/**
 * Short format for `ms`.
 *
 * @param {Number} ms
 * @return {String}
 * @api private
 */

function fmtShort(ms) {
  var msAbs = Math.abs(ms);
  if (msAbs >= d) {
    return Math.round(ms / d) + 'd';
  }
  if (msAbs >= h) {
    return Math.round(ms / h) + 'h';
  }
  if (msAbs >= m) {
    return Math.round(ms / m) + 'm';
  }
  if (msAbs >= s) {
    return Math.round(ms / s) + 's';
  }
  return ms + 'ms';
}

/**
 * Long format for `ms`.
 *
 * @param {Number} ms
 * @return {String}
 * @api private
 */

function fmtLong(ms) {
  var msAbs = Math.abs(ms);
  if (msAbs >= d) {
    return plural(ms, msAbs, d, 'day');
  }
  if (msAbs >= h) {
    return plural(ms, msAbs, h, 'hour');
  }
  if (msAbs >= m) {
    return plural(ms, msAbs, m, 'minute');
  }
  if (msAbs >= s) {
    return plural(ms, msAbs, s, 'second');
  }
  return ms + ' ms';
}

/**
 * Pluralization helper.
 */

function plural(ms, msAbs, n, name) {
  var isPlural = msAbs >= n * 1.5;
  return Math.round(ms / n) + ' ' + name + (isPlural ? 's' : '');
}


/***/ }),

/***/ 721:
/***/ ((module, __unused_webpack_exports, __nccwpck_require__) => {

// Copyright Takatoshi Kondo 2021
//
// Distributed under the MIT License

const NumberAllocator = __nccwpck_require__(2962)

module.exports.Q = NumberAllocator


/***/ }),

/***/ 2962:
/***/ ((module, __unused_webpack_exports, __nccwpck_require__) => {

"use strict";
// Copyright Takatoshi Kondo 2021
//
// Distributed under the MIT License



const SortedSet = (__nccwpck_require__(9274)/* .OrderedSet */ .hU)
const debugTrace = __nccwpck_require__(8237)('number-allocator:trace')
const debugError = __nccwpck_require__(8237)('number-allocator:error')
/**
 * Interval constructor
 * @constructor
 * @param {Number} low  - The lowest value of the interval
 * @param {Number} high - The highest value of the interval
 */
function Interval (low, high) {
  this.low = low
  this.high = high
}

Interval.prototype.equals = function (other) {
  return this.low === other.low && this.high === other.high
}

Interval.prototype.compare = function (other) {
  if (this.low < other.low && this.high < other.low) return -1
  if (other.low < this.low && other.high < this.low) return 1
  return 0
}

/**
 * NumberAllocator constructor.
 * The all numbers are set to vacant status.
 * Time Complexity O(1)
 * @constructor
 * @param {Number} min  - The maximum number of allocatable. The number must be integer.
 * @param {Number} maxh - The minimum number of allocatable. The number must be integer.
 */
function NumberAllocator (min, max) {
  if (!(this instanceof NumberAllocator)) {
    return new NumberAllocator(min, max)
  }

  this.min = min
  this.max = max

  this.ss = new SortedSet(
    [],
    (lhs, rhs) => {
      return lhs.compare(rhs)
    }
  )
  debugTrace('Create')
  this.clear()
}

/**
 * Get the first vacant number. The status of the number is not updated.
 * Time Complexity O(1)
 * @return {Number} - The first vacant number. If all numbers are occupied, return null.
 *                    When alloc() is called then the same value will be allocated.
 */
NumberAllocator.prototype.firstVacant = function () {
  if (this.ss.size() === 0) return null
  return this.ss.front().low
}

/**
 * Allocate the first vacant number. The number become occupied status.
 * Time Complexity O(1)
 * @return {Number} - The first vacant number. If all numbers are occupied, return null.
 */
NumberAllocator.prototype.alloc = function () {
  if (this.ss.size() === 0) {
    debugTrace('alloc():empty')
    return null
  }
  const it = this.ss.begin()
  const low = it.pointer.low
  const high = it.pointer.high
  const num = low
  if (num + 1 <= high) {
    // x|----|
    this.ss.updateKeyByIterator(it, new Interval(low + 1, high))
  } else {
    this.ss.eraseElementByPos(0)
  }
  debugTrace('alloc():' + num)
  return num
}

/**
 * Use the number. The number become occupied status.
 * If the number has already been occupied, then return false.
 * Time Complexity O(logN) : N is the number of intervals (not numbers)
 * @param {Number} num - The number to request use.
 * @return {Boolean} - If `num` was not occupied, then return true, otherwise return false.
 */
NumberAllocator.prototype.use = function (num) {
  const key = new Interval(num, num)
  const it = this.ss.lowerBound(key)
  if (!it.equals(this.ss.end())) {
    const low = it.pointer.low
    const high = it.pointer.high
    if (it.pointer.equals(key)) {
      // |x|
      this.ss.eraseElementByIterator(it)
      debugTrace('use():' + num)
      return true
    }

    // x |-----|
    if (low > num) return false

    // |x----|
    if (low === num) {
      // x|----|
      this.ss.updateKeyByIterator(it, new Interval(low + 1, high))
      debugTrace('use():' + num)
      return true
    }

    // |----x|
    if (high === num) {
      // |----|x
      this.ss.updateKeyByIterator(it, new Interval(low, high - 1))
      debugTrace('use():' + num)
      return true
    }

    // |--x--|
    // x|--|
    this.ss.updateKeyByIterator(it, new Interval(num + 1, high))
    // |--|x|--|
    this.ss.insert(new Interval(low, num - 1))
    debugTrace('use():' + num)
    return true
  }

  debugTrace('use():failed')
  return false
}

/**
 * Deallocate the number. The number become vacant status.
 * Time Complexity O(logN) : N is the number of intervals (not numbers)
 * @param {Number} num - The number to deallocate. The number must be occupied status.
 *                       In other words, the number must be allocated by alloc() or occupied be use().
 */
NumberAllocator.prototype.free = function (num) {
  if (num < this.min || num > this.max) {
    debugError('free():' + num + ' is out of range')
    return
  }
  const key = new Interval(num, num)
  const it = this.ss.upperBound(key)
  if (it.equals(this.ss.end())) {
    // ....v
    if (it.equals(this.ss.begin())) {
      // Insert new interval
      this.ss.insert(key)
      return
    }
    it.pre()
    const low = it.pointer.high
    const high = it.pointer.high
    if (high + 1 === num) {
      // Concat to left
      this.ss.updateKeyByIterator(it, new Interval(low, num))
    } else {
      // Insert new interval
      this.ss.insert(key)
    }
  } else {
    if (it.equals(this.ss.begin())) {
      // v....
      if (num + 1 === it.pointer.low) {
        // Concat to right
        const high = it.pointer.high
        this.ss.updateKeyByIterator(it, new Interval(num, high))
      } else {
        // Insert new interval
        this.ss.insert(key)
      }
    } else {
      // ..v..
      const rLow = it.pointer.low
      const rHigh = it.pointer.high
      it.pre()
      const lLow = it.pointer.low
      const lHigh = it.pointer.high
      if (lHigh + 1 === num) {
        if (num + 1 === rLow) {
          // Concat to left and right
          this.ss.eraseElementByIterator(it)
          this.ss.updateKeyByIterator(it, new Interval(lLow, rHigh))
        } else {
          // Concat to left
          this.ss.updateKeyByIterator(it, new Interval(lLow, num))
        }
      } else {
        if (num + 1 === rLow) {
          // Concat to right
          this.ss.eraseElementByIterator(it.next())
          this.ss.insert(new Interval(num, rHigh))
        } else {
          // Insert new interval
          this.ss.insert(key)
        }
      }
    }
  }
  debugTrace('free():' + num)
}

/**
 * Clear all occupied numbers.
 * The all numbers are set to vacant status.
 * Time Complexity O(1)
 */
NumberAllocator.prototype.clear = function () {
  debugTrace('clear()')
  this.ss.clear()
  this.ss.insert(new Interval(this.min, this.max))
}

/**
 * Get the number of intervals. Interval is internal structure of this library.
 * This function is for debugging.
 * Time Complexity O(1)
 * @return {Number} - The number of intervals.
 */
NumberAllocator.prototype.intervalCount = function () {
  return this.ss.size()
}

/**
 * Dump the internal structor of the library.
 * This function is for debugging.
 * Time Complexity O(N) : N is the number of intervals (not numbers)
 */
NumberAllocator.prototype.dump = function () {
  console.log('length:' + this.ss.size())
  for (const element of this.ss) {
    console.log(element)
  }
}

module.exports = NumberAllocator


/***/ }),

/***/ 1223:
/***/ ((module, __unused_webpack_exports, __nccwpck_require__) => {

var wrappy = __nccwpck_require__(2940)
module.exports = wrappy(once)
module.exports.strict = wrappy(onceStrict)

once.proto = once(function () {
  Object.defineProperty(Function.prototype, 'once', {
    value: function () {
      return once(this)
    },
    configurable: true
  })

  Object.defineProperty(Function.prototype, 'onceStrict', {
    value: function () {
      return onceStrict(this)
    },
    configurable: true
  })
})

function once (fn) {
  var f = function () {
    if (f.called) return f.value
    f.called = true
    return f.value = fn.apply(this, arguments)
  }
  f.called = false
  return f
}

function onceStrict (fn) {
  var f = function () {
    if (f.called)
      throw new Error(f.onceError)
    f.called = true
    return f.value = fn.apply(this, arguments)
  }
  var name = fn.name || 'Function wrapped with `once`'
  f.onceError = name + " shouldn't be called more than once"
  f.called = false
  return f
}


/***/ }),

/***/ 7810:
/***/ ((module) => {

"use strict";


if (typeof process === 'undefined' ||
    !process.version ||
    process.version.indexOf('v0.') === 0 ||
    process.version.indexOf('v1.') === 0 && process.version.indexOf('v1.8.') !== 0) {
  module.exports = { nextTick: nextTick };
} else {
  module.exports = process
}

function nextTick(fn, arg1, arg2, arg3) {
  if (typeof fn !== 'function') {
    throw new TypeError('"callback" argument must be a function');
  }
  var len = arguments.length;
  var args, i;
  switch (len) {
  case 0:
  case 1:
    return process.nextTick(fn);
  case 2:
    return process.nextTick(function afterTickOne() {
      fn.call(null, arg1);
    });
  case 3:
    return process.nextTick(function afterTickTwo() {
      fn.call(null, arg1, arg2);
    });
  case 4:
    return process.nextTick(function afterTickThree() {
      fn.call(null, arg1, arg2, arg3);
    });
  default:
    args = new Array(len - 1);
    i = 0;
    while (i < args.length) {
      args[i++] = arguments[i];
    }
    return process.nextTick(function afterTick() {
      fn.apply(null, args);
    });
  }
}



/***/ }),

/***/ 7214:
/***/ ((module) => {

"use strict";


const codes = {};

function createErrorType(code, message, Base) {
  if (!Base) {
    Base = Error
  }

  function getMessage (arg1, arg2, arg3) {
    if (typeof message === 'string') {
      return message
    } else {
      return message(arg1, arg2, arg3)
    }
  }

  class NodeError extends Base {
    constructor (arg1, arg2, arg3) {
      super(getMessage(arg1, arg2, arg3));
    }
  }

  NodeError.prototype.name = Base.name;
  NodeError.prototype.code = code;

  codes[code] = NodeError;
}

// https://github.com/nodejs/node/blob/v10.8.0/lib/internal/errors.js
function oneOf(expected, thing) {
  if (Array.isArray(expected)) {
    const len = expected.length;
    expected = expected.map((i) => String(i));
    if (len > 2) {
      return `one of ${thing} ${expected.slice(0, len - 1).join(', ')}, or ` +
             expected[len - 1];
    } else if (len === 2) {
      return `one of ${thing} ${expected[0]} or ${expected[1]}`;
    } else {
      return `of ${thing} ${expected[0]}`;
    }
  } else {
    return `of ${thing} ${String(expected)}`;
  }
}

// https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/startsWith
function startsWith(str, search, pos) {
	return str.substr(!pos || pos < 0 ? 0 : +pos, search.length) === search;
}

// https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/endsWith
function endsWith(str, search, this_len) {
	if (this_len === undefined || this_len > str.length) {
		this_len = str.length;
	}
	return str.substring(this_len - search.length, this_len) === search;
}

// https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/includes
function includes(str, search, start) {
  if (typeof start !== 'number') {
    start = 0;
  }

  if (start + search.length > str.length) {
    return false;
  } else {
    return str.indexOf(search, start) !== -1;
  }
}

createErrorType('ERR_INVALID_OPT_VALUE', function (name, value) {
  return 'The value "' + value + '" is invalid for option "' + name + '"'
}, TypeError);
createErrorType('ERR_INVALID_ARG_TYPE', function (name, expected, actual) {
  // determiner: 'must be' or 'must not be'
  let determiner;
  if (typeof expected === 'string' && startsWith(expected, 'not ')) {
    determiner = 'must not be';
    expected = expected.replace(/^not /, '');
  } else {
    determiner = 'must be';
  }

  let msg;
  if (endsWith(name, ' argument')) {
    // For cases like 'first argument'
    msg = `The ${name} ${determiner} ${oneOf(expected, 'type')}`;
  } else {
    const type = includes(name, '.') ? 'property' : 'argument';
    msg = `The "${name}" ${type} ${determiner} ${oneOf(expected, 'type')}`;
  }

  msg += `. Received type ${typeof actual}`;
  return msg;
}, TypeError);
createErrorType('ERR_STREAM_PUSH_AFTER_EOF', 'stream.push() after EOF');
createErrorType('ERR_METHOD_NOT_IMPLEMENTED', function (name) {
  return 'The ' + name + ' method is not implemented'
});
createErrorType('ERR_STREAM_PREMATURE_CLOSE', 'Premature close');
createErrorType('ERR_STREAM_DESTROYED', function (name) {
  return 'Cannot call ' + name + ' after a stream was destroyed';
});
createErrorType('ERR_MULTIPLE_CALLBACK', 'Callback called multiple times');
createErrorType('ERR_STREAM_CANNOT_PIPE', 'Cannot pipe, not readable');
createErrorType('ERR_STREAM_WRITE_AFTER_END', 'write after end');
createErrorType('ERR_STREAM_NULL_VALUES', 'May not write null values to stream', TypeError);
createErrorType('ERR_UNKNOWN_ENCODING', function (arg) {
  return 'Unknown encoding: ' + arg
}, TypeError);
createErrorType('ERR_STREAM_UNSHIFT_AFTER_END_EVENT', 'stream.unshift() after end event');

module.exports.q = codes;


/***/ }),

/***/ 1359:
/***/ ((module, __unused_webpack_exports, __nccwpck_require__) => {

"use strict";
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

// a duplex stream is just a stream that is both readable and writable.
// Since JS doesn't have multiple prototypal inheritance, this class
// prototypally inherits from Readable, and then parasitically from
// Writable.



/*<replacement>*/
var objectKeys = Object.keys || function (obj) {
  var keys = [];
  for (var key in obj) keys.push(key);
  return keys;
};
/*</replacement>*/

module.exports = Duplex;
var Readable = __nccwpck_require__(1433);
var Writable = __nccwpck_require__(6993);
__nccwpck_require__(4124)(Duplex, Readable);
{
  // Allow the keys array to be GC'ed.
  var keys = objectKeys(Writable.prototype);
  for (var v = 0; v < keys.length; v++) {
    var method = keys[v];
    if (!Duplex.prototype[method]) Duplex.prototype[method] = Writable.prototype[method];
  }
}
function Duplex(options) {
  if (!(this instanceof Duplex)) return new Duplex(options);
  Readable.call(this, options);
  Writable.call(this, options);
  this.allowHalfOpen = true;
  if (options) {
    if (options.readable === false) this.readable = false;
    if (options.writable === false) this.writable = false;
    if (options.allowHalfOpen === false) {
      this.allowHalfOpen = false;
      this.once('end', onend);
    }
  }
}
Object.defineProperty(Duplex.prototype, 'writableHighWaterMark', {
  // making it explicit this property is not enumerable
  // because otherwise some prototype manipulation in
  // userland will fail
  enumerable: false,
  get: function get() {
    return this._writableState.highWaterMark;
  }
});
Object.defineProperty(Duplex.prototype, 'writableBuffer', {
  // making it explicit this property is not enumerable
  // because otherwise some prototype manipulation in
  // userland will fail
  enumerable: false,
  get: function get() {
    return this._writableState && this._writableState.getBuffer();
  }
});
Object.defineProperty(Duplex.prototype, 'writableLength', {
  // making it explicit this property is not enumerable
  // because otherwise some prototype manipulation in
  // userland will fail
  enumerable: false,
  get: function get() {
    return this._writableState.length;
  }
});

// the no-half-open enforcer
function onend() {
  // If the writable side ended, then we're ok.
  if (this._writableState.ended) return;

  // no more data can be written.
  // But allow more writes to happen in this tick.
  process.nextTick(onEndNT, this);
}
function onEndNT(self) {
  self.end();
}
Object.defineProperty(Duplex.prototype, 'destroyed', {
  // making it explicit this property is not enumerable
  // because otherwise some prototype manipulation in
  // userland will fail
  enumerable: false,
  get: function get() {
    if (this._readableState === undefined || this._writableState === undefined) {
      return false;
    }
    return this._readableState.destroyed && this._writableState.destroyed;
  },
  set: function set(value) {
    // we ignore the value if the stream
    // has not been initialized yet
    if (this._readableState === undefined || this._writableState === undefined) {
      return;
    }

    // backward compatibility, the user is explicitly
    // managing destroyed
    this._readableState.destroyed = value;
    this._writableState.destroyed = value;
  }
});

/***/ }),

/***/ 1542:
/***/ ((module, __unused_webpack_exports, __nccwpck_require__) => {

"use strict";
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

// a passthrough stream.
// basically just the most minimal sort of Transform stream.
// Every written chunk gets output as-is.



module.exports = PassThrough;
var Transform = __nccwpck_require__(4415);
__nccwpck_require__(4124)(PassThrough, Transform);
function PassThrough(options) {
  if (!(this instanceof PassThrough)) return new PassThrough(options);
  Transform.call(this, options);
}
PassThrough.prototype._transform = function (chunk, encoding, cb) {
  cb(null, chunk);
};

/***/ }),

/***/ 1433:
/***/ ((module, __unused_webpack_exports, __nccwpck_require__) => {

"use strict";
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.



module.exports = Readable;

/*<replacement>*/
var Duplex;
/*</replacement>*/

Readable.ReadableState = ReadableState;

/*<replacement>*/
var EE = (__nccwpck_require__(2361).EventEmitter);
var EElistenerCount = function EElistenerCount(emitter, type) {
  return emitter.listeners(type).length;
};
/*</replacement>*/

/*<replacement>*/
var Stream = __nccwpck_require__(2387);
/*</replacement>*/

var Buffer = (__nccwpck_require__(4300).Buffer);
var OurUint8Array = (typeof global !== 'undefined' ? global : typeof window !== 'undefined' ? window : typeof self !== 'undefined' ? self : {}).Uint8Array || function () {};
function _uint8ArrayToBuffer(chunk) {
  return Buffer.from(chunk);
}
function _isUint8Array(obj) {
  return Buffer.isBuffer(obj) || obj instanceof OurUint8Array;
}

/*<replacement>*/
var debugUtil = __nccwpck_require__(3837);
var debug;
if (debugUtil && debugUtil.debuglog) {
  debug = debugUtil.debuglog('stream');
} else {
  debug = function debug() {};
}
/*</replacement>*/

var BufferList = __nccwpck_require__(2746);
var destroyImpl = __nccwpck_require__(7049);
var _require = __nccwpck_require__(9948),
  getHighWaterMark = _require.getHighWaterMark;
var _require$codes = (__nccwpck_require__(7214)/* .codes */ .q),
  ERR_INVALID_ARG_TYPE = _require$codes.ERR_INVALID_ARG_TYPE,
  ERR_STREAM_PUSH_AFTER_EOF = _require$codes.ERR_STREAM_PUSH_AFTER_EOF,
  ERR_METHOD_NOT_IMPLEMENTED = _require$codes.ERR_METHOD_NOT_IMPLEMENTED,
  ERR_STREAM_UNSHIFT_AFTER_END_EVENT = _require$codes.ERR_STREAM_UNSHIFT_AFTER_END_EVENT;

// Lazy loaded to improve the startup performance.
var StringDecoder;
var createReadableStreamAsyncIterator;
var from;
__nccwpck_require__(4124)(Readable, Stream);
var errorOrDestroy = destroyImpl.errorOrDestroy;
var kProxyEvents = ['error', 'close', 'destroy', 'pause', 'resume'];
function prependListener(emitter, event, fn) {
  // Sadly this is not cacheable as some libraries bundle their own
  // event emitter implementation with them.
  if (typeof emitter.prependListener === 'function') return emitter.prependListener(event, fn);

  // This is a hack to make sure that our error handler is attached before any
  // userland ones.  NEVER DO THIS. This is here only because this code needs
  // to continue to work with older versions of Node.js that do not include
  // the prependListener() method. The goal is to eventually remove this hack.
  if (!emitter._events || !emitter._events[event]) emitter.on(event, fn);else if (Array.isArray(emitter._events[event])) emitter._events[event].unshift(fn);else emitter._events[event] = [fn, emitter._events[event]];
}
function ReadableState(options, stream, isDuplex) {
  Duplex = Duplex || __nccwpck_require__(1359);
  options = options || {};

  // Duplex streams are both readable and writable, but share
  // the same options object.
  // However, some cases require setting options to different
  // values for the readable and the writable sides of the duplex stream.
  // These options can be provided separately as readableXXX and writableXXX.
  if (typeof isDuplex !== 'boolean') isDuplex = stream instanceof Duplex;

  // object stream flag. Used to make read(n) ignore n and to
  // make all the buffer merging and length checks go away
  this.objectMode = !!options.objectMode;
  if (isDuplex) this.objectMode = this.objectMode || !!options.readableObjectMode;

  // the point at which it stops calling _read() to fill the buffer
  // Note: 0 is a valid value, means "don't call _read preemptively ever"
  this.highWaterMark = getHighWaterMark(this, options, 'readableHighWaterMark', isDuplex);

  // A linked list is used to store data chunks instead of an array because the
  // linked list can remove elements from the beginning faster than
  // array.shift()
  this.buffer = new BufferList();
  this.length = 0;
  this.pipes = null;
  this.pipesCount = 0;
  this.flowing = null;
  this.ended = false;
  this.endEmitted = false;
  this.reading = false;

  // a flag to be able to tell if the event 'readable'/'data' is emitted
  // immediately, or on a later tick.  We set this to true at first, because
  // any actions that shouldn't happen until "later" should generally also
  // not happen before the first read call.
  this.sync = true;

  // whenever we return null, then we set a flag to say
  // that we're awaiting a 'readable' event emission.
  this.needReadable = false;
  this.emittedReadable = false;
  this.readableListening = false;
  this.resumeScheduled = false;
  this.paused = true;

  // Should close be emitted on destroy. Defaults to true.
  this.emitClose = options.emitClose !== false;

  // Should .destroy() be called after 'end' (and potentially 'finish')
  this.autoDestroy = !!options.autoDestroy;

  // has it been destroyed
  this.destroyed = false;

  // Crypto is kind of old and crusty.  Historically, its default string
  // encoding is 'binary' so we have to make this configurable.
  // Everything else in the universe uses 'utf8', though.
  this.defaultEncoding = options.defaultEncoding || 'utf8';

  // the number of writers that are awaiting a drain event in .pipe()s
  this.awaitDrain = 0;

  // if true, a maybeReadMore has been scheduled
  this.readingMore = false;
  this.decoder = null;
  this.encoding = null;
  if (options.encoding) {
    if (!StringDecoder) StringDecoder = (__nccwpck_require__(4841)/* .StringDecoder */ .s);
    this.decoder = new StringDecoder(options.encoding);
    this.encoding = options.encoding;
  }
}
function Readable(options) {
  Duplex = Duplex || __nccwpck_require__(1359);
  if (!(this instanceof Readable)) return new Readable(options);

  // Checking for a Stream.Duplex instance is faster here instead of inside
  // the ReadableState constructor, at least with V8 6.5
  var isDuplex = this instanceof Duplex;
  this._readableState = new ReadableState(options, this, isDuplex);

  // legacy
  this.readable = true;
  if (options) {
    if (typeof options.read === 'function') this._read = options.read;
    if (typeof options.destroy === 'function') this._destroy = options.destroy;
  }
  Stream.call(this);
}
Object.defineProperty(Readable.prototype, 'destroyed', {
  // making it explicit this property is not enumerable
  // because otherwise some prototype manipulation in
  // userland will fail
  enumerable: false,
  get: function get() {
    if (this._readableState === undefined) {
      return false;
    }
    return this._readableState.destroyed;
  },
  set: function set(value) {
    // we ignore the value if the stream
    // has not been initialized yet
    if (!this._readableState) {
      return;
    }

    // backward compatibility, the user is explicitly
    // managing destroyed
    this._readableState.destroyed = value;
  }
});
Readable.prototype.destroy = destroyImpl.destroy;
Readable.prototype._undestroy = destroyImpl.undestroy;
Readable.prototype._destroy = function (err, cb) {
  cb(err);
};

// Manually shove something into the read() buffer.
// This returns true if the highWaterMark has not been hit yet,
// similar to how Writable.write() returns true if you should
// write() some more.
Readable.prototype.push = function (chunk, encoding) {
  var state = this._readableState;
  var skipChunkCheck;
  if (!state.objectMode) {
    if (typeof chunk === 'string') {
      encoding = encoding || state.defaultEncoding;
      if (encoding !== state.encoding) {
        chunk = Buffer.from(chunk, encoding);
        encoding = '';
      }
      skipChunkCheck = true;
    }
  } else {
    skipChunkCheck = true;
  }
  return readableAddChunk(this, chunk, encoding, false, skipChunkCheck);
};

// Unshift should *always* be something directly out of read()
Readable.prototype.unshift = function (chunk) {
  return readableAddChunk(this, chunk, null, true, false);
};
function readableAddChunk(stream, chunk, encoding, addToFront, skipChunkCheck) {
  debug('readableAddChunk', chunk);
  var state = stream._readableState;
  if (chunk === null) {
    state.reading = false;
    onEofChunk(stream, state);
  } else {
    var er;
    if (!skipChunkCheck) er = chunkInvalid(state, chunk);
    if (er) {
      errorOrDestroy(stream, er);
    } else if (state.objectMode || chunk && chunk.length > 0) {
      if (typeof chunk !== 'string' && !state.objectMode && Object.getPrototypeOf(chunk) !== Buffer.prototype) {
        chunk = _uint8ArrayToBuffer(chunk);
      }
      if (addToFront) {
        if (state.endEmitted) errorOrDestroy(stream, new ERR_STREAM_UNSHIFT_AFTER_END_EVENT());else addChunk(stream, state, chunk, true);
      } else if (state.ended) {
        errorOrDestroy(stream, new ERR_STREAM_PUSH_AFTER_EOF());
      } else if (state.destroyed) {
        return false;
      } else {
        state.reading = false;
        if (state.decoder && !encoding) {
          chunk = state.decoder.write(chunk);
          if (state.objectMode || chunk.length !== 0) addChunk(stream, state, chunk, false);else maybeReadMore(stream, state);
        } else {
          addChunk(stream, state, chunk, false);
        }
      }
    } else if (!addToFront) {
      state.reading = false;
      maybeReadMore(stream, state);
    }
  }

  // We can push more data if we are below the highWaterMark.
  // Also, if we have no data yet, we can stand some more bytes.
  // This is to work around cases where hwm=0, such as the repl.
  return !state.ended && (state.length < state.highWaterMark || state.length === 0);
}
function addChunk(stream, state, chunk, addToFront) {
  if (state.flowing && state.length === 0 && !state.sync) {
    state.awaitDrain = 0;
    stream.emit('data', chunk);
  } else {
    // update the buffer info.
    state.length += state.objectMode ? 1 : chunk.length;
    if (addToFront) state.buffer.unshift(chunk);else state.buffer.push(chunk);
    if (state.needReadable) emitReadable(stream);
  }
  maybeReadMore(stream, state);
}
function chunkInvalid(state, chunk) {
  var er;
  if (!_isUint8Array(chunk) && typeof chunk !== 'string' && chunk !== undefined && !state.objectMode) {
    er = new ERR_INVALID_ARG_TYPE('chunk', ['string', 'Buffer', 'Uint8Array'], chunk);
  }
  return er;
}
Readable.prototype.isPaused = function () {
  return this._readableState.flowing === false;
};

// backwards compatibility.
Readable.prototype.setEncoding = function (enc) {
  if (!StringDecoder) StringDecoder = (__nccwpck_require__(4841)/* .StringDecoder */ .s);
  var decoder = new StringDecoder(enc);
  this._readableState.decoder = decoder;
  // If setEncoding(null), decoder.encoding equals utf8
  this._readableState.encoding = this._readableState.decoder.encoding;

  // Iterate over current buffer to convert already stored Buffers:
  var p = this._readableState.buffer.head;
  var content = '';
  while (p !== null) {
    content += decoder.write(p.data);
    p = p.next;
  }
  this._readableState.buffer.clear();
  if (content !== '') this._readableState.buffer.push(content);
  this._readableState.length = content.length;
  return this;
};

// Don't raise the hwm > 1GB
var MAX_HWM = 0x40000000;
function computeNewHighWaterMark(n) {
  if (n >= MAX_HWM) {
    // TODO(ronag): Throw ERR_VALUE_OUT_OF_RANGE.
    n = MAX_HWM;
  } else {
    // Get the next highest power of 2 to prevent increasing hwm excessively in
    // tiny amounts
    n--;
    n |= n >>> 1;
    n |= n >>> 2;
    n |= n >>> 4;
    n |= n >>> 8;
    n |= n >>> 16;
    n++;
  }
  return n;
}

// This function is designed to be inlinable, so please take care when making
// changes to the function body.
function howMuchToRead(n, state) {
  if (n <= 0 || state.length === 0 && state.ended) return 0;
  if (state.objectMode) return 1;
  if (n !== n) {
    // Only flow one buffer at a time
    if (state.flowing && state.length) return state.buffer.head.data.length;else return state.length;
  }
  // If we're asking for more than the current hwm, then raise the hwm.
  if (n > state.highWaterMark) state.highWaterMark = computeNewHighWaterMark(n);
  if (n <= state.length) return n;
  // Don't have enough
  if (!state.ended) {
    state.needReadable = true;
    return 0;
  }
  return state.length;
}

// you can override either this method, or the async _read(n) below.
Readable.prototype.read = function (n) {
  debug('read', n);
  n = parseInt(n, 10);
  var state = this._readableState;
  var nOrig = n;
  if (n !== 0) state.emittedReadable = false;

  // if we're doing read(0) to trigger a readable event, but we
  // already have a bunch of data in the buffer, then just trigger
  // the 'readable' event and move on.
  if (n === 0 && state.needReadable && ((state.highWaterMark !== 0 ? state.length >= state.highWaterMark : state.length > 0) || state.ended)) {
    debug('read: emitReadable', state.length, state.ended);
    if (state.length === 0 && state.ended) endReadable(this);else emitReadable(this);
    return null;
  }
  n = howMuchToRead(n, state);

  // if we've ended, and we're now clear, then finish it up.
  if (n === 0 && state.ended) {
    if (state.length === 0) endReadable(this);
    return null;
  }

  // All the actual chunk generation logic needs to be
  // *below* the call to _read.  The reason is that in certain
  // synthetic stream cases, such as passthrough streams, _read
  // may be a completely synchronous operation which may change
  // the state of the read buffer, providing enough data when
  // before there was *not* enough.
  //
  // So, the steps are:
  // 1. Figure out what the state of things will be after we do
  // a read from the buffer.
  //
  // 2. If that resulting state will trigger a _read, then call _read.
  // Note that this may be asynchronous, or synchronous.  Yes, it is
  // deeply ugly to write APIs this way, but that still doesn't mean
  // that the Readable class should behave improperly, as streams are
  // designed to be sync/async agnostic.
  // Take note if the _read call is sync or async (ie, if the read call
  // has returned yet), so that we know whether or not it's safe to emit
  // 'readable' etc.
  //
  // 3. Actually pull the requested chunks out of the buffer and return.

  // if we need a readable event, then we need to do some reading.
  var doRead = state.needReadable;
  debug('need readable', doRead);

  // if we currently have less than the highWaterMark, then also read some
  if (state.length === 0 || state.length - n < state.highWaterMark) {
    doRead = true;
    debug('length less than watermark', doRead);
  }

  // however, if we've ended, then there's no point, and if we're already
  // reading, then it's unnecessary.
  if (state.ended || state.reading) {
    doRead = false;
    debug('reading or ended', doRead);
  } else if (doRead) {
    debug('do read');
    state.reading = true;
    state.sync = true;
    // if the length is currently zero, then we *need* a readable event.
    if (state.length === 0) state.needReadable = true;
    // call internal read method
    this._read(state.highWaterMark);
    state.sync = false;
    // If _read pushed data synchronously, then `reading` will be false,
    // and we need to re-evaluate how much data we can return to the user.
    if (!state.reading) n = howMuchToRead(nOrig, state);
  }
  var ret;
  if (n > 0) ret = fromList(n, state);else ret = null;
  if (ret === null) {
    state.needReadable = state.length <= state.highWaterMark;
    n = 0;
  } else {
    state.length -= n;
    state.awaitDrain = 0;
  }
  if (state.length === 0) {
    // If we have nothing in the buffer, then we want to know
    // as soon as we *do* get something into the buffer.
    if (!state.ended) state.needReadable = true;

    // If we tried to read() past the EOF, then emit end on the next tick.
    if (nOrig !== n && state.ended) endReadable(this);
  }
  if (ret !== null) this.emit('data', ret);
  return ret;
};
function onEofChunk(stream, state) {
  debug('onEofChunk');
  if (state.ended) return;
  if (state.decoder) {
    var chunk = state.decoder.end();
    if (chunk && chunk.length) {
      state.buffer.push(chunk);
      state.length += state.objectMode ? 1 : chunk.length;
    }
  }
  state.ended = true;
  if (state.sync) {
    // if we are sync, wait until next tick to emit the data.
    // Otherwise we risk emitting data in the flow()
    // the readable code triggers during a read() call
    emitReadable(stream);
  } else {
    // emit 'readable' now to make sure it gets picked up.
    state.needReadable = false;
    if (!state.emittedReadable) {
      state.emittedReadable = true;
      emitReadable_(stream);
    }
  }
}

// Don't emit readable right away in sync mode, because this can trigger
// another read() call => stack overflow.  This way, it might trigger
// a nextTick recursion warning, but that's not so bad.
function emitReadable(stream) {
  var state = stream._readableState;
  debug('emitReadable', state.needReadable, state.emittedReadable);
  state.needReadable = false;
  if (!state.emittedReadable) {
    debug('emitReadable', state.flowing);
    state.emittedReadable = true;
    process.nextTick(emitReadable_, stream);
  }
}
function emitReadable_(stream) {
  var state = stream._readableState;
  debug('emitReadable_', state.destroyed, state.length, state.ended);
  if (!state.destroyed && (state.length || state.ended)) {
    stream.emit('readable');
    state.emittedReadable = false;
  }

  // The stream needs another readable event if
  // 1. It is not flowing, as the flow mechanism will take
  //    care of it.
  // 2. It is not ended.
  // 3. It is below the highWaterMark, so we can schedule
  //    another readable later.
  state.needReadable = !state.flowing && !state.ended && state.length <= state.highWaterMark;
  flow(stream);
}

// at this point, the user has presumably seen the 'readable' event,
// and called read() to consume some data.  that may have triggered
// in turn another _read(n) call, in which case reading = true if
// it's in progress.
// However, if we're not ended, or reading, and the length < hwm,
// then go ahead and try to read some more preemptively.
function maybeReadMore(stream, state) {
  if (!state.readingMore) {
    state.readingMore = true;
    process.nextTick(maybeReadMore_, stream, state);
  }
}
function maybeReadMore_(stream, state) {
  // Attempt to read more data if we should.
  //
  // The conditions for reading more data are (one of):
  // - Not enough data buffered (state.length < state.highWaterMark). The loop
  //   is responsible for filling the buffer with enough data if such data
  //   is available. If highWaterMark is 0 and we are not in the flowing mode
  //   we should _not_ attempt to buffer any extra data. We'll get more data
  //   when the stream consumer calls read() instead.
  // - No data in the buffer, and the stream is in flowing mode. In this mode
  //   the loop below is responsible for ensuring read() is called. Failing to
  //   call read here would abort the flow and there's no other mechanism for
  //   continuing the flow if the stream consumer has just subscribed to the
  //   'data' event.
  //
  // In addition to the above conditions to keep reading data, the following
  // conditions prevent the data from being read:
  // - The stream has ended (state.ended).
  // - There is already a pending 'read' operation (state.reading). This is a
  //   case where the the stream has called the implementation defined _read()
  //   method, but they are processing the call asynchronously and have _not_
  //   called push() with new data. In this case we skip performing more
  //   read()s. The execution ends in this method again after the _read() ends
  //   up calling push() with more data.
  while (!state.reading && !state.ended && (state.length < state.highWaterMark || state.flowing && state.length === 0)) {
    var len = state.length;
    debug('maybeReadMore read 0');
    stream.read(0);
    if (len === state.length)
      // didn't get any data, stop spinning.
      break;
  }
  state.readingMore = false;
}

// abstract method.  to be overridden in specific implementation classes.
// call cb(er, data) where data is <= n in length.
// for virtual (non-string, non-buffer) streams, "length" is somewhat
// arbitrary, and perhaps not very meaningful.
Readable.prototype._read = function (n) {
  errorOrDestroy(this, new ERR_METHOD_NOT_IMPLEMENTED('_read()'));
};
Readable.prototype.pipe = function (dest, pipeOpts) {
  var src = this;
  var state = this._readableState;
  switch (state.pipesCount) {
    case 0:
      state.pipes = dest;
      break;
    case 1:
      state.pipes = [state.pipes, dest];
      break;
    default:
      state.pipes.push(dest);
      break;
  }
  state.pipesCount += 1;
  debug('pipe count=%d opts=%j', state.pipesCount, pipeOpts);
  var doEnd = (!pipeOpts || pipeOpts.end !== false) && dest !== process.stdout && dest !== process.stderr;
  var endFn = doEnd ? onend : unpipe;
  if (state.endEmitted) process.nextTick(endFn);else src.once('end', endFn);
  dest.on('unpipe', onunpipe);
  function onunpipe(readable, unpipeInfo) {
    debug('onunpipe');
    if (readable === src) {
      if (unpipeInfo && unpipeInfo.hasUnpiped === false) {
        unpipeInfo.hasUnpiped = true;
        cleanup();
      }
    }
  }
  function onend() {
    debug('onend');
    dest.end();
  }

  // when the dest drains, it reduces the awaitDrain counter
  // on the source.  This would be more elegant with a .once()
  // handler in flow(), but adding and removing repeatedly is
  // too slow.
  var ondrain = pipeOnDrain(src);
  dest.on('drain', ondrain);
  var cleanedUp = false;
  function cleanup() {
    debug('cleanup');
    // cleanup event handlers once the pipe is broken
    dest.removeListener('close', onclose);
    dest.removeListener('finish', onfinish);
    dest.removeListener('drain', ondrain);
    dest.removeListener('error', onerror);
    dest.removeListener('unpipe', onunpipe);
    src.removeListener('end', onend);
    src.removeListener('end', unpipe);
    src.removeListener('data', ondata);
    cleanedUp = true;

    // if the reader is waiting for a drain event from this
    // specific writer, then it would cause it to never start
    // flowing again.
    // So, if this is awaiting a drain, then we just call it now.
    // If we don't know, then assume that we are waiting for one.
    if (state.awaitDrain && (!dest._writableState || dest._writableState.needDrain)) ondrain();
  }
  src.on('data', ondata);
  function ondata(chunk) {
    debug('ondata');
    var ret = dest.write(chunk);
    debug('dest.write', ret);
    if (ret === false) {
      // If the user unpiped during `dest.write()`, it is possible
      // to get stuck in a permanently paused state if that write
      // also returned false.
      // => Check whether `dest` is still a piping destination.
      if ((state.pipesCount === 1 && state.pipes === dest || state.pipesCount > 1 && indexOf(state.pipes, dest) !== -1) && !cleanedUp) {
        debug('false write response, pause', state.awaitDrain);
        state.awaitDrain++;
      }
      src.pause();
    }
  }

  // if the dest has an error, then stop piping into it.
  // however, don't suppress the throwing behavior for this.
  function onerror(er) {
    debug('onerror', er);
    unpipe();
    dest.removeListener('error', onerror);
    if (EElistenerCount(dest, 'error') === 0) errorOrDestroy(dest, er);
  }

  // Make sure our error handler is attached before userland ones.
  prependListener(dest, 'error', onerror);

  // Both close and finish should trigger unpipe, but only once.
  function onclose() {
    dest.removeListener('finish', onfinish);
    unpipe();
  }
  dest.once('close', onclose);
  function onfinish() {
    debug('onfinish');
    dest.removeListener('close', onclose);
    unpipe();
  }
  dest.once('finish', onfinish);
  function unpipe() {
    debug('unpipe');
    src.unpipe(dest);
  }

  // tell the dest that it's being piped to
  dest.emit('pipe', src);

  // start the flow if it hasn't been started already.
  if (!state.flowing) {
    debug('pipe resume');
    src.resume();
  }
  return dest;
};
function pipeOnDrain(src) {
  return function pipeOnDrainFunctionResult() {
    var state = src._readableState;
    debug('pipeOnDrain', state.awaitDrain);
    if (state.awaitDrain) state.awaitDrain--;
    if (state.awaitDrain === 0 && EElistenerCount(src, 'data')) {
      state.flowing = true;
      flow(src);
    }
  };
}
Readable.prototype.unpipe = function (dest) {
  var state = this._readableState;
  var unpipeInfo = {
    hasUnpiped: false
  };

  // if we're not piping anywhere, then do nothing.
  if (state.pipesCount === 0) return this;

  // just one destination.  most common case.
  if (state.pipesCount === 1) {
    // passed in one, but it's not the right one.
    if (dest && dest !== state.pipes) return this;
    if (!dest) dest = state.pipes;

    // got a match.
    state.pipes = null;
    state.pipesCount = 0;
    state.flowing = false;
    if (dest) dest.emit('unpipe', this, unpipeInfo);
    return this;
  }

  // slow case. multiple pipe destinations.

  if (!dest) {
    // remove all.
    var dests = state.pipes;
    var len = state.pipesCount;
    state.pipes = null;
    state.pipesCount = 0;
    state.flowing = false;
    for (var i = 0; i < len; i++) dests[i].emit('unpipe', this, {
      hasUnpiped: false
    });
    return this;
  }

  // try to find the right one.
  var index = indexOf(state.pipes, dest);
  if (index === -1) return this;
  state.pipes.splice(index, 1);
  state.pipesCount -= 1;
  if (state.pipesCount === 1) state.pipes = state.pipes[0];
  dest.emit('unpipe', this, unpipeInfo);
  return this;
};

// set up data events if they are asked for
// Ensure readable listeners eventually get something
Readable.prototype.on = function (ev, fn) {
  var res = Stream.prototype.on.call(this, ev, fn);
  var state = this._readableState;
  if (ev === 'data') {
    // update readableListening so that resume() may be a no-op
    // a few lines down. This is needed to support once('readable').
    state.readableListening = this.listenerCount('readable') > 0;

    // Try start flowing on next tick if stream isn't explicitly paused
    if (state.flowing !== false) this.resume();
  } else if (ev === 'readable') {
    if (!state.endEmitted && !state.readableListening) {
      state.readableListening = state.needReadable = true;
      state.flowing = false;
      state.emittedReadable = false;
      debug('on readable', state.length, state.reading);
      if (state.length) {
        emitReadable(this);
      } else if (!state.reading) {
        process.nextTick(nReadingNextTick, this);
      }
    }
  }
  return res;
};
Readable.prototype.addListener = Readable.prototype.on;
Readable.prototype.removeListener = function (ev, fn) {
  var res = Stream.prototype.removeListener.call(this, ev, fn);
  if (ev === 'readable') {
    // We need to check if there is someone still listening to
    // readable and reset the state. However this needs to happen
    // after readable has been emitted but before I/O (nextTick) to
    // support once('readable', fn) cycles. This means that calling
    // resume within the same tick will have no
    // effect.
    process.nextTick(updateReadableListening, this);
  }
  return res;
};
Readable.prototype.removeAllListeners = function (ev) {
  var res = Stream.prototype.removeAllListeners.apply(this, arguments);
  if (ev === 'readable' || ev === undefined) {
    // We need to check if there is someone still listening to
    // readable and reset the state. However this needs to happen
    // after readable has been emitted but before I/O (nextTick) to
    // support once('readable', fn) cycles. This means that calling
    // resume within the same tick will have no
    // effect.
    process.nextTick(updateReadableListening, this);
  }
  return res;
};
function updateReadableListening(self) {
  var state = self._readableState;
  state.readableListening = self.listenerCount('readable') > 0;
  if (state.resumeScheduled && !state.paused) {
    // flowing needs to be set to true now, otherwise
    // the upcoming resume will not flow.
    state.flowing = true;

    // crude way to check if we should resume
  } else if (self.listenerCount('data') > 0) {
    self.resume();
  }
}
function nReadingNextTick(self) {
  debug('readable nexttick read 0');
  self.read(0);
}

// pause() and resume() are remnants of the legacy readable stream API
// If the user uses them, then switch into old mode.
Readable.prototype.resume = function () {
  var state = this._readableState;
  if (!state.flowing) {
    debug('resume');
    // we flow only if there is no one listening
    // for readable, but we still have to call
    // resume()
    state.flowing = !state.readableListening;
    resume(this, state);
  }
  state.paused = false;
  return this;
};
function resume(stream, state) {
  if (!state.resumeScheduled) {
    state.resumeScheduled = true;
    process.nextTick(resume_, stream, state);
  }
}
function resume_(stream, state) {
  debug('resume', state.reading);
  if (!state.reading) {
    stream.read(0);
  }
  state.resumeScheduled = false;
  stream.emit('resume');
  flow(stream);
  if (state.flowing && !state.reading) stream.read(0);
}
Readable.prototype.pause = function () {
  debug('call pause flowing=%j', this._readableState.flowing);
  if (this._readableState.flowing !== false) {
    debug('pause');
    this._readableState.flowing = false;
    this.emit('pause');
  }
  this._readableState.paused = true;
  return this;
};
function flow(stream) {
  var state = stream._readableState;
  debug('flow', state.flowing);
  while (state.flowing && stream.read() !== null);
}

// wrap an old-style stream as the async data source.
// This is *not* part of the readable stream interface.
// It is an ugly unfortunate mess of history.
Readable.prototype.wrap = function (stream) {
  var _this = this;
  var state = this._readableState;
  var paused = false;
  stream.on('end', function () {
    debug('wrapped end');
    if (state.decoder && !state.ended) {
      var chunk = state.decoder.end();
      if (chunk && chunk.length) _this.push(chunk);
    }
    _this.push(null);
  });
  stream.on('data', function (chunk) {
    debug('wrapped data');
    if (state.decoder) chunk = state.decoder.write(chunk);

    // don't skip over falsy values in objectMode
    if (state.objectMode && (chunk === null || chunk === undefined)) return;else if (!state.objectMode && (!chunk || !chunk.length)) return;
    var ret = _this.push(chunk);
    if (!ret) {
      paused = true;
      stream.pause();
    }
  });

  // proxy all the other methods.
  // important when wrapping filters and duplexes.
  for (var i in stream) {
    if (this[i] === undefined && typeof stream[i] === 'function') {
      this[i] = function methodWrap(method) {
        return function methodWrapReturnFunction() {
          return stream[method].apply(stream, arguments);
        };
      }(i);
    }
  }

  // proxy certain important events.
  for (var n = 0; n < kProxyEvents.length; n++) {
    stream.on(kProxyEvents[n], this.emit.bind(this, kProxyEvents[n]));
  }

  // when we try to consume some more bytes, simply unpause the
  // underlying stream.
  this._read = function (n) {
    debug('wrapped _read', n);
    if (paused) {
      paused = false;
      stream.resume();
    }
  };
  return this;
};
if (typeof Symbol === 'function') {
  Readable.prototype[Symbol.asyncIterator] = function () {
    if (createReadableStreamAsyncIterator === undefined) {
      createReadableStreamAsyncIterator = __nccwpck_require__(3306);
    }
    return createReadableStreamAsyncIterator(this);
  };
}
Object.defineProperty(Readable.prototype, 'readableHighWaterMark', {
  // making it explicit this property is not enumerable
  // because otherwise some prototype manipulation in
  // userland will fail
  enumerable: false,
  get: function get() {
    return this._readableState.highWaterMark;
  }
});
Object.defineProperty(Readable.prototype, 'readableBuffer', {
  // making it explicit this property is not enumerable
  // because otherwise some prototype manipulation in
  // userland will fail
  enumerable: false,
  get: function get() {
    return this._readableState && this._readableState.buffer;
  }
});
Object.defineProperty(Readable.prototype, 'readableFlowing', {
  // making it explicit this property is not enumerable
  // because otherwise some prototype manipulation in
  // userland will fail
  enumerable: false,
  get: function get() {
    return this._readableState.flowing;
  },
  set: function set(state) {
    if (this._readableState) {
      this._readableState.flowing = state;
    }
  }
});

// exposed for testing purposes only.
Readable._fromList = fromList;
Object.defineProperty(Readable.prototype, 'readableLength', {
  // making it explicit this property is not enumerable
  // because otherwise some prototype manipulation in
  // userland will fail
  enumerable: false,
  get: function get() {
    return this._readableState.length;
  }
});

// Pluck off n bytes from an array of buffers.
// Length is the combined lengths of all the buffers in the list.
// This function is designed to be inlinable, so please take care when making
// changes to the function body.
function fromList(n, state) {
  // nothing buffered
  if (state.length === 0) return null;
  var ret;
  if (state.objectMode) ret = state.buffer.shift();else if (!n || n >= state.length) {
    // read it all, truncate the list
    if (state.decoder) ret = state.buffer.join('');else if (state.buffer.length === 1) ret = state.buffer.first();else ret = state.buffer.concat(state.length);
    state.buffer.clear();
  } else {
    // read part of list
    ret = state.buffer.consume(n, state.decoder);
  }
  return ret;
}
function endReadable(stream) {
  var state = stream._readableState;
  debug('endReadable', state.endEmitted);
  if (!state.endEmitted) {
    state.ended = true;
    process.nextTick(endReadableNT, state, stream);
  }
}
function endReadableNT(state, stream) {
  debug('endReadableNT', state.endEmitted, state.length);

  // Check that we didn't get one last unshift.
  if (!state.endEmitted && state.length === 0) {
    state.endEmitted = true;
    stream.readable = false;
    stream.emit('end');
    if (state.autoDestroy) {
      // In case of duplex streams we need a way to detect
      // if the writable side is ready for autoDestroy as well
      var wState = stream._writableState;
      if (!wState || wState.autoDestroy && wState.finished) {
        stream.destroy();
      }
    }
  }
}
if (typeof Symbol === 'function') {
  Readable.from = function (iterable, opts) {
    if (from === undefined) {
      from = __nccwpck_require__(9082);
    }
    return from(Readable, iterable, opts);
  };
}
function indexOf(xs, x) {
  for (var i = 0, l = xs.length; i < l; i++) {
    if (xs[i] === x) return i;
  }
  return -1;
}

/***/ }),

/***/ 4415:
/***/ ((module, __unused_webpack_exports, __nccwpck_require__) => {

"use strict";
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

// a transform stream is a readable/writable stream where you do
// something with the data.  Sometimes it's called a "filter",
// but that's not a great name for it, since that implies a thing where
// some bits pass through, and others are simply ignored.  (That would
// be a valid example of a transform, of course.)
//
// While the output is causally related to the input, it's not a
// necessarily symmetric or synchronous transformation.  For example,
// a zlib stream might take multiple plain-text writes(), and then
// emit a single compressed chunk some time in the future.
//
// Here's how this works:
//
// The Transform stream has all the aspects of the readable and writable
// stream classes.  When you write(chunk), that calls _write(chunk,cb)
// internally, and returns false if there's a lot of pending writes
// buffered up.  When you call read(), that calls _read(n) until
// there's enough pending readable data buffered up.
//
// In a transform stream, the written data is placed in a buffer.  When
// _read(n) is called, it transforms the queued up data, calling the
// buffered _write cb's as it consumes chunks.  If consuming a single
// written chunk would result in multiple output chunks, then the first
// outputted bit calls the readcb, and subsequent chunks just go into
// the read buffer, and will cause it to emit 'readable' if necessary.
//
// This way, back-pressure is actually determined by the reading side,
// since _read has to be called to start processing a new chunk.  However,
// a pathological inflate type of transform can cause excessive buffering
// here.  For example, imagine a stream where every byte of input is
// interpreted as an integer from 0-255, and then results in that many
// bytes of output.  Writing the 4 bytes {ff,ff,ff,ff} would result in
// 1kb of data being output.  In this case, you could write a very small
// amount of input, and end up with a very large amount of output.  In
// such a pathological inflating mechanism, there'd be no way to tell
// the system to stop doing the transform.  A single 4MB write could
// cause the system to run out of memory.
//
// However, even in such a pathological case, only a single written chunk
// would be consumed, and then the rest would wait (un-transformed) until
// the results of the previous transformed chunk were consumed.



module.exports = Transform;
var _require$codes = (__nccwpck_require__(7214)/* .codes */ .q),
  ERR_METHOD_NOT_IMPLEMENTED = _require$codes.ERR_METHOD_NOT_IMPLEMENTED,
  ERR_MULTIPLE_CALLBACK = _require$codes.ERR_MULTIPLE_CALLBACK,
  ERR_TRANSFORM_ALREADY_TRANSFORMING = _require$codes.ERR_TRANSFORM_ALREADY_TRANSFORMING,
  ERR_TRANSFORM_WITH_LENGTH_0 = _require$codes.ERR_TRANSFORM_WITH_LENGTH_0;
var Duplex = __nccwpck_require__(1359);
__nccwpck_require__(4124)(Transform, Duplex);
function afterTransform(er, data) {
  var ts = this._transformState;
  ts.transforming = false;
  var cb = ts.writecb;
  if (cb === null) {
    return this.emit('error', new ERR_MULTIPLE_CALLBACK());
  }
  ts.writechunk = null;
  ts.writecb = null;
  if (data != null)
    // single equals check for both `null` and `undefined`
    this.push(data);
  cb(er);
  var rs = this._readableState;
  rs.reading = false;
  if (rs.needReadable || rs.length < rs.highWaterMark) {
    this._read(rs.highWaterMark);
  }
}
function Transform(options) {
  if (!(this instanceof Transform)) return new Transform(options);
  Duplex.call(this, options);
  this._transformState = {
    afterTransform: afterTransform.bind(this),
    needTransform: false,
    transforming: false,
    writecb: null,
    writechunk: null,
    writeencoding: null
  };

  // start out asking for a readable event once data is transformed.
  this._readableState.needReadable = true;

  // we have implemented the _read method, and done the other things
  // that Readable wants before the first _read call, so unset the
  // sync guard flag.
  this._readableState.sync = false;
  if (options) {
    if (typeof options.transform === 'function') this._transform = options.transform;
    if (typeof options.flush === 'function') this._flush = options.flush;
  }

  // When the writable side finishes, then flush out anything remaining.
  this.on('prefinish', prefinish);
}
function prefinish() {
  var _this = this;
  if (typeof this._flush === 'function' && !this._readableState.destroyed) {
    this._flush(function (er, data) {
      done(_this, er, data);
    });
  } else {
    done(this, null, null);
  }
}
Transform.prototype.push = function (chunk, encoding) {
  this._transformState.needTransform = false;
  return Duplex.prototype.push.call(this, chunk, encoding);
};

// This is the part where you do stuff!
// override this function in implementation classes.
// 'chunk' is an input chunk.
//
// Call `push(newChunk)` to pass along transformed output
// to the readable side.  You may call 'push' zero or more times.
//
// Call `cb(err)` when you are done with this chunk.  If you pass
// an error, then that'll put the hurt on the whole operation.  If you
// never call cb(), then you'll never get another chunk.
Transform.prototype._transform = function (chunk, encoding, cb) {
  cb(new ERR_METHOD_NOT_IMPLEMENTED('_transform()'));
};
Transform.prototype._write = function (chunk, encoding, cb) {
  var ts = this._transformState;
  ts.writecb = cb;
  ts.writechunk = chunk;
  ts.writeencoding = encoding;
  if (!ts.transforming) {
    var rs = this._readableState;
    if (ts.needTransform || rs.needReadable || rs.length < rs.highWaterMark) this._read(rs.highWaterMark);
  }
};

// Doesn't matter what the args are here.
// _transform does all the work.
// That we got here means that the readable side wants more data.
Transform.prototype._read = function (n) {
  var ts = this._transformState;
  if (ts.writechunk !== null && !ts.transforming) {
    ts.transforming = true;
    this._transform(ts.writechunk, ts.writeencoding, ts.afterTransform);
  } else {
    // mark that we need a transform, so that any data that comes in
    // will get processed, now that we've asked for it.
    ts.needTransform = true;
  }
};
Transform.prototype._destroy = function (err, cb) {
  Duplex.prototype._destroy.call(this, err, function (err2) {
    cb(err2);
  });
};
function done(stream, er, data) {
  if (er) return stream.emit('error', er);
  if (data != null)
    // single equals check for both `null` and `undefined`
    stream.push(data);

  // TODO(BridgeAR): Write a test for these two error cases
  // if there's nothing in the write buffer, then that means
  // that nothing more will ever be provided
  if (stream._writableState.length) throw new ERR_TRANSFORM_WITH_LENGTH_0();
  if (stream._transformState.transforming) throw new ERR_TRANSFORM_ALREADY_TRANSFORMING();
  return stream.push(null);
}

/***/ }),

/***/ 6993:
/***/ ((module, __unused_webpack_exports, __nccwpck_require__) => {

"use strict";
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

// A bit simpler than readable streams.
// Implement an async ._write(chunk, encoding, cb), and it'll handle all
// the drain event emission and buffering.



module.exports = Writable;

/* <replacement> */
function WriteReq(chunk, encoding, cb) {
  this.chunk = chunk;
  this.encoding = encoding;
  this.callback = cb;
  this.next = null;
}

// It seems a linked list but it is not
// there will be only 2 of these for each stream
function CorkedRequest(state) {
  var _this = this;
  this.next = null;
  this.entry = null;
  this.finish = function () {
    onCorkedFinish(_this, state);
  };
}
/* </replacement> */

/*<replacement>*/
var Duplex;
/*</replacement>*/

Writable.WritableState = WritableState;

/*<replacement>*/
var internalUtil = {
  deprecate: __nccwpck_require__(5278)
};
/*</replacement>*/

/*<replacement>*/
var Stream = __nccwpck_require__(2387);
/*</replacement>*/

var Buffer = (__nccwpck_require__(4300).Buffer);
var OurUint8Array = (typeof global !== 'undefined' ? global : typeof window !== 'undefined' ? window : typeof self !== 'undefined' ? self : {}).Uint8Array || function () {};
function _uint8ArrayToBuffer(chunk) {
  return Buffer.from(chunk);
}
function _isUint8Array(obj) {
  return Buffer.isBuffer(obj) || obj instanceof OurUint8Array;
}
var destroyImpl = __nccwpck_require__(7049);
var _require = __nccwpck_require__(9948),
  getHighWaterMark = _require.getHighWaterMark;
var _require$codes = (__nccwpck_require__(7214)/* .codes */ .q),
  ERR_INVALID_ARG_TYPE = _require$codes.ERR_INVALID_ARG_TYPE,
  ERR_METHOD_NOT_IMPLEMENTED = _require$codes.ERR_METHOD_NOT_IMPLEMENTED,
  ERR_MULTIPLE_CALLBACK = _require$codes.ERR_MULTIPLE_CALLBACK,
  ERR_STREAM_CANNOT_PIPE = _require$codes.ERR_STREAM_CANNOT_PIPE,
  ERR_STREAM_DESTROYED = _require$codes.ERR_STREAM_DESTROYED,
  ERR_STREAM_NULL_VALUES = _require$codes.ERR_STREAM_NULL_VALUES,
  ERR_STREAM_WRITE_AFTER_END = _require$codes.ERR_STREAM_WRITE_AFTER_END,
  ERR_UNKNOWN_ENCODING = _require$codes.ERR_UNKNOWN_ENCODING;
var errorOrDestroy = destroyImpl.errorOrDestroy;
__nccwpck_require__(4124)(Writable, Stream);
function nop() {}
function WritableState(options, stream, isDuplex) {
  Duplex = Duplex || __nccwpck_require__(1359);
  options = options || {};

  // Duplex streams are both readable and writable, but share
  // the same options object.
  // However, some cases require setting options to different
  // values for the readable and the writable sides of the duplex stream,
  // e.g. options.readableObjectMode vs. options.writableObjectMode, etc.
  if (typeof isDuplex !== 'boolean') isDuplex = stream instanceof Duplex;

  // object stream flag to indicate whether or not this stream
  // contains buffers or objects.
  this.objectMode = !!options.objectMode;
  if (isDuplex) this.objectMode = this.objectMode || !!options.writableObjectMode;

  // the point at which write() starts returning false
  // Note: 0 is a valid value, means that we always return false if
  // the entire buffer is not flushed immediately on write()
  this.highWaterMark = getHighWaterMark(this, options, 'writableHighWaterMark', isDuplex);

  // if _final has been called
  this.finalCalled = false;

  // drain event flag.
  this.needDrain = false;
  // at the start of calling end()
  this.ending = false;
  // when end() has been called, and returned
  this.ended = false;
  // when 'finish' is emitted
  this.finished = false;

  // has it been destroyed
  this.destroyed = false;

  // should we decode strings into buffers before passing to _write?
  // this is here so that some node-core streams can optimize string
  // handling at a lower level.
  var noDecode = options.decodeStrings === false;
  this.decodeStrings = !noDecode;

  // Crypto is kind of old and crusty.  Historically, its default string
  // encoding is 'binary' so we have to make this configurable.
  // Everything else in the universe uses 'utf8', though.
  this.defaultEncoding = options.defaultEncoding || 'utf8';

  // not an actual buffer we keep track of, but a measurement
  // of how much we're waiting to get pushed to some underlying
  // socket or file.
  this.length = 0;

  // a flag to see when we're in the middle of a write.
  this.writing = false;

  // when true all writes will be buffered until .uncork() call
  this.corked = 0;

  // a flag to be able to tell if the onwrite cb is called immediately,
  // or on a later tick.  We set this to true at first, because any
  // actions that shouldn't happen until "later" should generally also
  // not happen before the first write call.
  this.sync = true;

  // a flag to know if we're processing previously buffered items, which
  // may call the _write() callback in the same tick, so that we don't
  // end up in an overlapped onwrite situation.
  this.bufferProcessing = false;

  // the callback that's passed to _write(chunk,cb)
  this.onwrite = function (er) {
    onwrite(stream, er);
  };

  // the callback that the user supplies to write(chunk,encoding,cb)
  this.writecb = null;

  // the amount that is being written when _write is called.
  this.writelen = 0;
  this.bufferedRequest = null;
  this.lastBufferedRequest = null;

  // number of pending user-supplied write callbacks
  // this must be 0 before 'finish' can be emitted
  this.pendingcb = 0;

  // emit prefinish if the only thing we're waiting for is _write cbs
  // This is relevant for synchronous Transform streams
  this.prefinished = false;

  // True if the error was already emitted and should not be thrown again
  this.errorEmitted = false;

  // Should close be emitted on destroy. Defaults to true.
  this.emitClose = options.emitClose !== false;

  // Should .destroy() be called after 'finish' (and potentially 'end')
  this.autoDestroy = !!options.autoDestroy;

  // count buffered requests
  this.bufferedRequestCount = 0;

  // allocate the first CorkedRequest, there is always
  // one allocated and free to use, and we maintain at most two
  this.corkedRequestsFree = new CorkedRequest(this);
}
WritableState.prototype.getBuffer = function getBuffer() {
  var current = this.bufferedRequest;
  var out = [];
  while (current) {
    out.push(current);
    current = current.next;
  }
  return out;
};
(function () {
  try {
    Object.defineProperty(WritableState.prototype, 'buffer', {
      get: internalUtil.deprecate(function writableStateBufferGetter() {
        return this.getBuffer();
      }, '_writableState.buffer is deprecated. Use _writableState.getBuffer ' + 'instead.', 'DEP0003')
    });
  } catch (_) {}
})();

// Test _writableState for inheritance to account for Duplex streams,
// whose prototype chain only points to Readable.
var realHasInstance;
if (typeof Symbol === 'function' && Symbol.hasInstance && typeof Function.prototype[Symbol.hasInstance] === 'function') {
  realHasInstance = Function.prototype[Symbol.hasInstance];
  Object.defineProperty(Writable, Symbol.hasInstance, {
    value: function value(object) {
      if (realHasInstance.call(this, object)) return true;
      if (this !== Writable) return false;
      return object && object._writableState instanceof WritableState;
    }
  });
} else {
  realHasInstance = function realHasInstance(object) {
    return object instanceof this;
  };
}
function Writable(options) {
  Duplex = Duplex || __nccwpck_require__(1359);

  // Writable ctor is applied to Duplexes, too.
  // `realHasInstance` is necessary because using plain `instanceof`
  // would return false, as no `_writableState` property is attached.

  // Trying to use the custom `instanceof` for Writable here will also break the
  // Node.js LazyTransform implementation, which has a non-trivial getter for
  // `_writableState` that would lead to infinite recursion.

  // Checking for a Stream.Duplex instance is faster here instead of inside
  // the WritableState constructor, at least with V8 6.5
  var isDuplex = this instanceof Duplex;
  if (!isDuplex && !realHasInstance.call(Writable, this)) return new Writable(options);
  this._writableState = new WritableState(options, this, isDuplex);

  // legacy.
  this.writable = true;
  if (options) {
    if (typeof options.write === 'function') this._write = options.write;
    if (typeof options.writev === 'function') this._writev = options.writev;
    if (typeof options.destroy === 'function') this._destroy = options.destroy;
    if (typeof options.final === 'function') this._final = options.final;
  }
  Stream.call(this);
}

// Otherwise people can pipe Writable streams, which is just wrong.
Writable.prototype.pipe = function () {
  errorOrDestroy(this, new ERR_STREAM_CANNOT_PIPE());
};
function writeAfterEnd(stream, cb) {
  var er = new ERR_STREAM_WRITE_AFTER_END();
  // TODO: defer error events consistently everywhere, not just the cb
  errorOrDestroy(stream, er);
  process.nextTick(cb, er);
}

// Checks that a user-supplied chunk is valid, especially for the particular
// mode the stream is in. Currently this means that `null` is never accepted
// and undefined/non-string values are only allowed in object mode.
function validChunk(stream, state, chunk, cb) {
  var er;
  if (chunk === null) {
    er = new ERR_STREAM_NULL_VALUES();
  } else if (typeof chunk !== 'string' && !state.objectMode) {
    er = new ERR_INVALID_ARG_TYPE('chunk', ['string', 'Buffer'], chunk);
  }
  if (er) {
    errorOrDestroy(stream, er);
    process.nextTick(cb, er);
    return false;
  }
  return true;
}
Writable.prototype.write = function (chunk, encoding, cb) {
  var state = this._writableState;
  var ret = false;
  var isBuf = !state.objectMode && _isUint8Array(chunk);
  if (isBuf && !Buffer.isBuffer(chunk)) {
    chunk = _uint8ArrayToBuffer(chunk);
  }
  if (typeof encoding === 'function') {
    cb = encoding;
    encoding = null;
  }
  if (isBuf) encoding = 'buffer';else if (!encoding) encoding = state.defaultEncoding;
  if (typeof cb !== 'function') cb = nop;
  if (state.ending) writeAfterEnd(this, cb);else if (isBuf || validChunk(this, state, chunk, cb)) {
    state.pendingcb++;
    ret = writeOrBuffer(this, state, isBuf, chunk, encoding, cb);
  }
  return ret;
};
Writable.prototype.cork = function () {
  this._writableState.corked++;
};
Writable.prototype.uncork = function () {
  var state = this._writableState;
  if (state.corked) {
    state.corked--;
    if (!state.writing && !state.corked && !state.bufferProcessing && state.bufferedRequest) clearBuffer(this, state);
  }
};
Writable.prototype.setDefaultEncoding = function setDefaultEncoding(encoding) {
  // node::ParseEncoding() requires lower case.
  if (typeof encoding === 'string') encoding = encoding.toLowerCase();
  if (!(['hex', 'utf8', 'utf-8', 'ascii', 'binary', 'base64', 'ucs2', 'ucs-2', 'utf16le', 'utf-16le', 'raw'].indexOf((encoding + '').toLowerCase()) > -1)) throw new ERR_UNKNOWN_ENCODING(encoding);
  this._writableState.defaultEncoding = encoding;
  return this;
};
Object.defineProperty(Writable.prototype, 'writableBuffer', {
  // making it explicit this property is not enumerable
  // because otherwise some prototype manipulation in
  // userland will fail
  enumerable: false,
  get: function get() {
    return this._writableState && this._writableState.getBuffer();
  }
});
function decodeChunk(state, chunk, encoding) {
  if (!state.objectMode && state.decodeStrings !== false && typeof chunk === 'string') {
    chunk = Buffer.from(chunk, encoding);
  }
  return chunk;
}
Object.defineProperty(Writable.prototype, 'writableHighWaterMark', {
  // making it explicit this property is not enumerable
  // because otherwise some prototype manipulation in
  // userland will fail
  enumerable: false,
  get: function get() {
    return this._writableState.highWaterMark;
  }
});

// if we're already writing something, then just put this
// in the queue, and wait our turn.  Otherwise, call _write
// If we return false, then we need a drain event, so set that flag.
function writeOrBuffer(stream, state, isBuf, chunk, encoding, cb) {
  if (!isBuf) {
    var newChunk = decodeChunk(state, chunk, encoding);
    if (chunk !== newChunk) {
      isBuf = true;
      encoding = 'buffer';
      chunk = newChunk;
    }
  }
  var len = state.objectMode ? 1 : chunk.length;
  state.length += len;
  var ret = state.length < state.highWaterMark;
  // we must ensure that previous needDrain will not be reset to false.
  if (!ret) state.needDrain = true;
  if (state.writing || state.corked) {
    var last = state.lastBufferedRequest;
    state.lastBufferedRequest = {
      chunk: chunk,
      encoding: encoding,
      isBuf: isBuf,
      callback: cb,
      next: null
    };
    if (last) {
      last.next = state.lastBufferedRequest;
    } else {
      state.bufferedRequest = state.lastBufferedRequest;
    }
    state.bufferedRequestCount += 1;
  } else {
    doWrite(stream, state, false, len, chunk, encoding, cb);
  }
  return ret;
}
function doWrite(stream, state, writev, len, chunk, encoding, cb) {
  state.writelen = len;
  state.writecb = cb;
  state.writing = true;
  state.sync = true;
  if (state.destroyed) state.onwrite(new ERR_STREAM_DESTROYED('write'));else if (writev) stream._writev(chunk, state.onwrite);else stream._write(chunk, encoding, state.onwrite);
  state.sync = false;
}
function onwriteError(stream, state, sync, er, cb) {
  --state.pendingcb;
  if (sync) {
    // defer the callback if we are being called synchronously
    // to avoid piling up things on the stack
    process.nextTick(cb, er);
    // this can emit finish, and it will always happen
    // after error
    process.nextTick(finishMaybe, stream, state);
    stream._writableState.errorEmitted = true;
    errorOrDestroy(stream, er);
  } else {
    // the caller expect this to happen before if
    // it is async
    cb(er);
    stream._writableState.errorEmitted = true;
    errorOrDestroy(stream, er);
    // this can emit finish, but finish must
    // always follow error
    finishMaybe(stream, state);
  }
}
function onwriteStateUpdate(state) {
  state.writing = false;
  state.writecb = null;
  state.length -= state.writelen;
  state.writelen = 0;
}
function onwrite(stream, er) {
  var state = stream._writableState;
  var sync = state.sync;
  var cb = state.writecb;
  if (typeof cb !== 'function') throw new ERR_MULTIPLE_CALLBACK();
  onwriteStateUpdate(state);
  if (er) onwriteError(stream, state, sync, er, cb);else {
    // Check if we're actually ready to finish, but don't emit yet
    var finished = needFinish(state) || stream.destroyed;
    if (!finished && !state.corked && !state.bufferProcessing && state.bufferedRequest) {
      clearBuffer(stream, state);
    }
    if (sync) {
      process.nextTick(afterWrite, stream, state, finished, cb);
    } else {
      afterWrite(stream, state, finished, cb);
    }
  }
}
function afterWrite(stream, state, finished, cb) {
  if (!finished) onwriteDrain(stream, state);
  state.pendingcb--;
  cb();
  finishMaybe(stream, state);
}

// Must force callback to be called on nextTick, so that we don't
// emit 'drain' before the write() consumer gets the 'false' return
// value, and has a chance to attach a 'drain' listener.
function onwriteDrain(stream, state) {
  if (state.length === 0 && state.needDrain) {
    state.needDrain = false;
    stream.emit('drain');
  }
}

// if there's something in the buffer waiting, then process it
function clearBuffer(stream, state) {
  state.bufferProcessing = true;
  var entry = state.bufferedRequest;
  if (stream._writev && entry && entry.next) {
    // Fast case, write everything using _writev()
    var l = state.bufferedRequestCount;
    var buffer = new Array(l);
    var holder = state.corkedRequestsFree;
    holder.entry = entry;
    var count = 0;
    var allBuffers = true;
    while (entry) {
      buffer[count] = entry;
      if (!entry.isBuf) allBuffers = false;
      entry = entry.next;
      count += 1;
    }
    buffer.allBuffers = allBuffers;
    doWrite(stream, state, true, state.length, buffer, '', holder.finish);

    // doWrite is almost always async, defer these to save a bit of time
    // as the hot path ends with doWrite
    state.pendingcb++;
    state.lastBufferedRequest = null;
    if (holder.next) {
      state.corkedRequestsFree = holder.next;
      holder.next = null;
    } else {
      state.corkedRequestsFree = new CorkedRequest(state);
    }
    state.bufferedRequestCount = 0;
  } else {
    // Slow case, write chunks one-by-one
    while (entry) {
      var chunk = entry.chunk;
      var encoding = entry.encoding;
      var cb = entry.callback;
      var len = state.objectMode ? 1 : chunk.length;
      doWrite(stream, state, false, len, chunk, encoding, cb);
      entry = entry.next;
      state.bufferedRequestCount--;
      // if we didn't call the onwrite immediately, then
      // it means that we need to wait until it does.
      // also, that means that the chunk and cb are currently
      // being processed, so move the buffer counter past them.
      if (state.writing) {
        break;
      }
    }
    if (entry === null) state.lastBufferedRequest = null;
  }
  state.bufferedRequest = entry;
  state.bufferProcessing = false;
}
Writable.prototype._write = function (chunk, encoding, cb) {
  cb(new ERR_METHOD_NOT_IMPLEMENTED('_write()'));
};
Writable.prototype._writev = null;
Writable.prototype.end = function (chunk, encoding, cb) {
  var state = this._writableState;
  if (typeof chunk === 'function') {
    cb = chunk;
    chunk = null;
    encoding = null;
  } else if (typeof encoding === 'function') {
    cb = encoding;
    encoding = null;
  }
  if (chunk !== null && chunk !== undefined) this.write(chunk, encoding);

  // .end() fully uncorks
  if (state.corked) {
    state.corked = 1;
    this.uncork();
  }

  // ignore unnecessary end() calls.
  if (!state.ending) endWritable(this, state, cb);
  return this;
};
Object.defineProperty(Writable.prototype, 'writableLength', {
  // making it explicit this property is not enumerable
  // because otherwise some prototype manipulation in
  // userland will fail
  enumerable: false,
  get: function get() {
    return this._writableState.length;
  }
});
function needFinish(state) {
  return state.ending && state.length === 0 && state.bufferedRequest === null && !state.finished && !state.writing;
}
function callFinal(stream, state) {
  stream._final(function (err) {
    state.pendingcb--;
    if (err) {
      errorOrDestroy(stream, err);
    }
    state.prefinished = true;
    stream.emit('prefinish');
    finishMaybe(stream, state);
  });
}
function prefinish(stream, state) {
  if (!state.prefinished && !state.finalCalled) {
    if (typeof stream._final === 'function' && !state.destroyed) {
      state.pendingcb++;
      state.finalCalled = true;
      process.nextTick(callFinal, stream, state);
    } else {
      state.prefinished = true;
      stream.emit('prefinish');
    }
  }
}
function finishMaybe(stream, state) {
  var need = needFinish(state);
  if (need) {
    prefinish(stream, state);
    if (state.pendingcb === 0) {
      state.finished = true;
      stream.emit('finish');
      if (state.autoDestroy) {
        // In case of duplex streams we need a way to detect
        // if the readable side is ready for autoDestroy as well
        var rState = stream._readableState;
        if (!rState || rState.autoDestroy && rState.endEmitted) {
          stream.destroy();
        }
      }
    }
  }
  return need;
}
function endWritable(stream, state, cb) {
  state.ending = true;
  finishMaybe(stream, state);
  if (cb) {
    if (state.finished) process.nextTick(cb);else stream.once('finish', cb);
  }
  state.ended = true;
  stream.writable = false;
}
function onCorkedFinish(corkReq, state, err) {
  var entry = corkReq.entry;
  corkReq.entry = null;
  while (entry) {
    var cb = entry.callback;
    state.pendingcb--;
    cb(err);
    entry = entry.next;
  }

  // reuse the free corkReq.
  state.corkedRequestsFree.next = corkReq;
}
Object.defineProperty(Writable.prototype, 'destroyed', {
  // making it explicit this property is not enumerable
  // because otherwise some prototype manipulation in
  // userland will fail
  enumerable: false,
  get: function get() {
    if (this._writableState === undefined) {
      return false;
    }
    return this._writableState.destroyed;
  },
  set: function set(value) {
    // we ignore the value if the stream
    // has not been initialized yet
    if (!this._writableState) {
      return;
    }

    // backward compatibility, the user is explicitly
    // managing destroyed
    this._writableState.destroyed = value;
  }
});
Writable.prototype.destroy = destroyImpl.destroy;
Writable.prototype._undestroy = destroyImpl.undestroy;
Writable.prototype._destroy = function (err, cb) {
  cb(err);
};

/***/ }),

/***/ 3306:
/***/ ((module, __unused_webpack_exports, __nccwpck_require__) => {

"use strict";


var _Object$setPrototypeO;
function _defineProperty(obj, key, value) { key = _toPropertyKey(key); if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }
function _toPropertyKey(arg) { var key = _toPrimitive(arg, "string"); return typeof key === "symbol" ? key : String(key); }
function _toPrimitive(input, hint) { if (typeof input !== "object" || input === null) return input; var prim = input[Symbol.toPrimitive]; if (prim !== undefined) { var res = prim.call(input, hint || "default"); if (typeof res !== "object") return res; throw new TypeError("@@toPrimitive must return a primitive value."); } return (hint === "string" ? String : Number)(input); }
var finished = __nccwpck_require__(6080);
var kLastResolve = Symbol('lastResolve');
var kLastReject = Symbol('lastReject');
var kError = Symbol('error');
var kEnded = Symbol('ended');
var kLastPromise = Symbol('lastPromise');
var kHandlePromise = Symbol('handlePromise');
var kStream = Symbol('stream');
function createIterResult(value, done) {
  return {
    value: value,
    done: done
  };
}
function readAndResolve(iter) {
  var resolve = iter[kLastResolve];
  if (resolve !== null) {
    var data = iter[kStream].read();
    // we defer if data is null
    // we can be expecting either 'end' or
    // 'error'
    if (data !== null) {
      iter[kLastPromise] = null;
      iter[kLastResolve] = null;
      iter[kLastReject] = null;
      resolve(createIterResult(data, false));
    }
  }
}
function onReadable(iter) {
  // we wait for the next tick, because it might
  // emit an error with process.nextTick
  process.nextTick(readAndResolve, iter);
}
function wrapForNext(lastPromise, iter) {
  return function (resolve, reject) {
    lastPromise.then(function () {
      if (iter[kEnded]) {
        resolve(createIterResult(undefined, true));
        return;
      }
      iter[kHandlePromise](resolve, reject);
    }, reject);
  };
}
var AsyncIteratorPrototype = Object.getPrototypeOf(function () {});
var ReadableStreamAsyncIteratorPrototype = Object.setPrototypeOf((_Object$setPrototypeO = {
  get stream() {
    return this[kStream];
  },
  next: function next() {
    var _this = this;
    // if we have detected an error in the meanwhile
    // reject straight away
    var error = this[kError];
    if (error !== null) {
      return Promise.reject(error);
    }
    if (this[kEnded]) {
      return Promise.resolve(createIterResult(undefined, true));
    }
    if (this[kStream].destroyed) {
      // We need to defer via nextTick because if .destroy(err) is
      // called, the error will be emitted via nextTick, and
      // we cannot guarantee that there is no error lingering around
      // waiting to be emitted.
      return new Promise(function (resolve, reject) {
        process.nextTick(function () {
          if (_this[kError]) {
            reject(_this[kError]);
          } else {
            resolve(createIterResult(undefined, true));
          }
        });
      });
    }

    // if we have multiple next() calls
    // we will wait for the previous Promise to finish
    // this logic is optimized to support for await loops,
    // where next() is only called once at a time
    var lastPromise = this[kLastPromise];
    var promise;
    if (lastPromise) {
      promise = new Promise(wrapForNext(lastPromise, this));
    } else {
      // fast path needed to support multiple this.push()
      // without triggering the next() queue
      var data = this[kStream].read();
      if (data !== null) {
        return Promise.resolve(createIterResult(data, false));
      }
      promise = new Promise(this[kHandlePromise]);
    }
    this[kLastPromise] = promise;
    return promise;
  }
}, _defineProperty(_Object$setPrototypeO, Symbol.asyncIterator, function () {
  return this;
}), _defineProperty(_Object$setPrototypeO, "return", function _return() {
  var _this2 = this;
  // destroy(err, cb) is a private API
  // we can guarantee we have that here, because we control the
  // Readable class this is attached to
  return new Promise(function (resolve, reject) {
    _this2[kStream].destroy(null, function (err) {
      if (err) {
        reject(err);
        return;
      }
      resolve(createIterResult(undefined, true));
    });
  });
}), _Object$setPrototypeO), AsyncIteratorPrototype);
var createReadableStreamAsyncIterator = function createReadableStreamAsyncIterator(stream) {
  var _Object$create;
  var iterator = Object.create(ReadableStreamAsyncIteratorPrototype, (_Object$create = {}, _defineProperty(_Object$create, kStream, {
    value: stream,
    writable: true
  }), _defineProperty(_Object$create, kLastResolve, {
    value: null,
    writable: true
  }), _defineProperty(_Object$create, kLastReject, {
    value: null,
    writable: true
  }), _defineProperty(_Object$create, kError, {
    value: null,
    writable: true
  }), _defineProperty(_Object$create, kEnded, {
    value: stream._readableState.endEmitted,
    writable: true
  }), _defineProperty(_Object$create, kHandlePromise, {
    value: function value(resolve, reject) {
      var data = iterator[kStream].read();
      if (data) {
        iterator[kLastPromise] = null;
        iterator[kLastResolve] = null;
        iterator[kLastReject] = null;
        resolve(createIterResult(data, false));
      } else {
        iterator[kLastResolve] = resolve;
        iterator[kLastReject] = reject;
      }
    },
    writable: true
  }), _Object$create));
  iterator[kLastPromise] = null;
  finished(stream, function (err) {
    if (err && err.code !== 'ERR_STREAM_PREMATURE_CLOSE') {
      var reject = iterator[kLastReject];
      // reject if we are waiting for data in the Promise
      // returned by next() and store the error
      if (reject !== null) {
        iterator[kLastPromise] = null;
        iterator[kLastResolve] = null;
        iterator[kLastReject] = null;
        reject(err);
      }
      iterator[kError] = err;
      return;
    }
    var resolve = iterator[kLastResolve];
    if (resolve !== null) {
      iterator[kLastPromise] = null;
      iterator[kLastResolve] = null;
      iterator[kLastReject] = null;
      resolve(createIterResult(undefined, true));
    }
    iterator[kEnded] = true;
  });
  stream.on('readable', onReadable.bind(null, iterator));
  return iterator;
};
module.exports = createReadableStreamAsyncIterator;

/***/ }),

/***/ 2746:
/***/ ((module, __unused_webpack_exports, __nccwpck_require__) => {

"use strict";


function ownKeys(object, enumerableOnly) { var keys = Object.keys(object); if (Object.getOwnPropertySymbols) { var symbols = Object.getOwnPropertySymbols(object); enumerableOnly && (symbols = symbols.filter(function (sym) { return Object.getOwnPropertyDescriptor(object, sym).enumerable; })), keys.push.apply(keys, symbols); } return keys; }
function _objectSpread(target) { for (var i = 1; i < arguments.length; i++) { var source = null != arguments[i] ? arguments[i] : {}; i % 2 ? ownKeys(Object(source), !0).forEach(function (key) { _defineProperty(target, key, source[key]); }) : Object.getOwnPropertyDescriptors ? Object.defineProperties(target, Object.getOwnPropertyDescriptors(source)) : ownKeys(Object(source)).forEach(function (key) { Object.defineProperty(target, key, Object.getOwnPropertyDescriptor(source, key)); }); } return target; }
function _defineProperty(obj, key, value) { key = _toPropertyKey(key); if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }
function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }
function _defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, _toPropertyKey(descriptor.key), descriptor); } }
function _createClass(Constructor, protoProps, staticProps) { if (protoProps) _defineProperties(Constructor.prototype, protoProps); if (staticProps) _defineProperties(Constructor, staticProps); Object.defineProperty(Constructor, "prototype", { writable: false }); return Constructor; }
function _toPropertyKey(arg) { var key = _toPrimitive(arg, "string"); return typeof key === "symbol" ? key : String(key); }
function _toPrimitive(input, hint) { if (typeof input !== "object" || input === null) return input; var prim = input[Symbol.toPrimitive]; if (prim !== undefined) { var res = prim.call(input, hint || "default"); if (typeof res !== "object") return res; throw new TypeError("@@toPrimitive must return a primitive value."); } return (hint === "string" ? String : Number)(input); }
var _require = __nccwpck_require__(4300),
  Buffer = _require.Buffer;
var _require2 = __nccwpck_require__(3837),
  inspect = _require2.inspect;
var custom = inspect && inspect.custom || 'inspect';
function copyBuffer(src, target, offset) {
  Buffer.prototype.copy.call(src, target, offset);
}
module.exports = /*#__PURE__*/function () {
  function BufferList() {
    _classCallCheck(this, BufferList);
    this.head = null;
    this.tail = null;
    this.length = 0;
  }
  _createClass(BufferList, [{
    key: "push",
    value: function push(v) {
      var entry = {
        data: v,
        next: null
      };
      if (this.length > 0) this.tail.next = entry;else this.head = entry;
      this.tail = entry;
      ++this.length;
    }
  }, {
    key: "unshift",
    value: function unshift(v) {
      var entry = {
        data: v,
        next: this.head
      };
      if (this.length === 0) this.tail = entry;
      this.head = entry;
      ++this.length;
    }
  }, {
    key: "shift",
    value: function shift() {
      if (this.length === 0) return;
      var ret = this.head.data;
      if (this.length === 1) this.head = this.tail = null;else this.head = this.head.next;
      --this.length;
      return ret;
    }
  }, {
    key: "clear",
    value: function clear() {
      this.head = this.tail = null;
      this.length = 0;
    }
  }, {
    key: "join",
    value: function join(s) {
      if (this.length === 0) return '';
      var p = this.head;
      var ret = '' + p.data;
      while (p = p.next) ret += s + p.data;
      return ret;
    }
  }, {
    key: "concat",
    value: function concat(n) {
      if (this.length === 0) return Buffer.alloc(0);
      var ret = Buffer.allocUnsafe(n >>> 0);
      var p = this.head;
      var i = 0;
      while (p) {
        copyBuffer(p.data, ret, i);
        i += p.data.length;
        p = p.next;
      }
      return ret;
    }

    // Consumes a specified amount of bytes or characters from the buffered data.
  }, {
    key: "consume",
    value: function consume(n, hasStrings) {
      var ret;
      if (n < this.head.data.length) {
        // `slice` is the same for buffers and strings.
        ret = this.head.data.slice(0, n);
        this.head.data = this.head.data.slice(n);
      } else if (n === this.head.data.length) {
        // First chunk is a perfect match.
        ret = this.shift();
      } else {
        // Result spans more than one buffer.
        ret = hasStrings ? this._getString(n) : this._getBuffer(n);
      }
      return ret;
    }
  }, {
    key: "first",
    value: function first() {
      return this.head.data;
    }

    // Consumes a specified amount of characters from the buffered data.
  }, {
    key: "_getString",
    value: function _getString(n) {
      var p = this.head;
      var c = 1;
      var ret = p.data;
      n -= ret.length;
      while (p = p.next) {
        var str = p.data;
        var nb = n > str.length ? str.length : n;
        if (nb === str.length) ret += str;else ret += str.slice(0, n);
        n -= nb;
        if (n === 0) {
          if (nb === str.length) {
            ++c;
            if (p.next) this.head = p.next;else this.head = this.tail = null;
          } else {
            this.head = p;
            p.data = str.slice(nb);
          }
          break;
        }
        ++c;
      }
      this.length -= c;
      return ret;
    }

    // Consumes a specified amount of bytes from the buffered data.
  }, {
    key: "_getBuffer",
    value: function _getBuffer(n) {
      var ret = Buffer.allocUnsafe(n);
      var p = this.head;
      var c = 1;
      p.data.copy(ret);
      n -= p.data.length;
      while (p = p.next) {
        var buf = p.data;
        var nb = n > buf.length ? buf.length : n;
        buf.copy(ret, ret.length - n, 0, nb);
        n -= nb;
        if (n === 0) {
          if (nb === buf.length) {
            ++c;
            if (p.next) this.head = p.next;else this.head = this.tail = null;
          } else {
            this.head = p;
            p.data = buf.slice(nb);
          }
          break;
        }
        ++c;
      }
      this.length -= c;
      return ret;
    }

    // Make sure the linked list only shows the minimal necessary information.
  }, {
    key: custom,
    value: function value(_, options) {
      return inspect(this, _objectSpread(_objectSpread({}, options), {}, {
        // Only inspect one level.
        depth: 0,
        // It should not recurse.
        customInspect: false
      }));
    }
  }]);
  return BufferList;
}();

/***/ }),

/***/ 7049:
/***/ ((module) => {

"use strict";


// undocumented cb() API, needed for core, not for public API
function destroy(err, cb) {
  var _this = this;
  var readableDestroyed = this._readableState && this._readableState.destroyed;
  var writableDestroyed = this._writableState && this._writableState.destroyed;
  if (readableDestroyed || writableDestroyed) {
    if (cb) {
      cb(err);
    } else if (err) {
      if (!this._writableState) {
        process.nextTick(emitErrorNT, this, err);
      } else if (!this._writableState.errorEmitted) {
        this._writableState.errorEmitted = true;
        process.nextTick(emitErrorNT, this, err);
      }
    }
    return this;
  }

  // we set destroyed to true before firing error callbacks in order
  // to make it re-entrance safe in case destroy() is called within callbacks

  if (this._readableState) {
    this._readableState.destroyed = true;
  }

  // if this is a duplex stream mark the writable part as destroyed as well
  if (this._writableState) {
    this._writableState.destroyed = true;
  }
  this._destroy(err || null, function (err) {
    if (!cb && err) {
      if (!_this._writableState) {
        process.nextTick(emitErrorAndCloseNT, _this, err);
      } else if (!_this._writableState.errorEmitted) {
        _this._writableState.errorEmitted = true;
        process.nextTick(emitErrorAndCloseNT, _this, err);
      } else {
        process.nextTick(emitCloseNT, _this);
      }
    } else if (cb) {
      process.nextTick(emitCloseNT, _this);
      cb(err);
    } else {
      process.nextTick(emitCloseNT, _this);
    }
  });
  return this;
}
function emitErrorAndCloseNT(self, err) {
  emitErrorNT(self, err);
  emitCloseNT(self);
}
function emitCloseNT(self) {
  if (self._writableState && !self._writableState.emitClose) return;
  if (self._readableState && !self._readableState.emitClose) return;
  self.emit('close');
}
function undestroy() {
  if (this._readableState) {
    this._readableState.destroyed = false;
    this._readableState.reading = false;
    this._readableState.ended = false;
    this._readableState.endEmitted = false;
  }
  if (this._writableState) {
    this._writableState.destroyed = false;
    this._writableState.ended = false;
    this._writableState.ending = false;
    this._writableState.finalCalled = false;
    this._writableState.prefinished = false;
    this._writableState.finished = false;
    this._writableState.errorEmitted = false;
  }
}
function emitErrorNT(self, err) {
  self.emit('error', err);
}
function errorOrDestroy(stream, err) {
  // We have tests that rely on errors being emitted
  // in the same tick, so changing this is semver major.
  // For now when you opt-in to autoDestroy we allow
  // the error to be emitted nextTick. In a future
  // semver major update we should change the default to this.

  var rState = stream._readableState;
  var wState = stream._writableState;
  if (rState && rState.autoDestroy || wState && wState.autoDestroy) stream.destroy(err);else stream.emit('error', err);
}
module.exports = {
  destroy: destroy,
  undestroy: undestroy,
  errorOrDestroy: errorOrDestroy
};

/***/ }),

/***/ 6080:
/***/ ((module, __unused_webpack_exports, __nccwpck_require__) => {

"use strict";
// Ported from https://github.com/mafintosh/end-of-stream with
// permission from the author, Mathias Buus (@mafintosh).



var ERR_STREAM_PREMATURE_CLOSE = (__nccwpck_require__(7214)/* .codes.ERR_STREAM_PREMATURE_CLOSE */ .q.ERR_STREAM_PREMATURE_CLOSE);
function once(callback) {
  var called = false;
  return function () {
    if (called) return;
    called = true;
    for (var _len = arguments.length, args = new Array(_len), _key = 0; _key < _len; _key++) {
      args[_key] = arguments[_key];
    }
    callback.apply(this, args);
  };
}
function noop() {}
function isRequest(stream) {
  return stream.setHeader && typeof stream.abort === 'function';
}
function eos(stream, opts, callback) {
  if (typeof opts === 'function') return eos(stream, null, opts);
  if (!opts) opts = {};
  callback = once(callback || noop);
  var readable = opts.readable || opts.readable !== false && stream.readable;
  var writable = opts.writable || opts.writable !== false && stream.writable;
  var onlegacyfinish = function onlegacyfinish() {
    if (!stream.writable) onfinish();
  };
  var writableEnded = stream._writableState && stream._writableState.finished;
  var onfinish = function onfinish() {
    writable = false;
    writableEnded = true;
    if (!readable) callback.call(stream);
  };
  var readableEnded = stream._readableState && stream._readableState.endEmitted;
  var onend = function onend() {
    readable = false;
    readableEnded = true;
    if (!writable) callback.call(stream);
  };
  var onerror = function onerror(err) {
    callback.call(stream, err);
  };
  var onclose = function onclose() {
    var err;
    if (readable && !readableEnded) {
      if (!stream._readableState || !stream._readableState.ended) err = new ERR_STREAM_PREMATURE_CLOSE();
      return callback.call(stream, err);
    }
    if (writable && !writableEnded) {
      if (!stream._writableState || !stream._writableState.ended) err = new ERR_STREAM_PREMATURE_CLOSE();
      return callback.call(stream, err);
    }
  };
  var onrequest = function onrequest() {
    stream.req.on('finish', onfinish);
  };
  if (isRequest(stream)) {
    stream.on('complete', onfinish);
    stream.on('abort', onclose);
    if (stream.req) onrequest();else stream.on('request', onrequest);
  } else if (writable && !stream._writableState) {
    // legacy streams
    stream.on('end', onlegacyfinish);
    stream.on('close', onlegacyfinish);
  }
  stream.on('end', onend);
  stream.on('finish', onfinish);
  if (opts.error !== false) stream.on('error', onerror);
  stream.on('close', onclose);
  return function () {
    stream.removeListener('complete', onfinish);
    stream.removeListener('abort', onclose);
    stream.removeListener('request', onrequest);
    if (stream.req) stream.req.removeListener('finish', onfinish);
    stream.removeListener('end', onlegacyfinish);
    stream.removeListener('close', onlegacyfinish);
    stream.removeListener('finish', onfinish);
    stream.removeListener('end', onend);
    stream.removeListener('error', onerror);
    stream.removeListener('close', onclose);
  };
}
module.exports = eos;

/***/ }),

/***/ 9082:
/***/ ((module, __unused_webpack_exports, __nccwpck_require__) => {

"use strict";


function asyncGeneratorStep(gen, resolve, reject, _next, _throw, key, arg) { try { var info = gen[key](arg); var value = info.value; } catch (error) { reject(error); return; } if (info.done) { resolve(value); } else { Promise.resolve(value).then(_next, _throw); } }
function _asyncToGenerator(fn) { return function () { var self = this, args = arguments; return new Promise(function (resolve, reject) { var gen = fn.apply(self, args); function _next(value) { asyncGeneratorStep(gen, resolve, reject, _next, _throw, "next", value); } function _throw(err) { asyncGeneratorStep(gen, resolve, reject, _next, _throw, "throw", err); } _next(undefined); }); }; }
function ownKeys(object, enumerableOnly) { var keys = Object.keys(object); if (Object.getOwnPropertySymbols) { var symbols = Object.getOwnPropertySymbols(object); enumerableOnly && (symbols = symbols.filter(function (sym) { return Object.getOwnPropertyDescriptor(object, sym).enumerable; })), keys.push.apply(keys, symbols); } return keys; }
function _objectSpread(target) { for (var i = 1; i < arguments.length; i++) { var source = null != arguments[i] ? arguments[i] : {}; i % 2 ? ownKeys(Object(source), !0).forEach(function (key) { _defineProperty(target, key, source[key]); }) : Object.getOwnPropertyDescriptors ? Object.defineProperties(target, Object.getOwnPropertyDescriptors(source)) : ownKeys(Object(source)).forEach(function (key) { Object.defineProperty(target, key, Object.getOwnPropertyDescriptor(source, key)); }); } return target; }
function _defineProperty(obj, key, value) { key = _toPropertyKey(key); if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }
function _toPropertyKey(arg) { var key = _toPrimitive(arg, "string"); return typeof key === "symbol" ? key : String(key); }
function _toPrimitive(input, hint) { if (typeof input !== "object" || input === null) return input; var prim = input[Symbol.toPrimitive]; if (prim !== undefined) { var res = prim.call(input, hint || "default"); if (typeof res !== "object") return res; throw new TypeError("@@toPrimitive must return a primitive value."); } return (hint === "string" ? String : Number)(input); }
var ERR_INVALID_ARG_TYPE = (__nccwpck_require__(7214)/* .codes.ERR_INVALID_ARG_TYPE */ .q.ERR_INVALID_ARG_TYPE);
function from(Readable, iterable, opts) {
  var iterator;
  if (iterable && typeof iterable.next === 'function') {
    iterator = iterable;
  } else if (iterable && iterable[Symbol.asyncIterator]) iterator = iterable[Symbol.asyncIterator]();else if (iterable && iterable[Symbol.iterator]) iterator = iterable[Symbol.iterator]();else throw new ERR_INVALID_ARG_TYPE('iterable', ['Iterable'], iterable);
  var readable = new Readable(_objectSpread({
    objectMode: true
  }, opts));
  // Reading boolean to protect against _read
  // being called before last iteration completion.
  var reading = false;
  readable._read = function () {
    if (!reading) {
      reading = true;
      next();
    }
  };
  function next() {
    return _next2.apply(this, arguments);
  }
  function _next2() {
    _next2 = _asyncToGenerator(function* () {
      try {
        var _yield$iterator$next = yield iterator.next(),
          value = _yield$iterator$next.value,
          done = _yield$iterator$next.done;
        if (done) {
          readable.push(null);
        } else if (readable.push(yield value)) {
          next();
        } else {
          reading = false;
        }
      } catch (err) {
        readable.destroy(err);
      }
    });
    return _next2.apply(this, arguments);
  }
  return readable;
}
module.exports = from;


/***/ }),

/***/ 6989:
/***/ ((module, __unused_webpack_exports, __nccwpck_require__) => {

"use strict";
// Ported from https://github.com/mafintosh/pump with
// permission from the author, Mathias Buus (@mafintosh).



var eos;
function once(callback) {
  var called = false;
  return function () {
    if (called) return;
    called = true;
    callback.apply(void 0, arguments);
  };
}
var _require$codes = (__nccwpck_require__(7214)/* .codes */ .q),
  ERR_MISSING_ARGS = _require$codes.ERR_MISSING_ARGS,
  ERR_STREAM_DESTROYED = _require$codes.ERR_STREAM_DESTROYED;
function noop(err) {
  // Rethrow the error if it exists to avoid swallowing it
  if (err) throw err;
}
function isRequest(stream) {
  return stream.setHeader && typeof stream.abort === 'function';
}
function destroyer(stream, reading, writing, callback) {
  callback = once(callback);
  var closed = false;
  stream.on('close', function () {
    closed = true;
  });
  if (eos === undefined) eos = __nccwpck_require__(6080);
  eos(stream, {
    readable: reading,
    writable: writing
  }, function (err) {
    if (err) return callback(err);
    closed = true;
    callback();
  });
  var destroyed = false;
  return function (err) {
    if (closed) return;
    if (destroyed) return;
    destroyed = true;

    // request.destroy just do .end - .abort is what we want
    if (isRequest(stream)) return stream.abort();
    if (typeof stream.destroy === 'function') return stream.destroy();
    callback(err || new ERR_STREAM_DESTROYED('pipe'));
  };
}
function call(fn) {
  fn();
}
function pipe(from, to) {
  return from.pipe(to);
}
function popCallback(streams) {
  if (!streams.length) return noop;
  if (typeof streams[streams.length - 1] !== 'function') return noop;
  return streams.pop();
}
function pipeline() {
  for (var _len = arguments.length, streams = new Array(_len), _key = 0; _key < _len; _key++) {
    streams[_key] = arguments[_key];
  }
  var callback = popCallback(streams);
  if (Array.isArray(streams[0])) streams = streams[0];
  if (streams.length < 2) {
    throw new ERR_MISSING_ARGS('streams');
  }
  var error;
  var destroys = streams.map(function (stream, i) {
    var reading = i < streams.length - 1;
    var writing = i > 0;
    return destroyer(stream, reading, writing, function (err) {
      if (!error) error = err;
      if (err) destroys.forEach(call);
      if (reading) return;
      destroys.forEach(call);
      callback(error);
    });
  });
  return streams.reduce(pipe);
}
module.exports = pipeline;

/***/ }),

/***/ 9948:
/***/ ((module, __unused_webpack_exports, __nccwpck_require__) => {

"use strict";


var ERR_INVALID_OPT_VALUE = (__nccwpck_require__(7214)/* .codes.ERR_INVALID_OPT_VALUE */ .q.ERR_INVALID_OPT_VALUE);
function highWaterMarkFrom(options, isDuplex, duplexKey) {
  return options.highWaterMark != null ? options.highWaterMark : isDuplex ? options[duplexKey] : null;
}
function getHighWaterMark(state, options, duplexKey, isDuplex) {
  var hwm = highWaterMarkFrom(options, isDuplex, duplexKey);
  if (hwm != null) {
    if (!(isFinite(hwm) && Math.floor(hwm) === hwm) || hwm < 0) {
      var name = isDuplex ? duplexKey : 'highWaterMark';
      throw new ERR_INVALID_OPT_VALUE(name, hwm);
    }
    return Math.floor(hwm);
  }

  // Default value
  return state.objectMode ? 16 : 16 * 1024;
}
module.exports = {
  getHighWaterMark: getHighWaterMark
};

/***/ }),

/***/ 2387:
/***/ ((module, __unused_webpack_exports, __nccwpck_require__) => {

module.exports = __nccwpck_require__(2781);


/***/ }),

/***/ 1642:
/***/ ((module, exports, __nccwpck_require__) => {

var Stream = __nccwpck_require__(2781);
if (process.env.READABLE_STREAM === 'disable' && Stream) {
  module.exports = Stream.Readable;
  Object.assign(module.exports, Stream);
  module.exports.Stream = Stream;
} else {
  exports = module.exports = __nccwpck_require__(1433);
  exports.Stream = Stream || exports;
  exports.Readable = exports;
  exports.Writable = __nccwpck_require__(6993);
  exports.Duplex = __nccwpck_require__(1359);
  exports.Transform = __nccwpck_require__(4415);
  exports.PassThrough = __nccwpck_require__(1542);
  exports.finished = __nccwpck_require__(6080);
  exports.pipeline = __nccwpck_require__(6989);
}


/***/ }),

/***/ 8045:
/***/ ((module) => {

"use strict";


function ReInterval (callback, interval, args) {
  var self = this;

  this._callback = callback;
  this._args = args;

  this._interval = setInterval(callback, interval, this._args);

  this.reschedule = function (interval) {
    // if no interval entered, use the interval passed in on creation
    if (!interval)
      interval = self._interval;

    if (self._interval)
      clearInterval(self._interval);
    self._interval = setInterval(self._callback, interval, self._args);
  };

  this.clear = function () {
    if (self._interval) {
      clearInterval(self._interval);
      self._interval = undefined;
    }
  };
  
  this.destroy = function () {
    if (self._interval) {
      clearInterval(self._interval);
    }
    self._callback = undefined;
    self._interval = undefined;
    self._args = undefined;
  };
}

function reInterval () {
  if (typeof arguments[0] !== 'function')
    throw new Error('callback needed');
  if (typeof arguments[1] !== 'number')
    throw new Error('interval needed');

  var args;

  if (arguments.length > 0) {
    args = new Array(arguments.length - 2);

    for (var i = 0; i < args.length; i++) {
      args[i] = arguments[i + 2];
    }
  }

  return new ReInterval(arguments[0], arguments[1], args);
}

module.exports = reInterval;


/***/ }),

/***/ 3189:
/***/ ((module, __unused_webpack_exports, __nccwpck_require__) => {

"use strict";


module.exports = __nccwpck_require__(1868)()


/***/ }),

/***/ 1868:
/***/ ((module) => {

"use strict";

module.exports = rfdc

function copyBuffer (cur) {
  if (cur instanceof Buffer) {
    return Buffer.from(cur)
  }

  return new cur.constructor(cur.buffer.slice(), cur.byteOffset, cur.length)
}

function rfdc (opts) {
  opts = opts || {}

  if (opts.circles) return rfdcCircles(opts)
  return opts.proto ? cloneProto : clone

  function cloneArray (a, fn) {
    var keys = Object.keys(a)
    var a2 = new Array(keys.length)
    for (var i = 0; i < keys.length; i++) {
      var k = keys[i]
      var cur = a[k]
      if (typeof cur !== 'object' || cur === null) {
        a2[k] = cur
      } else if (cur instanceof Date) {
        a2[k] = new Date(cur)
      } else if (ArrayBuffer.isView(cur)) {
        a2[k] = copyBuffer(cur)
      } else {
        a2[k] = fn(cur)
      }
    }
    return a2
  }

  function clone (o) {
    if (typeof o !== 'object' || o === null) return o
    if (o instanceof Date) return new Date(o)
    if (Array.isArray(o)) return cloneArray(o, clone)
    if (o instanceof Map) return new Map(cloneArray(Array.from(o), clone))
    if (o instanceof Set) return new Set(cloneArray(Array.from(o), clone))
    var o2 = {}
    for (var k in o) {
      if (Object.hasOwnProperty.call(o, k) === false) continue
      var cur = o[k]
      if (typeof cur !== 'object' || cur === null) {
        o2[k] = cur
      } else if (cur instanceof Date) {
        o2[k] = new Date(cur)
      } else if (cur instanceof Map) {
        o2[k] = new Map(cloneArray(Array.from(cur), clone))
      } else if (cur instanceof Set) {
        o2[k] = new Set(cloneArray(Array.from(cur), clone))
      } else if (ArrayBuffer.isView(cur)) {
        o2[k] = copyBuffer(cur)
      } else {
        o2[k] = clone(cur)
      }
    }
    return o2
  }

  function cloneProto (o) {
    if (typeof o !== 'object' || o === null) return o
    if (o instanceof Date) return new Date(o)
    if (Array.isArray(o)) return cloneArray(o, cloneProto)
    if (o instanceof Map) return new Map(cloneArray(Array.from(o), cloneProto))
    if (o instanceof Set) return new Set(cloneArray(Array.from(o), cloneProto))
    var o2 = {}
    for (var k in o) {
      var cur = o[k]
      if (typeof cur !== 'object' || cur === null) {
        o2[k] = cur
      } else if (cur instanceof Date) {
        o2[k] = new Date(cur)
      } else if (cur instanceof Map) {
        o2[k] = new Map(cloneArray(Array.from(cur), cloneProto))
      } else if (cur instanceof Set) {
        o2[k] = new Set(cloneArray(Array.from(cur), cloneProto))
      } else if (ArrayBuffer.isView(cur)) {
        o2[k] = copyBuffer(cur)
      } else {
        o2[k] = cloneProto(cur)
      }
    }
    return o2
  }
}

function rfdcCircles (opts) {
  var refs = []
  var refsNew = []

  return opts.proto ? cloneProto : clone

  function cloneArray (a, fn) {
    var keys = Object.keys(a)
    var a2 = new Array(keys.length)
    for (var i = 0; i < keys.length; i++) {
      var k = keys[i]
      var cur = a[k]
      if (typeof cur !== 'object' || cur === null) {
        a2[k] = cur
      } else if (cur instanceof Date) {
        a2[k] = new Date(cur)
      } else if (ArrayBuffer.isView(cur)) {
        a2[k] = copyBuffer(cur)
      } else {
        var index = refs.indexOf(cur)
        if (index !== -1) {
          a2[k] = refsNew[index]
        } else {
          a2[k] = fn(cur)
        }
      }
    }
    return a2
  }

  function clone (o) {
    if (typeof o !== 'object' || o === null) return o
    if (o instanceof Date) return new Date(o)
    if (Array.isArray(o)) return cloneArray(o, clone)
    if (o instanceof Map) return new Map(cloneArray(Array.from(o), clone))
    if (o instanceof Set) return new Set(cloneArray(Array.from(o), clone))
    var o2 = {}
    refs.push(o)
    refsNew.push(o2)
    for (var k in o) {
      if (Object.hasOwnProperty.call(o, k) === false) continue
      var cur = o[k]
      if (typeof cur !== 'object' || cur === null) {
        o2[k] = cur
      } else if (cur instanceof Date) {
        o2[k] = new Date(cur)
      } else if (cur instanceof Map) {
        o2[k] = new Map(cloneArray(Array.from(cur), clone))
      } else if (cur instanceof Set) {
        o2[k] = new Set(cloneArray(Array.from(cur), clone))
      } else if (ArrayBuffer.isView(cur)) {
        o2[k] = copyBuffer(cur)
      } else {
        var i = refs.indexOf(cur)
        if (i !== -1) {
          o2[k] = refsNew[i]
        } else {
          o2[k] = clone(cur)
        }
      }
    }
    refs.pop()
    refsNew.pop()
    return o2
  }

  function cloneProto (o) {
    if (typeof o !== 'object' || o === null) return o
    if (o instanceof Date) return new Date(o)
    if (Array.isArray(o)) return cloneArray(o, cloneProto)
    if (o instanceof Map) return new Map(cloneArray(Array.from(o), cloneProto))
    if (o instanceof Set) return new Set(cloneArray(Array.from(o), cloneProto))
    var o2 = {}
    refs.push(o)
    refsNew.push(o2)
    for (var k in o) {
      var cur = o[k]
      if (typeof cur !== 'object' || cur === null) {
        o2[k] = cur
      } else if (cur instanceof Date) {
        o2[k] = new Date(cur)
      } else if (cur instanceof Map) {
        o2[k] = new Map(cloneArray(Array.from(cur), cloneProto))
      } else if (cur instanceof Set) {
        o2[k] = new Set(cloneArray(Array.from(cur), cloneProto))
      } else if (ArrayBuffer.isView(cur)) {
        o2[k] = copyBuffer(cur)
      } else {
        var i = refs.indexOf(cur)
        if (i !== -1) {
          o2[k] = refsNew[i]
        } else {
          o2[k] = cloneProto(cur)
        }
      }
    }
    refs.pop()
    refsNew.pop()
    return o2
  }
}


/***/ }),

/***/ 1867:
/***/ ((module, exports, __nccwpck_require__) => {

/*! safe-buffer. MIT License. Feross Aboukhadijeh <https://feross.org/opensource> */
/* eslint-disable node/no-deprecated-api */
var buffer = __nccwpck_require__(4300)
var Buffer = buffer.Buffer

// alternative to using Object.keys for old browsers
function copyProps (src, dst) {
  for (var key in src) {
    dst[key] = src[key]
  }
}
if (Buffer.from && Buffer.alloc && Buffer.allocUnsafe && Buffer.allocUnsafeSlow) {
  module.exports = buffer
} else {
  // Copy properties from require('buffer')
  copyProps(buffer, exports)
  exports.Buffer = SafeBuffer
}

function SafeBuffer (arg, encodingOrOffset, length) {
  return Buffer(arg, encodingOrOffset, length)
}

SafeBuffer.prototype = Object.create(Buffer.prototype)

// Copy static methods from Buffer
copyProps(Buffer, SafeBuffer)

SafeBuffer.from = function (arg, encodingOrOffset, length) {
  if (typeof arg === 'number') {
    throw new TypeError('Argument must not be a number')
  }
  return Buffer(arg, encodingOrOffset, length)
}

SafeBuffer.alloc = function (size, fill, encoding) {
  if (typeof size !== 'number') {
    throw new TypeError('Argument must be a number')
  }
  var buf = Buffer(size)
  if (fill !== undefined) {
    if (typeof encoding === 'string') {
      buf.fill(fill, encoding)
    } else {
      buf.fill(fill)
    }
  } else {
    buf.fill(0)
  }
  return buf
}

SafeBuffer.allocUnsafe = function (size) {
  if (typeof size !== 'number') {
    throw new TypeError('Argument must be a number')
  }
  return Buffer(size)
}

SafeBuffer.allocUnsafeSlow = function (size) {
  if (typeof size !== 'number') {
    throw new TypeError('Argument must be a number')
  }
  return buffer.SlowBuffer(size)
}


/***/ }),

/***/ 6121:
/***/ ((module) => {

module.exports = shift

function shift (stream) {
  var rs = stream._readableState
  if (!rs) return null
  return (rs.objectMode || typeof stream._duplexState === 'number') ? stream.read() : stream.read(getStateLength(rs))
}

function getStateLength (state) {
  if (state.buffer.length) {
    // Since node 6.3.0 state.buffer is a BufferList not an array
    if (state.buffer.head) {
      return state.buffer.head.data.length
    }

    return state.buffer[0].length
  }

  return state.length
}


/***/ }),

/***/ 4841:
/***/ ((__unused_webpack_module, exports, __nccwpck_require__) => {

"use strict";
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.



/*<replacement>*/

var Buffer = (__nccwpck_require__(1867).Buffer);
/*</replacement>*/

var isEncoding = Buffer.isEncoding || function (encoding) {
  encoding = '' + encoding;
  switch (encoding && encoding.toLowerCase()) {
    case 'hex':case 'utf8':case 'utf-8':case 'ascii':case 'binary':case 'base64':case 'ucs2':case 'ucs-2':case 'utf16le':case 'utf-16le':case 'raw':
      return true;
    default:
      return false;
  }
};

function _normalizeEncoding(enc) {
  if (!enc) return 'utf8';
  var retried;
  while (true) {
    switch (enc) {
      case 'utf8':
      case 'utf-8':
        return 'utf8';
      case 'ucs2':
      case 'ucs-2':
      case 'utf16le':
      case 'utf-16le':
        return 'utf16le';
      case 'latin1':
      case 'binary':
        return 'latin1';
      case 'base64':
      case 'ascii':
      case 'hex':
        return enc;
      default:
        if (retried) return; // undefined
        enc = ('' + enc).toLowerCase();
        retried = true;
    }
  }
};

// Do not cache `Buffer.isEncoding` when checking encoding names as some
// modules monkey-patch it to support additional encodings
function normalizeEncoding(enc) {
  var nenc = _normalizeEncoding(enc);
  if (typeof nenc !== 'string' && (Buffer.isEncoding === isEncoding || !isEncoding(enc))) throw new Error('Unknown encoding: ' + enc);
  return nenc || enc;
}

// StringDecoder provides an interface for efficiently splitting a series of
// buffers into a series of JS strings without breaking apart multi-byte
// characters.
exports.s = StringDecoder;
function StringDecoder(encoding) {
  this.encoding = normalizeEncoding(encoding);
  var nb;
  switch (this.encoding) {
    case 'utf16le':
      this.text = utf16Text;
      this.end = utf16End;
      nb = 4;
      break;
    case 'utf8':
      this.fillLast = utf8FillLast;
      nb = 4;
      break;
    case 'base64':
      this.text = base64Text;
      this.end = base64End;
      nb = 3;
      break;
    default:
      this.write = simpleWrite;
      this.end = simpleEnd;
      return;
  }
  this.lastNeed = 0;
  this.lastTotal = 0;
  this.lastChar = Buffer.allocUnsafe(nb);
}

StringDecoder.prototype.write = function (buf) {
  if (buf.length === 0) return '';
  var r;
  var i;
  if (this.lastNeed) {
    r = this.fillLast(buf);
    if (r === undefined) return '';
    i = this.lastNeed;
    this.lastNeed = 0;
  } else {
    i = 0;
  }
  if (i < buf.length) return r ? r + this.text(buf, i) : this.text(buf, i);
  return r || '';
};

StringDecoder.prototype.end = utf8End;

// Returns only complete characters in a Buffer
StringDecoder.prototype.text = utf8Text;

// Attempts to complete a partial non-UTF-8 character using bytes from a Buffer
StringDecoder.prototype.fillLast = function (buf) {
  if (this.lastNeed <= buf.length) {
    buf.copy(this.lastChar, this.lastTotal - this.lastNeed, 0, this.lastNeed);
    return this.lastChar.toString(this.encoding, 0, this.lastTotal);
  }
  buf.copy(this.lastChar, this.lastTotal - this.lastNeed, 0, buf.length);
  this.lastNeed -= buf.length;
};

// Checks the type of a UTF-8 byte, whether it's ASCII, a leading byte, or a
// continuation byte. If an invalid byte is detected, -2 is returned.
function utf8CheckByte(byte) {
  if (byte <= 0x7F) return 0;else if (byte >> 5 === 0x06) return 2;else if (byte >> 4 === 0x0E) return 3;else if (byte >> 3 === 0x1E) return 4;
  return byte >> 6 === 0x02 ? -1 : -2;
}

// Checks at most 3 bytes at the end of a Buffer in order to detect an
// incomplete multi-byte UTF-8 character. The total number of bytes (2, 3, or 4)
// needed to complete the UTF-8 character (if applicable) are returned.
function utf8CheckIncomplete(self, buf, i) {
  var j = buf.length - 1;
  if (j < i) return 0;
  var nb = utf8CheckByte(buf[j]);
  if (nb >= 0) {
    if (nb > 0) self.lastNeed = nb - 1;
    return nb;
  }
  if (--j < i || nb === -2) return 0;
  nb = utf8CheckByte(buf[j]);
  if (nb >= 0) {
    if (nb > 0) self.lastNeed = nb - 2;
    return nb;
  }
  if (--j < i || nb === -2) return 0;
  nb = utf8CheckByte(buf[j]);
  if (nb >= 0) {
    if (nb > 0) {
      if (nb === 2) nb = 0;else self.lastNeed = nb - 3;
    }
    return nb;
  }
  return 0;
}

// Validates as many continuation bytes for a multi-byte UTF-8 character as
// needed or are available. If we see a non-continuation byte where we expect
// one, we "replace" the validated continuation bytes we've seen so far with
// a single UTF-8 replacement character ('\ufffd'), to match v8's UTF-8 decoding
// behavior. The continuation byte check is included three times in the case
// where all of the continuation bytes for a character exist in the same buffer.
// It is also done this way as a slight performance increase instead of using a
// loop.
function utf8CheckExtraBytes(self, buf, p) {
  if ((buf[0] & 0xC0) !== 0x80) {
    self.lastNeed = 0;
    return '\ufffd';
  }
  if (self.lastNeed > 1 && buf.length > 1) {
    if ((buf[1] & 0xC0) !== 0x80) {
      self.lastNeed = 1;
      return '\ufffd';
    }
    if (self.lastNeed > 2 && buf.length > 2) {
      if ((buf[2] & 0xC0) !== 0x80) {
        self.lastNeed = 2;
        return '\ufffd';
      }
    }
  }
}

// Attempts to complete a multi-byte UTF-8 character using bytes from a Buffer.
function utf8FillLast(buf) {
  var p = this.lastTotal - this.lastNeed;
  var r = utf8CheckExtraBytes(this, buf, p);
  if (r !== undefined) return r;
  if (this.lastNeed <= buf.length) {
    buf.copy(this.lastChar, p, 0, this.lastNeed);
    return this.lastChar.toString(this.encoding, 0, this.lastTotal);
  }
  buf.copy(this.lastChar, p, 0, buf.length);
  this.lastNeed -= buf.length;
}

// Returns all complete UTF-8 characters in a Buffer. If the Buffer ended on a
// partial character, the character's bytes are buffered until the required
// number of bytes are available.
function utf8Text(buf, i) {
  var total = utf8CheckIncomplete(this, buf, i);
  if (!this.lastNeed) return buf.toString('utf8', i);
  this.lastTotal = total;
  var end = buf.length - (total - this.lastNeed);
  buf.copy(this.lastChar, 0, end);
  return buf.toString('utf8', i, end);
}

// For UTF-8, a replacement character is added when ending on a partial
// character.
function utf8End(buf) {
  var r = buf && buf.length ? this.write(buf) : '';
  if (this.lastNeed) return r + '\ufffd';
  return r;
}

// UTF-16LE typically needs two bytes per character, but even if we have an even
// number of bytes available, we need to check if we end on a leading/high
// surrogate. In that case, we need to wait for the next two bytes in order to
// decode the last character properly.
function utf16Text(buf, i) {
  if ((buf.length - i) % 2 === 0) {
    var r = buf.toString('utf16le', i);
    if (r) {
      var c = r.charCodeAt(r.length - 1);
      if (c >= 0xD800 && c <= 0xDBFF) {
        this.lastNeed = 2;
        this.lastTotal = 4;
        this.lastChar[0] = buf[buf.length - 2];
        this.lastChar[1] = buf[buf.length - 1];
        return r.slice(0, -1);
      }
    }
    return r;
  }
  this.lastNeed = 1;
  this.lastTotal = 2;
  this.lastChar[0] = buf[buf.length - 1];
  return buf.toString('utf16le', i, buf.length - 1);
}

// For UTF-16LE we do not explicitly append special replacement characters if we
// end on a partial character, we simply let v8 handle that.
function utf16End(buf) {
  var r = buf && buf.length ? this.write(buf) : '';
  if (this.lastNeed) {
    var end = this.lastTotal - this.lastNeed;
    return r + this.lastChar.toString('utf16le', 0, end);
  }
  return r;
}

function base64Text(buf, i) {
  var n = (buf.length - i) % 3;
  if (n === 0) return buf.toString('base64', i);
  this.lastNeed = 3 - n;
  this.lastTotal = 3;
  if (n === 1) {
    this.lastChar[0] = buf[buf.length - 1];
  } else {
    this.lastChar[0] = buf[buf.length - 2];
    this.lastChar[1] = buf[buf.length - 1];
  }
  return buf.toString('base64', i, buf.length - n);
}

function base64End(buf) {
  var r = buf && buf.length ? this.write(buf) : '';
  if (this.lastNeed) return r + this.lastChar.toString('base64', 0, 3 - this.lastNeed);
  return r;
}

// Pass bytes on through for single-byte encodings (e.g. ascii, latin1, hex)
function simpleWrite(buf) {
  return buf.toString(this.encoding);
}

function simpleEnd(buf) {
  return buf && buf.length ? this.write(buf) : '';
}

/***/ }),

/***/ 5278:
/***/ ((module, __unused_webpack_exports, __nccwpck_require__) => {


/**
 * For Node.js, simply re-export the core `util.deprecate` function.
 */

module.exports = __nccwpck_require__(3837).deprecate;


/***/ }),

/***/ 2940:
/***/ ((module) => {

// Returns a wrapper function that returns a wrapped callback
// The wrapper function should do some stuff, and return a
// presumably different callback function.
// This makes sure that own properties are retained, so that
// decorations and such are not lost along the way.
module.exports = wrappy
function wrappy (fn, cb) {
  if (fn && cb) return wrappy(fn)(cb)

  if (typeof fn !== 'function')
    throw new TypeError('need wrapper function')

  Object.keys(fn).forEach(function (k) {
    wrapper[k] = fn[k]
  })

  return wrapper

  function wrapper() {
    var args = new Array(arguments.length)
    for (var i = 0; i < args.length; i++) {
      args[i] = arguments[i]
    }
    var ret = fn.apply(this, args)
    var cb = args[args.length-1]
    if (typeof ret === 'function' && ret !== cb) {
      Object.keys(cb).forEach(function (k) {
        ret[k] = cb[k]
      })
    }
    return ret
  }
}


/***/ }),

/***/ 8867:
/***/ ((module, __unused_webpack_exports, __nccwpck_require__) => {

"use strict";


const WebSocket = __nccwpck_require__(1518);

WebSocket.createWebSocketStream = __nccwpck_require__(1658);
WebSocket.Server = __nccwpck_require__(8887);
WebSocket.Receiver = __nccwpck_require__(5066);
WebSocket.Sender = __nccwpck_require__(6947);

module.exports = WebSocket;


/***/ }),

/***/ 9436:
/***/ ((module, __unused_webpack_exports, __nccwpck_require__) => {

"use strict";


const { EMPTY_BUFFER } = __nccwpck_require__(5949);

/**
 * Merges an array of buffers into a new buffer.
 *
 * @param {Buffer[]} list The array of buffers to concat
 * @param {Number} totalLength The total length of buffers in the list
 * @return {Buffer} The resulting buffer
 * @public
 */
function concat(list, totalLength) {
  if (list.length === 0) return EMPTY_BUFFER;
  if (list.length === 1) return list[0];

  const target = Buffer.allocUnsafe(totalLength);
  let offset = 0;

  for (let i = 0; i < list.length; i++) {
    const buf = list[i];
    target.set(buf, offset);
    offset += buf.length;
  }

  if (offset < totalLength) return target.slice(0, offset);

  return target;
}

/**
 * Masks a buffer using the given mask.
 *
 * @param {Buffer} source The buffer to mask
 * @param {Buffer} mask The mask to use
 * @param {Buffer} output The buffer where to store the result
 * @param {Number} offset The offset at which to start writing
 * @param {Number} length The number of bytes to mask.
 * @public
 */
function _mask(source, mask, output, offset, length) {
  for (let i = 0; i < length; i++) {
    output[offset + i] = source[i] ^ mask[i & 3];
  }
}

/**
 * Unmasks a buffer using the given mask.
 *
 * @param {Buffer} buffer The buffer to unmask
 * @param {Buffer} mask The mask to use
 * @public
 */
function _unmask(buffer, mask) {
  // Required until https://github.com/nodejs/node/issues/9006 is resolved.
  const length = buffer.length;
  for (let i = 0; i < length; i++) {
    buffer[i] ^= mask[i & 3];
  }
}

/**
 * Converts a buffer to an `ArrayBuffer`.
 *
 * @param {Buffer} buf The buffer to convert
 * @return {ArrayBuffer} Converted buffer
 * @public
 */
function toArrayBuffer(buf) {
  if (buf.byteLength === buf.buffer.byteLength) {
    return buf.buffer;
  }

  return buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
}

/**
 * Converts `data` to a `Buffer`.
 *
 * @param {*} data The data to convert
 * @return {Buffer} The buffer
 * @throws {TypeError}
 * @public
 */
function toBuffer(data) {
  toBuffer.readOnly = true;

  if (Buffer.isBuffer(data)) return data;

  let buf;

  if (data instanceof ArrayBuffer) {
    buf = Buffer.from(data);
  } else if (ArrayBuffer.isView(data)) {
    buf = Buffer.from(data.buffer, data.byteOffset, data.byteLength);
  } else {
    buf = Buffer.from(data);
    toBuffer.readOnly = false;
  }

  return buf;
}

try {
  const bufferUtil = __nccwpck_require__(1269);
  const bu = bufferUtil.BufferUtil || bufferUtil;

  module.exports = {
    concat,
    mask(source, mask, output, offset, length) {
      if (length < 48) _mask(source, mask, output, offset, length);
      else bu.mask(source, mask, output, offset, length);
    },
    toArrayBuffer,
    toBuffer,
    unmask(buffer, mask) {
      if (buffer.length < 32) _unmask(buffer, mask);
      else bu.unmask(buffer, mask);
    }
  };
} catch (e) /* istanbul ignore next */ {
  module.exports = {
    concat,
    mask: _mask,
    toArrayBuffer,
    toBuffer,
    unmask: _unmask
  };
}


/***/ }),

/***/ 5949:
/***/ ((module) => {

"use strict";


module.exports = {
  BINARY_TYPES: ['nodebuffer', 'arraybuffer', 'fragments'],
  GUID: '258EAFA5-E914-47DA-95CA-C5AB0DC85B11',
  kStatusCode: Symbol('status-code'),
  kWebSocket: Symbol('websocket'),
  EMPTY_BUFFER: Buffer.alloc(0),
  NOOP: () => {}
};


/***/ }),

/***/ 4561:
/***/ ((module) => {

"use strict";


/**
 * Class representing an event.
 *
 * @private
 */
class Event {
  /**
   * Create a new `Event`.
   *
   * @param {String} type The name of the event
   * @param {Object} target A reference to the target to which the event was
   *     dispatched
   */
  constructor(type, target) {
    this.target = target;
    this.type = type;
  }
}

/**
 * Class representing a message event.
 *
 * @extends Event
 * @private
 */
class MessageEvent extends Event {
  /**
   * Create a new `MessageEvent`.
   *
   * @param {(String|Buffer|ArrayBuffer|Buffer[])} data The received data
   * @param {WebSocket} target A reference to the target to which the event was
   *     dispatched
   */
  constructor(data, target) {
    super('message', target);

    this.data = data;
  }
}

/**
 * Class representing a close event.
 *
 * @extends Event
 * @private
 */
class CloseEvent extends Event {
  /**
   * Create a new `CloseEvent`.
   *
   * @param {Number} code The status code explaining why the connection is being
   *     closed
   * @param {String} reason A human-readable string explaining why the
   *     connection is closing
   * @param {WebSocket} target A reference to the target to which the event was
   *     dispatched
   */
  constructor(code, reason, target) {
    super('close', target);

    this.wasClean = target._closeFrameReceived && target._closeFrameSent;
    this.reason = reason;
    this.code = code;
  }
}

/**
 * Class representing an open event.
 *
 * @extends Event
 * @private
 */
class OpenEvent extends Event {
  /**
   * Create a new `OpenEvent`.
   *
   * @param {WebSocket} target A reference to the target to which the event was
   *     dispatched
   */
  constructor(target) {
    super('open', target);
  }
}

/**
 * Class representing an error event.
 *
 * @extends Event
 * @private
 */
class ErrorEvent extends Event {
  /**
   * Create a new `ErrorEvent`.
   *
   * @param {Object} error The error that generated this event
   * @param {WebSocket} target A reference to the target to which the event was
   *     dispatched
   */
  constructor(error, target) {
    super('error', target);

    this.message = error.message;
    this.error = error;
  }
}

/**
 * This provides methods for emulating the `EventTarget` interface. It's not
 * meant to be used directly.
 *
 * @mixin
 */
const EventTarget = {
  /**
   * Register an event listener.
   *
   * @param {String} type A string representing the event type to listen for
   * @param {Function} listener The listener to add
   * @param {Object} [options] An options object specifies characteristics about
   *     the event listener
   * @param {Boolean} [options.once=false] A `Boolean`` indicating that the
   *     listener should be invoked at most once after being added. If `true`,
   *     the listener would be automatically removed when invoked.
   * @public
   */
  addEventListener(type, listener, options) {
    if (typeof listener !== 'function') return;

    function onMessage(data) {
      listener.call(this, new MessageEvent(data, this));
    }

    function onClose(code, message) {
      listener.call(this, new CloseEvent(code, message, this));
    }

    function onError(error) {
      listener.call(this, new ErrorEvent(error, this));
    }

    function onOpen() {
      listener.call(this, new OpenEvent(this));
    }

    const method = options && options.once ? 'once' : 'on';

    if (type === 'message') {
      onMessage._listener = listener;
      this[method](type, onMessage);
    } else if (type === 'close') {
      onClose._listener = listener;
      this[method](type, onClose);
    } else if (type === 'error') {
      onError._listener = listener;
      this[method](type, onError);
    } else if (type === 'open') {
      onOpen._listener = listener;
      this[method](type, onOpen);
    } else {
      this[method](type, listener);
    }
  },

  /**
   * Remove an event listener.
   *
   * @param {String} type A string representing the event type to remove
   * @param {Function} listener The listener to remove
   * @public
   */
  removeEventListener(type, listener) {
    const listeners = this.listeners(type);

    for (let i = 0; i < listeners.length; i++) {
      if (listeners[i] === listener || listeners[i]._listener === listener) {
        this.removeListener(type, listeners[i]);
      }
    }
  }
};

module.exports = EventTarget;


/***/ }),

/***/ 2035:
/***/ ((module) => {

"use strict";


//
// Allowed token characters:
//
// '!', '#', '$', '%', '&', ''', '*', '+', '-',
// '.', 0-9, A-Z, '^', '_', '`', a-z, '|', '~'
//
// tokenChars[32] === 0 // ' '
// tokenChars[33] === 1 // '!'
// tokenChars[34] === 0 // '"'
// ...
//
// prettier-ignore
const tokenChars = [
  0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, // 0 - 15
  0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, // 16 - 31
  0, 1, 0, 1, 1, 1, 1, 1, 0, 0, 1, 1, 0, 1, 1, 0, // 32 - 47
  1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0, // 48 - 63
  0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, // 64 - 79
  1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0, 1, 1, // 80 - 95
  1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, // 96 - 111
  1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 1, 0, 1, 0 // 112 - 127
];

/**
 * Adds an offer to the map of extension offers or a parameter to the map of
 * parameters.
 *
 * @param {Object} dest The map of extension offers or parameters
 * @param {String} name The extension or parameter name
 * @param {(Object|Boolean|String)} elem The extension parameters or the
 *     parameter value
 * @private
 */
function push(dest, name, elem) {
  if (dest[name] === undefined) dest[name] = [elem];
  else dest[name].push(elem);
}

/**
 * Parses the `Sec-WebSocket-Extensions` header into an object.
 *
 * @param {String} header The field value of the header
 * @return {Object} The parsed object
 * @public
 */
function parse(header) {
  const offers = Object.create(null);

  if (header === undefined || header === '') return offers;

  let params = Object.create(null);
  let mustUnescape = false;
  let isEscaping = false;
  let inQuotes = false;
  let extensionName;
  let paramName;
  let start = -1;
  let end = -1;
  let i = 0;

  for (; i < header.length; i++) {
    const code = header.charCodeAt(i);

    if (extensionName === undefined) {
      if (end === -1 && tokenChars[code] === 1) {
        if (start === -1) start = i;
      } else if (code === 0x20 /* ' ' */ || code === 0x09 /* '\t' */) {
        if (end === -1 && start !== -1) end = i;
      } else if (code === 0x3b /* ';' */ || code === 0x2c /* ',' */) {
        if (start === -1) {
          throw new SyntaxError(`Unexpected character at index ${i}`);
        }

        if (end === -1) end = i;
        const name = header.slice(start, end);
        if (code === 0x2c) {
          push(offers, name, params);
          params = Object.create(null);
        } else {
          extensionName = name;
        }

        start = end = -1;
      } else {
        throw new SyntaxError(`Unexpected character at index ${i}`);
      }
    } else if (paramName === undefined) {
      if (end === -1 && tokenChars[code] === 1) {
        if (start === -1) start = i;
      } else if (code === 0x20 || code === 0x09) {
        if (end === -1 && start !== -1) end = i;
      } else if (code === 0x3b || code === 0x2c) {
        if (start === -1) {
          throw new SyntaxError(`Unexpected character at index ${i}`);
        }

        if (end === -1) end = i;
        push(params, header.slice(start, end), true);
        if (code === 0x2c) {
          push(offers, extensionName, params);
          params = Object.create(null);
          extensionName = undefined;
        }

        start = end = -1;
      } else if (code === 0x3d /* '=' */ && start !== -1 && end === -1) {
        paramName = header.slice(start, i);
        start = end = -1;
      } else {
        throw new SyntaxError(`Unexpected character at index ${i}`);
      }
    } else {
      //
      // The value of a quoted-string after unescaping must conform to the
      // token ABNF, so only token characters are valid.
      // Ref: https://tools.ietf.org/html/rfc6455#section-9.1
      //
      if (isEscaping) {
        if (tokenChars[code] !== 1) {
          throw new SyntaxError(`Unexpected character at index ${i}`);
        }
        if (start === -1) start = i;
        else if (!mustUnescape) mustUnescape = true;
        isEscaping = false;
      } else if (inQuotes) {
        if (tokenChars[code] === 1) {
          if (start === -1) start = i;
        } else if (code === 0x22 /* '"' */ && start !== -1) {
          inQuotes = false;
          end = i;
        } else if (code === 0x5c /* '\' */) {
          isEscaping = true;
        } else {
          throw new SyntaxError(`Unexpected character at index ${i}`);
        }
      } else if (code === 0x22 && header.charCodeAt(i - 1) === 0x3d) {
        inQuotes = true;
      } else if (end === -1 && tokenChars[code] === 1) {
        if (start === -1) start = i;
      } else if (start !== -1 && (code === 0x20 || code === 0x09)) {
        if (end === -1) end = i;
      } else if (code === 0x3b || code === 0x2c) {
        if (start === -1) {
          throw new SyntaxError(`Unexpected character at index ${i}`);
        }

        if (end === -1) end = i;
        let value = header.slice(start, end);
        if (mustUnescape) {
          value = value.replace(/\\/g, '');
          mustUnescape = false;
        }
        push(params, paramName, value);
        if (code === 0x2c) {
          push(offers, extensionName, params);
          params = Object.create(null);
          extensionName = undefined;
        }

        paramName = undefined;
        start = end = -1;
      } else {
        throw new SyntaxError(`Unexpected character at index ${i}`);
      }
    }
  }

  if (start === -1 || inQuotes) {
    throw new SyntaxError('Unexpected end of input');
  }

  if (end === -1) end = i;
  const token = header.slice(start, end);
  if (extensionName === undefined) {
    push(offers, token, params);
  } else {
    if (paramName === undefined) {
      push(params, token, true);
    } else if (mustUnescape) {
      push(params, paramName, token.replace(/\\/g, ''));
    } else {
      push(params, paramName, token);
    }
    push(offers, extensionName, params);
  }

  return offers;
}

/**
 * Builds the `Sec-WebSocket-Extensions` header field value.
 *
 * @param {Object} extensions The map of extensions and parameters to format
 * @return {String} A string representing the given object
 * @public
 */
function format(extensions) {
  return Object.keys(extensions)
    .map((extension) => {
      let configurations = extensions[extension];
      if (!Array.isArray(configurations)) configurations = [configurations];
      return configurations
        .map((params) => {
          return [extension]
            .concat(
              Object.keys(params).map((k) => {
                let values = params[k];
                if (!Array.isArray(values)) values = [values];
                return values
                  .map((v) => (v === true ? k : `${k}=${v}`))
                  .join('; ');
              })
            )
            .join('; ');
        })
        .join(', ');
    })
    .join(', ');
}

module.exports = { format, parse };


/***/ }),

/***/ 1356:
/***/ ((module) => {

"use strict";


const kDone = Symbol('kDone');
const kRun = Symbol('kRun');

/**
 * A very simple job queue with adjustable concurrency. Adapted from
 * https://github.com/STRML/async-limiter
 */
class Limiter {
  /**
   * Creates a new `Limiter`.
   *
   * @param {Number} [concurrency=Infinity] The maximum number of jobs allowed
   *     to run concurrently
   */
  constructor(concurrency) {
    this[kDone] = () => {
      this.pending--;
      this[kRun]();
    };
    this.concurrency = concurrency || Infinity;
    this.jobs = [];
    this.pending = 0;
  }

  /**
   * Adds a job to the queue.
   *
   * @param {Function} job The job to run
   * @public
   */
  add(job) {
    this.jobs.push(job);
    this[kRun]();
  }

  /**
   * Removes a job from the queue and runs it if possible.
   *
   * @private
   */
  [kRun]() {
    if (this.pending === this.concurrency) return;

    if (this.jobs.length) {
      const job = this.jobs.shift();

      this.pending++;
      job(this[kDone]);
    }
  }
}

module.exports = Limiter;


/***/ }),

/***/ 6684:
/***/ ((module, __unused_webpack_exports, __nccwpck_require__) => {

"use strict";


const zlib = __nccwpck_require__(9796);

const bufferUtil = __nccwpck_require__(9436);
const Limiter = __nccwpck_require__(1356);
const { kStatusCode, NOOP } = __nccwpck_require__(5949);

const TRAILER = Buffer.from([0x00, 0x00, 0xff, 0xff]);
const kPerMessageDeflate = Symbol('permessage-deflate');
const kTotalLength = Symbol('total-length');
const kCallback = Symbol('callback');
const kBuffers = Symbol('buffers');
const kError = Symbol('error');

//
// We limit zlib concurrency, which prevents severe memory fragmentation
// as documented in https://github.com/nodejs/node/issues/8871#issuecomment-250915913
// and https://github.com/websockets/ws/issues/1202
//
// Intentionally global; it's the global thread pool that's an issue.
//
let zlibLimiter;

/**
 * permessage-deflate implementation.
 */
class PerMessageDeflate {
  /**
   * Creates a PerMessageDeflate instance.
   *
   * @param {Object} [options] Configuration options
   * @param {Boolean} [options.serverNoContextTakeover=false] Request/accept
   *     disabling of server context takeover
   * @param {Boolean} [options.clientNoContextTakeover=false] Advertise/
   *     acknowledge disabling of client context takeover
   * @param {(Boolean|Number)} [options.serverMaxWindowBits] Request/confirm the
   *     use of a custom server window size
   * @param {(Boolean|Number)} [options.clientMaxWindowBits] Advertise support
   *     for, or request, a custom client window size
   * @param {Object} [options.zlibDeflateOptions] Options to pass to zlib on
   *     deflate
   * @param {Object} [options.zlibInflateOptions] Options to pass to zlib on
   *     inflate
   * @param {Number} [options.threshold=1024] Size (in bytes) below which
   *     messages should not be compressed
   * @param {Number} [options.concurrencyLimit=10] The number of concurrent
   *     calls to zlib
   * @param {Boolean} [isServer=false] Create the instance in either server or
   *     client mode
   * @param {Number} [maxPayload=0] The maximum allowed message length
   */
  constructor(options, isServer, maxPayload) {
    this._maxPayload = maxPayload | 0;
    this._options = options || {};
    this._threshold =
      this._options.threshold !== undefined ? this._options.threshold : 1024;
    this._isServer = !!isServer;
    this._deflate = null;
    this._inflate = null;

    this.params = null;

    if (!zlibLimiter) {
      const concurrency =
        this._options.concurrencyLimit !== undefined
          ? this._options.concurrencyLimit
          : 10;
      zlibLimiter = new Limiter(concurrency);
    }
  }

  /**
   * @type {String}
   */
  static get extensionName() {
    return 'permessage-deflate';
  }

  /**
   * Create an extension negotiation offer.
   *
   * @return {Object} Extension parameters
   * @public
   */
  offer() {
    const params = {};

    if (this._options.serverNoContextTakeover) {
      params.server_no_context_takeover = true;
    }
    if (this._options.clientNoContextTakeover) {
      params.client_no_context_takeover = true;
    }
    if (this._options.serverMaxWindowBits) {
      params.server_max_window_bits = this._options.serverMaxWindowBits;
    }
    if (this._options.clientMaxWindowBits) {
      params.client_max_window_bits = this._options.clientMaxWindowBits;
    } else if (this._options.clientMaxWindowBits == null) {
      params.client_max_window_bits = true;
    }

    return params;
  }

  /**
   * Accept an extension negotiation offer/response.
   *
   * @param {Array} configurations The extension negotiation offers/reponse
   * @return {Object} Accepted configuration
   * @public
   */
  accept(configurations) {
    configurations = this.normalizeParams(configurations);

    this.params = this._isServer
      ? this.acceptAsServer(configurations)
      : this.acceptAsClient(configurations);

    return this.params;
  }

  /**
   * Releases all resources used by the extension.
   *
   * @public
   */
  cleanup() {
    if (this._inflate) {
      this._inflate.close();
      this._inflate = null;
    }

    if (this._deflate) {
      const callback = this._deflate[kCallback];

      this._deflate.close();
      this._deflate = null;

      if (callback) {
        callback(
          new Error(
            'The deflate stream was closed while data was being processed'
          )
        );
      }
    }
  }

  /**
   *  Accept an extension negotiation offer.
   *
   * @param {Array} offers The extension negotiation offers
   * @return {Object} Accepted configuration
   * @private
   */
  acceptAsServer(offers) {
    const opts = this._options;
    const accepted = offers.find((params) => {
      if (
        (opts.serverNoContextTakeover === false &&
          params.server_no_context_takeover) ||
        (params.server_max_window_bits &&
          (opts.serverMaxWindowBits === false ||
            (typeof opts.serverMaxWindowBits === 'number' &&
              opts.serverMaxWindowBits > params.server_max_window_bits))) ||
        (typeof opts.clientMaxWindowBits === 'number' &&
          !params.client_max_window_bits)
      ) {
        return false;
      }

      return true;
    });

    if (!accepted) {
      throw new Error('None of the extension offers can be accepted');
    }

    if (opts.serverNoContextTakeover) {
      accepted.server_no_context_takeover = true;
    }
    if (opts.clientNoContextTakeover) {
      accepted.client_no_context_takeover = true;
    }
    if (typeof opts.serverMaxWindowBits === 'number') {
      accepted.server_max_window_bits = opts.serverMaxWindowBits;
    }
    if (typeof opts.clientMaxWindowBits === 'number') {
      accepted.client_max_window_bits = opts.clientMaxWindowBits;
    } else if (
      accepted.client_max_window_bits === true ||
      opts.clientMaxWindowBits === false
    ) {
      delete accepted.client_max_window_bits;
    }

    return accepted;
  }

  /**
   * Accept the extension negotiation response.
   *
   * @param {Array} response The extension negotiation response
   * @return {Object} Accepted configuration
   * @private
   */
  acceptAsClient(response) {
    const params = response[0];

    if (
      this._options.clientNoContextTakeover === false &&
      params.client_no_context_takeover
    ) {
      throw new Error('Unexpected parameter "client_no_context_takeover"');
    }

    if (!params.client_max_window_bits) {
      if (typeof this._options.clientMaxWindowBits === 'number') {
        params.client_max_window_bits = this._options.clientMaxWindowBits;
      }
    } else if (
      this._options.clientMaxWindowBits === false ||
      (typeof this._options.clientMaxWindowBits === 'number' &&
        params.client_max_window_bits > this._options.clientMaxWindowBits)
    ) {
      throw new Error(
        'Unexpected or invalid parameter "client_max_window_bits"'
      );
    }

    return params;
  }

  /**
   * Normalize parameters.
   *
   * @param {Array} configurations The extension negotiation offers/reponse
   * @return {Array} The offers/response with normalized parameters
   * @private
   */
  normalizeParams(configurations) {
    configurations.forEach((params) => {
      Object.keys(params).forEach((key) => {
        let value = params[key];

        if (value.length > 1) {
          throw new Error(`Parameter "${key}" must have only a single value`);
        }

        value = value[0];

        if (key === 'client_max_window_bits') {
          if (value !== true) {
            const num = +value;
            if (!Number.isInteger(num) || num < 8 || num > 15) {
              throw new TypeError(
                `Invalid value for parameter "${key}": ${value}`
              );
            }
            value = num;
          } else if (!this._isServer) {
            throw new TypeError(
              `Invalid value for parameter "${key}": ${value}`
            );
          }
        } else if (key === 'server_max_window_bits') {
          const num = +value;
          if (!Number.isInteger(num) || num < 8 || num > 15) {
            throw new TypeError(
              `Invalid value for parameter "${key}": ${value}`
            );
          }
          value = num;
        } else if (
          key === 'client_no_context_takeover' ||
          key === 'server_no_context_takeover'
        ) {
          if (value !== true) {
            throw new TypeError(
              `Invalid value for parameter "${key}": ${value}`
            );
          }
        } else {
          throw new Error(`Unknown parameter "${key}"`);
        }

        params[key] = value;
      });
    });

    return configurations;
  }

  /**
   * Decompress data. Concurrency limited.
   *
   * @param {Buffer} data Compressed data
   * @param {Boolean} fin Specifies whether or not this is the last fragment
   * @param {Function} callback Callback
   * @public
   */
  decompress(data, fin, callback) {
    zlibLimiter.add((done) => {
      this._decompress(data, fin, (err, result) => {
        done();
        callback(err, result);
      });
    });
  }

  /**
   * Compress data. Concurrency limited.
   *
   * @param {Buffer} data Data to compress
   * @param {Boolean} fin Specifies whether or not this is the last fragment
   * @param {Function} callback Callback
   * @public
   */
  compress(data, fin, callback) {
    zlibLimiter.add((done) => {
      this._compress(data, fin, (err, result) => {
        done();
        callback(err, result);
      });
    });
  }

  /**
   * Decompress data.
   *
   * @param {Buffer} data Compressed data
   * @param {Boolean} fin Specifies whether or not this is the last fragment
   * @param {Function} callback Callback
   * @private
   */
  _decompress(data, fin, callback) {
    const endpoint = this._isServer ? 'client' : 'server';

    if (!this._inflate) {
      const key = `${endpoint}_max_window_bits`;
      const windowBits =
        typeof this.params[key] !== 'number'
          ? zlib.Z_DEFAULT_WINDOWBITS
          : this.params[key];

      this._inflate = zlib.createInflateRaw({
        ...this._options.zlibInflateOptions,
        windowBits
      });
      this._inflate[kPerMessageDeflate] = this;
      this._inflate[kTotalLength] = 0;
      this._inflate[kBuffers] = [];
      this._inflate.on('error', inflateOnError);
      this._inflate.on('data', inflateOnData);
    }

    this._inflate[kCallback] = callback;

    this._inflate.write(data);
    if (fin) this._inflate.write(TRAILER);

    this._inflate.flush(() => {
      const err = this._inflate[kError];

      if (err) {
        this._inflate.close();
        this._inflate = null;
        callback(err);
        return;
      }

      const data = bufferUtil.concat(
        this._inflate[kBuffers],
        this._inflate[kTotalLength]
      );

      if (this._inflate._readableState.endEmitted) {
        this._inflate.close();
        this._inflate = null;
      } else {
        this._inflate[kTotalLength] = 0;
        this._inflate[kBuffers] = [];

        if (fin && this.params[`${endpoint}_no_context_takeover`]) {
          this._inflate.reset();
        }
      }

      callback(null, data);
    });
  }

  /**
   * Compress data.
   *
   * @param {Buffer} data Data to compress
   * @param {Boolean} fin Specifies whether or not this is the last fragment
   * @param {Function} callback Callback
   * @private
   */
  _compress(data, fin, callback) {
    const endpoint = this._isServer ? 'server' : 'client';

    if (!this._deflate) {
      const key = `${endpoint}_max_window_bits`;
      const windowBits =
        typeof this.params[key] !== 'number'
          ? zlib.Z_DEFAULT_WINDOWBITS
          : this.params[key];

      this._deflate = zlib.createDeflateRaw({
        ...this._options.zlibDeflateOptions,
        windowBits
      });

      this._deflate[kTotalLength] = 0;
      this._deflate[kBuffers] = [];

      //
      // An `'error'` event is emitted, only on Node.js < 10.0.0, if the
      // `zlib.DeflateRaw` instance is closed while data is being processed.
      // This can happen if `PerMessageDeflate#cleanup()` is called at the wrong
      // time due to an abnormal WebSocket closure.
      //
      this._deflate.on('error', NOOP);
      this._deflate.on('data', deflateOnData);
    }

    this._deflate[kCallback] = callback;

    this._deflate.write(data);
    this._deflate.flush(zlib.Z_SYNC_FLUSH, () => {
      if (!this._deflate) {
        //
        // The deflate stream was closed while data was being processed.
        //
        return;
      }

      let data = bufferUtil.concat(
        this._deflate[kBuffers],
        this._deflate[kTotalLength]
      );

      if (fin) data = data.slice(0, data.length - 4);

      //
      // Ensure that the callback will not be called again in
      // `PerMessageDeflate#cleanup()`.
      //
      this._deflate[kCallback] = null;

      this._deflate[kTotalLength] = 0;
      this._deflate[kBuffers] = [];

      if (fin && this.params[`${endpoint}_no_context_takeover`]) {
        this._deflate.reset();
      }

      callback(null, data);
    });
  }
}

module.exports = PerMessageDeflate;

/**
 * The listener of the `zlib.DeflateRaw` stream `'data'` event.
 *
 * @param {Buffer} chunk A chunk of data
 * @private
 */
function deflateOnData(chunk) {
  this[kBuffers].push(chunk);
  this[kTotalLength] += chunk.length;
}

/**
 * The listener of the `zlib.InflateRaw` stream `'data'` event.
 *
 * @param {Buffer} chunk A chunk of data
 * @private
 */
function inflateOnData(chunk) {
  this[kTotalLength] += chunk.length;

  if (
    this[kPerMessageDeflate]._maxPayload < 1 ||
    this[kTotalLength] <= this[kPerMessageDeflate]._maxPayload
  ) {
    this[kBuffers].push(chunk);
    return;
  }

  this[kError] = new RangeError('Max payload size exceeded');
  this[kError].code = 'WS_ERR_UNSUPPORTED_MESSAGE_LENGTH';
  this[kError][kStatusCode] = 1009;
  this.removeListener('data', inflateOnData);
  this.reset();
}

/**
 * The listener of the `zlib.InflateRaw` stream `'error'` event.
 *
 * @param {Error} err The emitted error
 * @private
 */
function inflateOnError(err) {
  //
  // There is no need to call `Zlib#close()` as the handle is automatically
  // closed when an error is emitted.
  //
  this[kPerMessageDeflate]._inflate = null;
  err[kStatusCode] = 1007;
  this[kCallback](err);
}


/***/ }),

/***/ 5066:
/***/ ((module, __unused_webpack_exports, __nccwpck_require__) => {

"use strict";


const { Writable } = __nccwpck_require__(2781);

const PerMessageDeflate = __nccwpck_require__(6684);
const {
  BINARY_TYPES,
  EMPTY_BUFFER,
  kStatusCode,
  kWebSocket
} = __nccwpck_require__(5949);
const { concat, toArrayBuffer, unmask } = __nccwpck_require__(9436);
const { isValidStatusCode, isValidUTF8 } = __nccwpck_require__(6279);

const GET_INFO = 0;
const GET_PAYLOAD_LENGTH_16 = 1;
const GET_PAYLOAD_LENGTH_64 = 2;
const GET_MASK = 3;
const GET_DATA = 4;
const INFLATING = 5;

/**
 * HyBi Receiver implementation.
 *
 * @extends Writable
 */
class Receiver extends Writable {
  /**
   * Creates a Receiver instance.
   *
   * @param {String} [binaryType=nodebuffer] The type for binary data
   * @param {Object} [extensions] An object containing the negotiated extensions
   * @param {Boolean} [isServer=false] Specifies whether to operate in client or
   *     server mode
   * @param {Number} [maxPayload=0] The maximum allowed message length
   */
  constructor(binaryType, extensions, isServer, maxPayload) {
    super();

    this._binaryType = binaryType || BINARY_TYPES[0];
    this[kWebSocket] = undefined;
    this._extensions = extensions || {};
    this._isServer = !!isServer;
    this._maxPayload = maxPayload | 0;

    this._bufferedBytes = 0;
    this._buffers = [];

    this._compressed = false;
    this._payloadLength = 0;
    this._mask = undefined;
    this._fragmented = 0;
    this._masked = false;
    this._fin = false;
    this._opcode = 0;

    this._totalPayloadLength = 0;
    this._messageLength = 0;
    this._fragments = [];

    this._state = GET_INFO;
    this._loop = false;
  }

  /**
   * Implements `Writable.prototype._write()`.
   *
   * @param {Buffer} chunk The chunk of data to write
   * @param {String} encoding The character encoding of `chunk`
   * @param {Function} cb Callback
   * @private
   */
  _write(chunk, encoding, cb) {
    if (this._opcode === 0x08 && this._state == GET_INFO) return cb();

    this._bufferedBytes += chunk.length;
    this._buffers.push(chunk);
    this.startLoop(cb);
  }

  /**
   * Consumes `n` bytes from the buffered data.
   *
   * @param {Number} n The number of bytes to consume
   * @return {Buffer} The consumed bytes
   * @private
   */
  consume(n) {
    this._bufferedBytes -= n;

    if (n === this._buffers[0].length) return this._buffers.shift();

    if (n < this._buffers[0].length) {
      const buf = this._buffers[0];
      this._buffers[0] = buf.slice(n);
      return buf.slice(0, n);
    }

    const dst = Buffer.allocUnsafe(n);

    do {
      const buf = this._buffers[0];
      const offset = dst.length - n;

      if (n >= buf.length) {
        dst.set(this._buffers.shift(), offset);
      } else {
        dst.set(new Uint8Array(buf.buffer, buf.byteOffset, n), offset);
        this._buffers[0] = buf.slice(n);
      }

      n -= buf.length;
    } while (n > 0);

    return dst;
  }

  /**
   * Starts the parsing loop.
   *
   * @param {Function} cb Callback
   * @private
   */
  startLoop(cb) {
    let err;
    this._loop = true;

    do {
      switch (this._state) {
        case GET_INFO:
          err = this.getInfo();
          break;
        case GET_PAYLOAD_LENGTH_16:
          err = this.getPayloadLength16();
          break;
        case GET_PAYLOAD_LENGTH_64:
          err = this.getPayloadLength64();
          break;
        case GET_MASK:
          this.getMask();
          break;
        case GET_DATA:
          err = this.getData(cb);
          break;
        default:
          // `INFLATING`
          this._loop = false;
          return;
      }
    } while (this._loop);

    cb(err);
  }

  /**
   * Reads the first two bytes of a frame.
   *
   * @return {(RangeError|undefined)} A possible error
   * @private
   */
  getInfo() {
    if (this._bufferedBytes < 2) {
      this._loop = false;
      return;
    }

    const buf = this.consume(2);

    if ((buf[0] & 0x30) !== 0x00) {
      this._loop = false;
      return error(
        RangeError,
        'RSV2 and RSV3 must be clear',
        true,
        1002,
        'WS_ERR_UNEXPECTED_RSV_2_3'
      );
    }

    const compressed = (buf[0] & 0x40) === 0x40;

    if (compressed && !this._extensions[PerMessageDeflate.extensionName]) {
      this._loop = false;
      return error(
        RangeError,
        'RSV1 must be clear',
        true,
        1002,
        'WS_ERR_UNEXPECTED_RSV_1'
      );
    }

    this._fin = (buf[0] & 0x80) === 0x80;
    this._opcode = buf[0] & 0x0f;
    this._payloadLength = buf[1] & 0x7f;

    if (this._opcode === 0x00) {
      if (compressed) {
        this._loop = false;
        return error(
          RangeError,
          'RSV1 must be clear',
          true,
          1002,
          'WS_ERR_UNEXPECTED_RSV_1'
        );
      }

      if (!this._fragmented) {
        this._loop = false;
        return error(
          RangeError,
          'invalid opcode 0',
          true,
          1002,
          'WS_ERR_INVALID_OPCODE'
        );
      }

      this._opcode = this._fragmented;
    } else if (this._opcode === 0x01 || this._opcode === 0x02) {
      if (this._fragmented) {
        this._loop = false;
        return error(
          RangeError,
          `invalid opcode ${this._opcode}`,
          true,
          1002,
          'WS_ERR_INVALID_OPCODE'
        );
      }

      this._compressed = compressed;
    } else if (this._opcode > 0x07 && this._opcode < 0x0b) {
      if (!this._fin) {
        this._loop = false;
        return error(
          RangeError,
          'FIN must be set',
          true,
          1002,
          'WS_ERR_EXPECTED_FIN'
        );
      }

      if (compressed) {
        this._loop = false;
        return error(
          RangeError,
          'RSV1 must be clear',
          true,
          1002,
          'WS_ERR_UNEXPECTED_RSV_1'
        );
      }

      if (this._payloadLength > 0x7d) {
        this._loop = false;
        return error(
          RangeError,
          `invalid payload length ${this._payloadLength}`,
          true,
          1002,
          'WS_ERR_INVALID_CONTROL_PAYLOAD_LENGTH'
        );
      }
    } else {
      this._loop = false;
      return error(
        RangeError,
        `invalid opcode ${this._opcode}`,
        true,
        1002,
        'WS_ERR_INVALID_OPCODE'
      );
    }

    if (!this._fin && !this._fragmented) this._fragmented = this._opcode;
    this._masked = (buf[1] & 0x80) === 0x80;

    if (this._isServer) {
      if (!this._masked) {
        this._loop = false;
        return error(
          RangeError,
          'MASK must be set',
          true,
          1002,
          'WS_ERR_EXPECTED_MASK'
        );
      }
    } else if (this._masked) {
      this._loop = false;
      return error(
        RangeError,
        'MASK must be clear',
        true,
        1002,
        'WS_ERR_UNEXPECTED_MASK'
      );
    }

    if (this._payloadLength === 126) this._state = GET_PAYLOAD_LENGTH_16;
    else if (this._payloadLength === 127) this._state = GET_PAYLOAD_LENGTH_64;
    else return this.haveLength();
  }

  /**
   * Gets extended payload length (7+16).
   *
   * @return {(RangeError|undefined)} A possible error
   * @private
   */
  getPayloadLength16() {
    if (this._bufferedBytes < 2) {
      this._loop = false;
      return;
    }

    this._payloadLength = this.consume(2).readUInt16BE(0);
    return this.haveLength();
  }

  /**
   * Gets extended payload length (7+64).
   *
   * @return {(RangeError|undefined)} A possible error
   * @private
   */
  getPayloadLength64() {
    if (this._bufferedBytes < 8) {
      this._loop = false;
      return;
    }

    const buf = this.consume(8);
    const num = buf.readUInt32BE(0);

    //
    // The maximum safe integer in JavaScript is 2^53 - 1. An error is returned
    // if payload length is greater than this number.
    //
    if (num > Math.pow(2, 53 - 32) - 1) {
      this._loop = false;
      return error(
        RangeError,
        'Unsupported WebSocket frame: payload length > 2^53 - 1',
        false,
        1009,
        'WS_ERR_UNSUPPORTED_DATA_PAYLOAD_LENGTH'
      );
    }

    this._payloadLength = num * Math.pow(2, 32) + buf.readUInt32BE(4);
    return this.haveLength();
  }

  /**
   * Payload length has been read.
   *
   * @return {(RangeError|undefined)} A possible error
   * @private
   */
  haveLength() {
    if (this._payloadLength && this._opcode < 0x08) {
      this._totalPayloadLength += this._payloadLength;
      if (this._totalPayloadLength > this._maxPayload && this._maxPayload > 0) {
        this._loop = false;
        return error(
          RangeError,
          'Max payload size exceeded',
          false,
          1009,
          'WS_ERR_UNSUPPORTED_MESSAGE_LENGTH'
        );
      }
    }

    if (this._masked) this._state = GET_MASK;
    else this._state = GET_DATA;
  }

  /**
   * Reads mask bytes.
   *
   * @private
   */
  getMask() {
    if (this._bufferedBytes < 4) {
      this._loop = false;
      return;
    }

    this._mask = this.consume(4);
    this._state = GET_DATA;
  }

  /**
   * Reads data bytes.
   *
   * @param {Function} cb Callback
   * @return {(Error|RangeError|undefined)} A possible error
   * @private
   */
  getData(cb) {
    let data = EMPTY_BUFFER;

    if (this._payloadLength) {
      if (this._bufferedBytes < this._payloadLength) {
        this._loop = false;
        return;
      }

      data = this.consume(this._payloadLength);
      if (this._masked) unmask(data, this._mask);
    }

    if (this._opcode > 0x07) return this.controlMessage(data);

    if (this._compressed) {
      this._state = INFLATING;
      this.decompress(data, cb);
      return;
    }

    if (data.length) {
      //
      // This message is not compressed so its lenght is the sum of the payload
      // length of all fragments.
      //
      this._messageLength = this._totalPayloadLength;
      this._fragments.push(data);
    }

    return this.dataMessage();
  }

  /**
   * Decompresses data.
   *
   * @param {Buffer} data Compressed data
   * @param {Function} cb Callback
   * @private
   */
  decompress(data, cb) {
    const perMessageDeflate = this._extensions[PerMessageDeflate.extensionName];

    perMessageDeflate.decompress(data, this._fin, (err, buf) => {
      if (err) return cb(err);

      if (buf.length) {
        this._messageLength += buf.length;
        if (this._messageLength > this._maxPayload && this._maxPayload > 0) {
          return cb(
            error(
              RangeError,
              'Max payload size exceeded',
              false,
              1009,
              'WS_ERR_UNSUPPORTED_MESSAGE_LENGTH'
            )
          );
        }

        this._fragments.push(buf);
      }

      const er = this.dataMessage();
      if (er) return cb(er);

      this.startLoop(cb);
    });
  }

  /**
   * Handles a data message.
   *
   * @return {(Error|undefined)} A possible error
   * @private
   */
  dataMessage() {
    if (this._fin) {
      const messageLength = this._messageLength;
      const fragments = this._fragments;

      this._totalPayloadLength = 0;
      this._messageLength = 0;
      this._fragmented = 0;
      this._fragments = [];

      if (this._opcode === 2) {
        let data;

        if (this._binaryType === 'nodebuffer') {
          data = concat(fragments, messageLength);
        } else if (this._binaryType === 'arraybuffer') {
          data = toArrayBuffer(concat(fragments, messageLength));
        } else {
          data = fragments;
        }

        this.emit('message', data);
      } else {
        const buf = concat(fragments, messageLength);

        if (!isValidUTF8(buf)) {
          this._loop = false;
          return error(
            Error,
            'invalid UTF-8 sequence',
            true,
            1007,
            'WS_ERR_INVALID_UTF8'
          );
        }

        this.emit('message', buf.toString());
      }
    }

    this._state = GET_INFO;
  }

  /**
   * Handles a control message.
   *
   * @param {Buffer} data Data to handle
   * @return {(Error|RangeError|undefined)} A possible error
   * @private
   */
  controlMessage(data) {
    if (this._opcode === 0x08) {
      this._loop = false;

      if (data.length === 0) {
        this.emit('conclude', 1005, '');
        this.end();
      } else if (data.length === 1) {
        return error(
          RangeError,
          'invalid payload length 1',
          true,
          1002,
          'WS_ERR_INVALID_CONTROL_PAYLOAD_LENGTH'
        );
      } else {
        const code = data.readUInt16BE(0);

        if (!isValidStatusCode(code)) {
          return error(
            RangeError,
            `invalid status code ${code}`,
            true,
            1002,
            'WS_ERR_INVALID_CLOSE_CODE'
          );
        }

        const buf = data.slice(2);

        if (!isValidUTF8(buf)) {
          return error(
            Error,
            'invalid UTF-8 sequence',
            true,
            1007,
            'WS_ERR_INVALID_UTF8'
          );
        }

        this.emit('conclude', code, buf.toString());
        this.end();
      }
    } else if (this._opcode === 0x09) {
      this.emit('ping', data);
    } else {
      this.emit('pong', data);
    }

    this._state = GET_INFO;
  }
}

module.exports = Receiver;

/**
 * Builds an error object.
 *
 * @param {function(new:Error|RangeError)} ErrorCtor The error constructor
 * @param {String} message The error message
 * @param {Boolean} prefix Specifies whether or not to add a default prefix to
 *     `message`
 * @param {Number} statusCode The status code
 * @param {String} errorCode The exposed error code
 * @return {(Error|RangeError)} The error
 * @private
 */
function error(ErrorCtor, message, prefix, statusCode, errorCode) {
  const err = new ErrorCtor(
    prefix ? `Invalid WebSocket frame: ${message}` : message
  );

  Error.captureStackTrace(err, error);
  err.code = errorCode;
  err[kStatusCode] = statusCode;
  return err;
}


/***/ }),

/***/ 6947:
/***/ ((module, __unused_webpack_exports, __nccwpck_require__) => {

"use strict";
/* eslint no-unused-vars: ["error", { "varsIgnorePattern": "^net|tls$" }] */



const net = __nccwpck_require__(1808);
const tls = __nccwpck_require__(4404);
const { randomFillSync } = __nccwpck_require__(6113);

const PerMessageDeflate = __nccwpck_require__(6684);
const { EMPTY_BUFFER } = __nccwpck_require__(5949);
const { isValidStatusCode } = __nccwpck_require__(6279);
const { mask: applyMask, toBuffer } = __nccwpck_require__(9436);

const mask = Buffer.alloc(4);

/**
 * HyBi Sender implementation.
 */
class Sender {
  /**
   * Creates a Sender instance.
   *
   * @param {(net.Socket|tls.Socket)} socket The connection socket
   * @param {Object} [extensions] An object containing the negotiated extensions
   */
  constructor(socket, extensions) {
    this._extensions = extensions || {};
    this._socket = socket;

    this._firstFragment = true;
    this._compress = false;

    this._bufferedBytes = 0;
    this._deflating = false;
    this._queue = [];
  }

  /**
   * Frames a piece of data according to the HyBi WebSocket protocol.
   *
   * @param {Buffer} data The data to frame
   * @param {Object} options Options object
   * @param {Number} options.opcode The opcode
   * @param {Boolean} [options.readOnly=false] Specifies whether `data` can be
   *     modified
   * @param {Boolean} [options.fin=false] Specifies whether or not to set the
   *     FIN bit
   * @param {Boolean} [options.mask=false] Specifies whether or not to mask
   *     `data`
   * @param {Boolean} [options.rsv1=false] Specifies whether or not to set the
   *     RSV1 bit
   * @return {Buffer[]} The framed data as a list of `Buffer` instances
   * @public
   */
  static frame(data, options) {
    const merge = options.mask && options.readOnly;
    let offset = options.mask ? 6 : 2;
    let payloadLength = data.length;

    if (data.length >= 65536) {
      offset += 8;
      payloadLength = 127;
    } else if (data.length > 125) {
      offset += 2;
      payloadLength = 126;
    }

    const target = Buffer.allocUnsafe(merge ? data.length + offset : offset);

    target[0] = options.fin ? options.opcode | 0x80 : options.opcode;
    if (options.rsv1) target[0] |= 0x40;

    target[1] = payloadLength;

    if (payloadLength === 126) {
      target.writeUInt16BE(data.length, 2);
    } else if (payloadLength === 127) {
      target.writeUInt32BE(0, 2);
      target.writeUInt32BE(data.length, 6);
    }

    if (!options.mask) return [target, data];

    randomFillSync(mask, 0, 4);

    target[1] |= 0x80;
    target[offset - 4] = mask[0];
    target[offset - 3] = mask[1];
    target[offset - 2] = mask[2];
    target[offset - 1] = mask[3];

    if (merge) {
      applyMask(data, mask, target, offset, data.length);
      return [target];
    }

    applyMask(data, mask, data, 0, data.length);
    return [target, data];
  }

  /**
   * Sends a close message to the other peer.
   *
   * @param {Number} [code] The status code component of the body
   * @param {String} [data] The message component of the body
   * @param {Boolean} [mask=false] Specifies whether or not to mask the message
   * @param {Function} [cb] Callback
   * @public
   */
  close(code, data, mask, cb) {
    let buf;

    if (code === undefined) {
      buf = EMPTY_BUFFER;
    } else if (typeof code !== 'number' || !isValidStatusCode(code)) {
      throw new TypeError('First argument must be a valid error code number');
    } else if (data === undefined || data === '') {
      buf = Buffer.allocUnsafe(2);
      buf.writeUInt16BE(code, 0);
    } else {
      const length = Buffer.byteLength(data);

      if (length > 123) {
        throw new RangeError('The message must not be greater than 123 bytes');
      }

      buf = Buffer.allocUnsafe(2 + length);
      buf.writeUInt16BE(code, 0);
      buf.write(data, 2);
    }

    if (this._deflating) {
      this.enqueue([this.doClose, buf, mask, cb]);
    } else {
      this.doClose(buf, mask, cb);
    }
  }

  /**
   * Frames and sends a close message.
   *
   * @param {Buffer} data The message to send
   * @param {Boolean} [mask=false] Specifies whether or not to mask `data`
   * @param {Function} [cb] Callback
   * @private
   */
  doClose(data, mask, cb) {
    this.sendFrame(
      Sender.frame(data, {
        fin: true,
        rsv1: false,
        opcode: 0x08,
        mask,
        readOnly: false
      }),
      cb
    );
  }

  /**
   * Sends a ping message to the other peer.
   *
   * @param {*} data The message to send
   * @param {Boolean} [mask=false] Specifies whether or not to mask `data`
   * @param {Function} [cb] Callback
   * @public
   */
  ping(data, mask, cb) {
    const buf = toBuffer(data);

    if (buf.length > 125) {
      throw new RangeError('The data size must not be greater than 125 bytes');
    }

    if (this._deflating) {
      this.enqueue([this.doPing, buf, mask, toBuffer.readOnly, cb]);
    } else {
      this.doPing(buf, mask, toBuffer.readOnly, cb);
    }
  }

  /**
   * Frames and sends a ping message.
   *
   * @param {Buffer} data The message to send
   * @param {Boolean} [mask=false] Specifies whether or not to mask `data`
   * @param {Boolean} [readOnly=false] Specifies whether `data` can be modified
   * @param {Function} [cb] Callback
   * @private
   */
  doPing(data, mask, readOnly, cb) {
    this.sendFrame(
      Sender.frame(data, {
        fin: true,
        rsv1: false,
        opcode: 0x09,
        mask,
        readOnly
      }),
      cb
    );
  }

  /**
   * Sends a pong message to the other peer.
   *
   * @param {*} data The message to send
   * @param {Boolean} [mask=false] Specifies whether or not to mask `data`
   * @param {Function} [cb] Callback
   * @public
   */
  pong(data, mask, cb) {
    const buf = toBuffer(data);

    if (buf.length > 125) {
      throw new RangeError('The data size must not be greater than 125 bytes');
    }

    if (this._deflating) {
      this.enqueue([this.doPong, buf, mask, toBuffer.readOnly, cb]);
    } else {
      this.doPong(buf, mask, toBuffer.readOnly, cb);
    }
  }

  /**
   * Frames and sends a pong message.
   *
   * @param {Buffer} data The message to send
   * @param {Boolean} [mask=false] Specifies whether or not to mask `data`
   * @param {Boolean} [readOnly=false] Specifies whether `data` can be modified
   * @param {Function} [cb] Callback
   * @private
   */
  doPong(data, mask, readOnly, cb) {
    this.sendFrame(
      Sender.frame(data, {
        fin: true,
        rsv1: false,
        opcode: 0x0a,
        mask,
        readOnly
      }),
      cb
    );
  }

  /**
   * Sends a data message to the other peer.
   *
   * @param {*} data The message to send
   * @param {Object} options Options object
   * @param {Boolean} [options.compress=false] Specifies whether or not to
   *     compress `data`
   * @param {Boolean} [options.binary=false] Specifies whether `data` is binary
   *     or text
   * @param {Boolean} [options.fin=false] Specifies whether the fragment is the
   *     last one
   * @param {Boolean} [options.mask=false] Specifies whether or not to mask
   *     `data`
   * @param {Function} [cb] Callback
   * @public
   */
  send(data, options, cb) {
    const buf = toBuffer(data);
    const perMessageDeflate = this._extensions[PerMessageDeflate.extensionName];
    let opcode = options.binary ? 2 : 1;
    let rsv1 = options.compress;

    if (this._firstFragment) {
      this._firstFragment = false;
      if (rsv1 && perMessageDeflate) {
        rsv1 = buf.length >= perMessageDeflate._threshold;
      }
      this._compress = rsv1;
    } else {
      rsv1 = false;
      opcode = 0;
    }

    if (options.fin) this._firstFragment = true;

    if (perMessageDeflate) {
      const opts = {
        fin: options.fin,
        rsv1,
        opcode,
        mask: options.mask,
        readOnly: toBuffer.readOnly
      };

      if (this._deflating) {
        this.enqueue([this.dispatch, buf, this._compress, opts, cb]);
      } else {
        this.dispatch(buf, this._compress, opts, cb);
      }
    } else {
      this.sendFrame(
        Sender.frame(buf, {
          fin: options.fin,
          rsv1: false,
          opcode,
          mask: options.mask,
          readOnly: toBuffer.readOnly
        }),
        cb
      );
    }
  }

  /**
   * Dispatches a data message.
   *
   * @param {Buffer} data The message to send
   * @param {Boolean} [compress=false] Specifies whether or not to compress
   *     `data`
   * @param {Object} options Options object
   * @param {Number} options.opcode The opcode
   * @param {Boolean} [options.readOnly=false] Specifies whether `data` can be
   *     modified
   * @param {Boolean} [options.fin=false] Specifies whether or not to set the
   *     FIN bit
   * @param {Boolean} [options.mask=false] Specifies whether or not to mask
   *     `data`
   * @param {Boolean} [options.rsv1=false] Specifies whether or not to set the
   *     RSV1 bit
   * @param {Function} [cb] Callback
   * @private
   */
  dispatch(data, compress, options, cb) {
    if (!compress) {
      this.sendFrame(Sender.frame(data, options), cb);
      return;
    }

    const perMessageDeflate = this._extensions[PerMessageDeflate.extensionName];

    this._bufferedBytes += data.length;
    this._deflating = true;
    perMessageDeflate.compress(data, options.fin, (_, buf) => {
      if (this._socket.destroyed) {
        const err = new Error(
          'The socket was closed while data was being compressed'
        );

        if (typeof cb === 'function') cb(err);

        for (let i = 0; i < this._queue.length; i++) {
          const callback = this._queue[i][4];

          if (typeof callback === 'function') callback(err);
        }

        return;
      }

      this._bufferedBytes -= data.length;
      this._deflating = false;
      options.readOnly = false;
      this.sendFrame(Sender.frame(buf, options), cb);
      this.dequeue();
    });
  }

  /**
   * Executes queued send operations.
   *
   * @private
   */
  dequeue() {
    while (!this._deflating && this._queue.length) {
      const params = this._queue.shift();

      this._bufferedBytes -= params[1].length;
      Reflect.apply(params[0], this, params.slice(1));
    }
  }

  /**
   * Enqueues a send operation.
   *
   * @param {Array} params Send operation parameters.
   * @private
   */
  enqueue(params) {
    this._bufferedBytes += params[1].length;
    this._queue.push(params);
  }

  /**
   * Sends a frame.
   *
   * @param {Buffer[]} list The frame to send
   * @param {Function} [cb] Callback
   * @private
   */
  sendFrame(list, cb) {
    if (list.length === 2) {
      this._socket.cork();
      this._socket.write(list[0]);
      this._socket.write(list[1], cb);
      this._socket.uncork();
    } else {
      this._socket.write(list[0], cb);
    }
  }
}

module.exports = Sender;


/***/ }),

/***/ 1658:
/***/ ((module, __unused_webpack_exports, __nccwpck_require__) => {

"use strict";


const { Duplex } = __nccwpck_require__(2781);

/**
 * Emits the `'close'` event on a stream.
 *
 * @param {Duplex} stream The stream.
 * @private
 */
function emitClose(stream) {
  stream.emit('close');
}

/**
 * The listener of the `'end'` event.
 *
 * @private
 */
function duplexOnEnd() {
  if (!this.destroyed && this._writableState.finished) {
    this.destroy();
  }
}

/**
 * The listener of the `'error'` event.
 *
 * @param {Error} err The error
 * @private
 */
function duplexOnError(err) {
  this.removeListener('error', duplexOnError);
  this.destroy();
  if (this.listenerCount('error') === 0) {
    // Do not suppress the throwing behavior.
    this.emit('error', err);
  }
}

/**
 * Wraps a `WebSocket` in a duplex stream.
 *
 * @param {WebSocket} ws The `WebSocket` to wrap
 * @param {Object} [options] The options for the `Duplex` constructor
 * @return {Duplex} The duplex stream
 * @public
 */
function createWebSocketStream(ws, options) {
  let resumeOnReceiverDrain = true;
  let terminateOnDestroy = true;

  function receiverOnDrain() {
    if (resumeOnReceiverDrain) ws._socket.resume();
  }

  if (ws.readyState === ws.CONNECTING) {
    ws.once('open', function open() {
      ws._receiver.removeAllListeners('drain');
      ws._receiver.on('drain', receiverOnDrain);
    });
  } else {
    ws._receiver.removeAllListeners('drain');
    ws._receiver.on('drain', receiverOnDrain);
  }

  const duplex = new Duplex({
    ...options,
    autoDestroy: false,
    emitClose: false,
    objectMode: false,
    writableObjectMode: false
  });

  ws.on('message', function message(msg) {
    if (!duplex.push(msg)) {
      resumeOnReceiverDrain = false;
      ws._socket.pause();
    }
  });

  ws.once('error', function error(err) {
    if (duplex.destroyed) return;

    // Prevent `ws.terminate()` from being called by `duplex._destroy()`.
    //
    // - If the `'error'` event is emitted before the `'open'` event, then
    //   `ws.terminate()` is a noop as no socket is assigned.
    // - Otherwise, the error is re-emitted by the listener of the `'error'`
    //   event of the `Receiver` object. The listener already closes the
    //   connection by calling `ws.close()`. This allows a close frame to be
    //   sent to the other peer. If `ws.terminate()` is called right after this,
    //   then the close frame might not be sent.
    terminateOnDestroy = false;
    duplex.destroy(err);
  });

  ws.once('close', function close() {
    if (duplex.destroyed) return;

    duplex.push(null);
  });

  duplex._destroy = function (err, callback) {
    if (ws.readyState === ws.CLOSED) {
      callback(err);
      process.nextTick(emitClose, duplex);
      return;
    }

    let called = false;

    ws.once('error', function error(err) {
      called = true;
      callback(err);
    });

    ws.once('close', function close() {
      if (!called) callback(err);
      process.nextTick(emitClose, duplex);
    });

    if (terminateOnDestroy) ws.terminate();
  };

  duplex._final = function (callback) {
    if (ws.readyState === ws.CONNECTING) {
      ws.once('open', function open() {
        duplex._final(callback);
      });
      return;
    }

    // If the value of the `_socket` property is `null` it means that `ws` is a
    // client websocket and the handshake failed. In fact, when this happens, a
    // socket is never assigned to the websocket. Wait for the `'error'` event
    // that will be emitted by the websocket.
    if (ws._socket === null) return;

    if (ws._socket._writableState.finished) {
      callback();
      if (duplex._readableState.endEmitted) duplex.destroy();
    } else {
      ws._socket.once('finish', function finish() {
        // `duplex` is not destroyed here because the `'end'` event will be
        // emitted on `duplex` after this `'finish'` event. The EOF signaling
        // `null` chunk is, in fact, pushed when the websocket emits `'close'`.
        callback();
      });
      ws.close();
    }
  };

  duplex._read = function () {
    if (
      (ws.readyState === ws.OPEN || ws.readyState === ws.CLOSING) &&
      !resumeOnReceiverDrain
    ) {
      resumeOnReceiverDrain = true;
      if (!ws._receiver._writableState.needDrain) ws._socket.resume();
    }
  };

  duplex._write = function (chunk, encoding, callback) {
    if (ws.readyState === ws.CONNECTING) {
      ws.once('open', function open() {
        duplex._write(chunk, encoding, callback);
      });
      return;
    }

    ws.send(chunk, callback);
  };

  duplex.on('end', duplexOnEnd);
  duplex.on('error', duplexOnError);
  return duplex;
}

module.exports = createWebSocketStream;


/***/ }),

/***/ 6279:
/***/ ((module, __unused_webpack_exports, __nccwpck_require__) => {

"use strict";


/**
 * Checks if a status code is allowed in a close frame.
 *
 * @param {Number} code The status code
 * @return {Boolean} `true` if the status code is valid, else `false`
 * @public
 */
function isValidStatusCode(code) {
  return (
    (code >= 1000 &&
      code <= 1014 &&
      code !== 1004 &&
      code !== 1005 &&
      code !== 1006) ||
    (code >= 3000 && code <= 4999)
  );
}

/**
 * Checks if a given buffer contains only correct UTF-8.
 * Ported from https://www.cl.cam.ac.uk/%7Emgk25/ucs/utf8_check.c by
 * Markus Kuhn.
 *
 * @param {Buffer} buf The buffer to check
 * @return {Boolean} `true` if `buf` contains only correct UTF-8, else `false`
 * @public
 */
function _isValidUTF8(buf) {
  const len = buf.length;
  let i = 0;

  while (i < len) {
    if ((buf[i] & 0x80) === 0) {
      // 0xxxxxxx
      i++;
    } else if ((buf[i] & 0xe0) === 0xc0) {
      // 110xxxxx 10xxxxxx
      if (
        i + 1 === len ||
        (buf[i + 1] & 0xc0) !== 0x80 ||
        (buf[i] & 0xfe) === 0xc0 // Overlong
      ) {
        return false;
      }

      i += 2;
    } else if ((buf[i] & 0xf0) === 0xe0) {
      // 1110xxxx 10xxxxxx 10xxxxxx
      if (
        i + 2 >= len ||
        (buf[i + 1] & 0xc0) !== 0x80 ||
        (buf[i + 2] & 0xc0) !== 0x80 ||
        (buf[i] === 0xe0 && (buf[i + 1] & 0xe0) === 0x80) || // Overlong
        (buf[i] === 0xed && (buf[i + 1] & 0xe0) === 0xa0) // Surrogate (U+D800 - U+DFFF)
      ) {
        return false;
      }

      i += 3;
    } else if ((buf[i] & 0xf8) === 0xf0) {
      // 11110xxx 10xxxxxx 10xxxxxx 10xxxxxx
      if (
        i + 3 >= len ||
        (buf[i + 1] & 0xc0) !== 0x80 ||
        (buf[i + 2] & 0xc0) !== 0x80 ||
        (buf[i + 3] & 0xc0) !== 0x80 ||
        (buf[i] === 0xf0 && (buf[i + 1] & 0xf0) === 0x80) || // Overlong
        (buf[i] === 0xf4 && buf[i + 1] > 0x8f) ||
        buf[i] > 0xf4 // > U+10FFFF
      ) {
        return false;
      }

      i += 4;
    } else {
      return false;
    }
  }

  return true;
}

try {
  let isValidUTF8 = __nccwpck_require__(4592);

  /* istanbul ignore if */
  if (typeof isValidUTF8 === 'object') {
    isValidUTF8 = isValidUTF8.Validation.isValidUTF8; // utf-8-validate@<3.0.0
  }

  module.exports = {
    isValidStatusCode,
    isValidUTF8(buf) {
      return buf.length < 150 ? _isValidUTF8(buf) : isValidUTF8(buf);
    }
  };
} catch (e) /* istanbul ignore next */ {
  module.exports = {
    isValidStatusCode,
    isValidUTF8: _isValidUTF8
  };
}


/***/ }),

/***/ 8887:
/***/ ((module, __unused_webpack_exports, __nccwpck_require__) => {

"use strict";
/* eslint no-unused-vars: ["error", { "varsIgnorePattern": "^net|tls|https$" }] */



const EventEmitter = __nccwpck_require__(2361);
const http = __nccwpck_require__(3685);
const https = __nccwpck_require__(5687);
const net = __nccwpck_require__(1808);
const tls = __nccwpck_require__(4404);
const { createHash } = __nccwpck_require__(6113);

const PerMessageDeflate = __nccwpck_require__(6684);
const WebSocket = __nccwpck_require__(1518);
const { format, parse } = __nccwpck_require__(2035);
const { GUID, kWebSocket } = __nccwpck_require__(5949);

const keyRegex = /^[+/0-9A-Za-z]{22}==$/;

const RUNNING = 0;
const CLOSING = 1;
const CLOSED = 2;

/**
 * Class representing a WebSocket server.
 *
 * @extends EventEmitter
 */
class WebSocketServer extends EventEmitter {
  /**
   * Create a `WebSocketServer` instance.
   *
   * @param {Object} options Configuration options
   * @param {Number} [options.backlog=511] The maximum length of the queue of
   *     pending connections
   * @param {Boolean} [options.clientTracking=true] Specifies whether or not to
   *     track clients
   * @param {Function} [options.handleProtocols] A hook to handle protocols
   * @param {String} [options.host] The hostname where to bind the server
   * @param {Number} [options.maxPayload=104857600] The maximum allowed message
   *     size
   * @param {Boolean} [options.noServer=false] Enable no server mode
   * @param {String} [options.path] Accept only connections matching this path
   * @param {(Boolean|Object)} [options.perMessageDeflate=false] Enable/disable
   *     permessage-deflate
   * @param {Number} [options.port] The port where to bind the server
   * @param {(http.Server|https.Server)} [options.server] A pre-created HTTP/S
   *     server to use
   * @param {Function} [options.verifyClient] A hook to reject connections
   * @param {Function} [callback] A listener for the `listening` event
   */
  constructor(options, callback) {
    super();

    options = {
      maxPayload: 100 * 1024 * 1024,
      perMessageDeflate: false,
      handleProtocols: null,
      clientTracking: true,
      verifyClient: null,
      noServer: false,
      backlog: null, // use default (511 as implemented in net.js)
      server: null,
      host: null,
      path: null,
      port: null,
      ...options
    };

    if (
      (options.port == null && !options.server && !options.noServer) ||
      (options.port != null && (options.server || options.noServer)) ||
      (options.server && options.noServer)
    ) {
      throw new TypeError(
        'One and only one of the "port", "server", or "noServer" options ' +
          'must be specified'
      );
    }

    if (options.port != null) {
      this._server = http.createServer((req, res) => {
        const body = http.STATUS_CODES[426];

        res.writeHead(426, {
          'Content-Length': body.length,
          'Content-Type': 'text/plain'
        });
        res.end(body);
      });
      this._server.listen(
        options.port,
        options.host,
        options.backlog,
        callback
      );
    } else if (options.server) {
      this._server = options.server;
    }

    if (this._server) {
      const emitConnection = this.emit.bind(this, 'connection');

      this._removeListeners = addListeners(this._server, {
        listening: this.emit.bind(this, 'listening'),
        error: this.emit.bind(this, 'error'),
        upgrade: (req, socket, head) => {
          this.handleUpgrade(req, socket, head, emitConnection);
        }
      });
    }

    if (options.perMessageDeflate === true) options.perMessageDeflate = {};
    if (options.clientTracking) this.clients = new Set();
    this.options = options;
    this._state = RUNNING;
  }

  /**
   * Returns the bound address, the address family name, and port of the server
   * as reported by the operating system if listening on an IP socket.
   * If the server is listening on a pipe or UNIX domain socket, the name is
   * returned as a string.
   *
   * @return {(Object|String|null)} The address of the server
   * @public
   */
  address() {
    if (this.options.noServer) {
      throw new Error('The server is operating in "noServer" mode');
    }

    if (!this._server) return null;
    return this._server.address();
  }

  /**
   * Close the server.
   *
   * @param {Function} [cb] Callback
   * @public
   */
  close(cb) {
    if (cb) this.once('close', cb);

    if (this._state === CLOSED) {
      process.nextTick(emitClose, this);
      return;
    }

    if (this._state === CLOSING) return;
    this._state = CLOSING;

    //
    // Terminate all associated clients.
    //
    if (this.clients) {
      for (const client of this.clients) client.terminate();
    }

    const server = this._server;

    if (server) {
      this._removeListeners();
      this._removeListeners = this._server = null;

      //
      // Close the http server if it was internally created.
      //
      if (this.options.port != null) {
        server.close(emitClose.bind(undefined, this));
        return;
      }
    }

    process.nextTick(emitClose, this);
  }

  /**
   * See if a given request should be handled by this server instance.
   *
   * @param {http.IncomingMessage} req Request object to inspect
   * @return {Boolean} `true` if the request is valid, else `false`
   * @public
   */
  shouldHandle(req) {
    if (this.options.path) {
      const index = req.url.indexOf('?');
      const pathname = index !== -1 ? req.url.slice(0, index) : req.url;

      if (pathname !== this.options.path) return false;
    }

    return true;
  }

  /**
   * Handle a HTTP Upgrade request.
   *
   * @param {http.IncomingMessage} req The request object
   * @param {(net.Socket|tls.Socket)} socket The network socket between the
   *     server and client
   * @param {Buffer} head The first packet of the upgraded stream
   * @param {Function} cb Callback
   * @public
   */
  handleUpgrade(req, socket, head, cb) {
    socket.on('error', socketOnError);

    const key =
      req.headers['sec-websocket-key'] !== undefined
        ? req.headers['sec-websocket-key'].trim()
        : false;
    const version = +req.headers['sec-websocket-version'];
    const extensions = {};

    if (
      req.method !== 'GET' ||
      req.headers.upgrade.toLowerCase() !== 'websocket' ||
      !key ||
      !keyRegex.test(key) ||
      (version !== 8 && version !== 13) ||
      !this.shouldHandle(req)
    ) {
      return abortHandshake(socket, 400);
    }

    if (this.options.perMessageDeflate) {
      const perMessageDeflate = new PerMessageDeflate(
        this.options.perMessageDeflate,
        true,
        this.options.maxPayload
      );

      try {
        const offers = parse(req.headers['sec-websocket-extensions']);

        if (offers[PerMessageDeflate.extensionName]) {
          perMessageDeflate.accept(offers[PerMessageDeflate.extensionName]);
          extensions[PerMessageDeflate.extensionName] = perMessageDeflate;
        }
      } catch (err) {
        return abortHandshake(socket, 400);
      }
    }

    //
    // Optionally call external client verification handler.
    //
    if (this.options.verifyClient) {
      const info = {
        origin:
          req.headers[`${version === 8 ? 'sec-websocket-origin' : 'origin'}`],
        secure: !!(req.socket.authorized || req.socket.encrypted),
        req
      };

      if (this.options.verifyClient.length === 2) {
        this.options.verifyClient(info, (verified, code, message, headers) => {
          if (!verified) {
            return abortHandshake(socket, code || 401, message, headers);
          }

          this.completeUpgrade(key, extensions, req, socket, head, cb);
        });
        return;
      }

      if (!this.options.verifyClient(info)) return abortHandshake(socket, 401);
    }

    this.completeUpgrade(key, extensions, req, socket, head, cb);
  }

  /**
   * Upgrade the connection to WebSocket.
   *
   * @param {String} key The value of the `Sec-WebSocket-Key` header
   * @param {Object} extensions The accepted extensions
   * @param {http.IncomingMessage} req The request object
   * @param {(net.Socket|tls.Socket)} socket The network socket between the
   *     server and client
   * @param {Buffer} head The first packet of the upgraded stream
   * @param {Function} cb Callback
   * @throws {Error} If called more than once with the same socket
   * @private
   */
  completeUpgrade(key, extensions, req, socket, head, cb) {
    //
    // Destroy the socket if the client has already sent a FIN packet.
    //
    if (!socket.readable || !socket.writable) return socket.destroy();

    if (socket[kWebSocket]) {
      throw new Error(
        'server.handleUpgrade() was called more than once with the same ' +
          'socket, possibly due to a misconfiguration'
      );
    }

    if (this._state > RUNNING) return abortHandshake(socket, 503);

    const digest = createHash('sha1')
      .update(key + GUID)
      .digest('base64');

    const headers = [
      'HTTP/1.1 101 Switching Protocols',
      'Upgrade: websocket',
      'Connection: Upgrade',
      `Sec-WebSocket-Accept: ${digest}`
    ];

    const ws = new WebSocket(null);
    let protocol = req.headers['sec-websocket-protocol'];

    if (protocol) {
      protocol = protocol.split(',').map(trim);

      //
      // Optionally call external protocol selection handler.
      //
      if (this.options.handleProtocols) {
        protocol = this.options.handleProtocols(protocol, req);
      } else {
        protocol = protocol[0];
      }

      if (protocol) {
        headers.push(`Sec-WebSocket-Protocol: ${protocol}`);
        ws._protocol = protocol;
      }
    }

    if (extensions[PerMessageDeflate.extensionName]) {
      const params = extensions[PerMessageDeflate.extensionName].params;
      const value = format({
        [PerMessageDeflate.extensionName]: [params]
      });
      headers.push(`Sec-WebSocket-Extensions: ${value}`);
      ws._extensions = extensions;
    }

    //
    // Allow external modification/inspection of handshake headers.
    //
    this.emit('headers', headers, req);

    socket.write(headers.concat('\r\n').join('\r\n'));
    socket.removeListener('error', socketOnError);

    ws.setSocket(socket, head, this.options.maxPayload);

    if (this.clients) {
      this.clients.add(ws);
      ws.on('close', () => this.clients.delete(ws));
    }

    cb(ws, req);
  }
}

module.exports = WebSocketServer;

/**
 * Add event listeners on an `EventEmitter` using a map of <event, listener>
 * pairs.
 *
 * @param {EventEmitter} server The event emitter
 * @param {Object.<String, Function>} map The listeners to add
 * @return {Function} A function that will remove the added listeners when
 *     called
 * @private
 */
function addListeners(server, map) {
  for (const event of Object.keys(map)) server.on(event, map[event]);

  return function removeListeners() {
    for (const event of Object.keys(map)) {
      server.removeListener(event, map[event]);
    }
  };
}

/**
 * Emit a `'close'` event on an `EventEmitter`.
 *
 * @param {EventEmitter} server The event emitter
 * @private
 */
function emitClose(server) {
  server._state = CLOSED;
  server.emit('close');
}

/**
 * Handle premature socket errors.
 *
 * @private
 */
function socketOnError() {
  this.destroy();
}

/**
 * Close the connection when preconditions are not fulfilled.
 *
 * @param {(net.Socket|tls.Socket)} socket The socket of the upgrade request
 * @param {Number} code The HTTP response status code
 * @param {String} [message] The HTTP response body
 * @param {Object} [headers] Additional HTTP response headers
 * @private
 */
function abortHandshake(socket, code, message, headers) {
  if (socket.writable) {
    message = message || http.STATUS_CODES[code];
    headers = {
      Connection: 'close',
      'Content-Type': 'text/html',
      'Content-Length': Buffer.byteLength(message),
      ...headers
    };

    socket.write(
      `HTTP/1.1 ${code} ${http.STATUS_CODES[code]}\r\n` +
        Object.keys(headers)
          .map((h) => `${h}: ${headers[h]}`)
          .join('\r\n') +
        '\r\n\r\n' +
        message
    );
  }

  socket.removeListener('error', socketOnError);
  socket.destroy();
}

/**
 * Remove whitespace characters from both ends of a string.
 *
 * @param {String} str The string
 * @return {String} A new string representing `str` stripped of whitespace
 *     characters from both its beginning and end
 * @private
 */
function trim(str) {
  return str.trim();
}


/***/ }),

/***/ 1518:
/***/ ((module, __unused_webpack_exports, __nccwpck_require__) => {

"use strict";
/* eslint no-unused-vars: ["error", { "varsIgnorePattern": "^Readable$" }] */



const EventEmitter = __nccwpck_require__(2361);
const https = __nccwpck_require__(5687);
const http = __nccwpck_require__(3685);
const net = __nccwpck_require__(1808);
const tls = __nccwpck_require__(4404);
const { randomBytes, createHash } = __nccwpck_require__(6113);
const { Readable } = __nccwpck_require__(2781);
const { URL } = __nccwpck_require__(7310);

const PerMessageDeflate = __nccwpck_require__(6684);
const Receiver = __nccwpck_require__(5066);
const Sender = __nccwpck_require__(6947);
const {
  BINARY_TYPES,
  EMPTY_BUFFER,
  GUID,
  kStatusCode,
  kWebSocket,
  NOOP
} = __nccwpck_require__(5949);
const { addEventListener, removeEventListener } = __nccwpck_require__(4561);
const { format, parse } = __nccwpck_require__(2035);
const { toBuffer } = __nccwpck_require__(9436);

const readyStates = ['CONNECTING', 'OPEN', 'CLOSING', 'CLOSED'];
const protocolVersions = [8, 13];
const closeTimeout = 30 * 1000;

/**
 * Class representing a WebSocket.
 *
 * @extends EventEmitter
 */
class WebSocket extends EventEmitter {
  /**
   * Create a new `WebSocket`.
   *
   * @param {(String|URL)} address The URL to which to connect
   * @param {(String|String[])} [protocols] The subprotocols
   * @param {Object} [options] Connection options
   */
  constructor(address, protocols, options) {
    super();

    this._binaryType = BINARY_TYPES[0];
    this._closeCode = 1006;
    this._closeFrameReceived = false;
    this._closeFrameSent = false;
    this._closeMessage = '';
    this._closeTimer = null;
    this._extensions = {};
    this._protocol = '';
    this._readyState = WebSocket.CONNECTING;
    this._receiver = null;
    this._sender = null;
    this._socket = null;

    if (address !== null) {
      this._bufferedAmount = 0;
      this._isServer = false;
      this._redirects = 0;

      if (Array.isArray(protocols)) {
        protocols = protocols.join(', ');
      } else if (typeof protocols === 'object' && protocols !== null) {
        options = protocols;
        protocols = undefined;
      }

      initAsClient(this, address, protocols, options);
    } else {
      this._isServer = true;
    }
  }

  /**
   * This deviates from the WHATWG interface since ws doesn't support the
   * required default "blob" type (instead we define a custom "nodebuffer"
   * type).
   *
   * @type {String}
   */
  get binaryType() {
    return this._binaryType;
  }

  set binaryType(type) {
    if (!BINARY_TYPES.includes(type)) return;

    this._binaryType = type;

    //
    // Allow to change `binaryType` on the fly.
    //
    if (this._receiver) this._receiver._binaryType = type;
  }

  /**
   * @type {Number}
   */
  get bufferedAmount() {
    if (!this._socket) return this._bufferedAmount;

    return this._socket._writableState.length + this._sender._bufferedBytes;
  }

  /**
   * @type {String}
   */
  get extensions() {
    return Object.keys(this._extensions).join();
  }

  /**
   * @type {Function}
   */
  /* istanbul ignore next */
  get onclose() {
    return undefined;
  }

  /* istanbul ignore next */
  set onclose(listener) {}

  /**
   * @type {Function}
   */
  /* istanbul ignore next */
  get onerror() {
    return undefined;
  }

  /* istanbul ignore next */
  set onerror(listener) {}

  /**
   * @type {Function}
   */
  /* istanbul ignore next */
  get onopen() {
    return undefined;
  }

  /* istanbul ignore next */
  set onopen(listener) {}

  /**
   * @type {Function}
   */
  /* istanbul ignore next */
  get onmessage() {
    return undefined;
  }

  /* istanbul ignore next */
  set onmessage(listener) {}

  /**
   * @type {String}
   */
  get protocol() {
    return this._protocol;
  }

  /**
   * @type {Number}
   */
  get readyState() {
    return this._readyState;
  }

  /**
   * @type {String}
   */
  get url() {
    return this._url;
  }

  /**
   * Set up the socket and the internal resources.
   *
   * @param {(net.Socket|tls.Socket)} socket The network socket between the
   *     server and client
   * @param {Buffer} head The first packet of the upgraded stream
   * @param {Number} [maxPayload=0] The maximum allowed message size
   * @private
   */
  setSocket(socket, head, maxPayload) {
    const receiver = new Receiver(
      this.binaryType,
      this._extensions,
      this._isServer,
      maxPayload
    );

    this._sender = new Sender(socket, this._extensions);
    this._receiver = receiver;
    this._socket = socket;

    receiver[kWebSocket] = this;
    socket[kWebSocket] = this;

    receiver.on('conclude', receiverOnConclude);
    receiver.on('drain', receiverOnDrain);
    receiver.on('error', receiverOnError);
    receiver.on('message', receiverOnMessage);
    receiver.on('ping', receiverOnPing);
    receiver.on('pong', receiverOnPong);

    socket.setTimeout(0);
    socket.setNoDelay();

    if (head.length > 0) socket.unshift(head);

    socket.on('close', socketOnClose);
    socket.on('data', socketOnData);
    socket.on('end', socketOnEnd);
    socket.on('error', socketOnError);

    this._readyState = WebSocket.OPEN;
    this.emit('open');
  }

  /**
   * Emit the `'close'` event.
   *
   * @private
   */
  emitClose() {
    if (!this._socket) {
      this._readyState = WebSocket.CLOSED;
      this.emit('close', this._closeCode, this._closeMessage);
      return;
    }

    if (this._extensions[PerMessageDeflate.extensionName]) {
      this._extensions[PerMessageDeflate.extensionName].cleanup();
    }

    this._receiver.removeAllListeners();
    this._readyState = WebSocket.CLOSED;
    this.emit('close', this._closeCode, this._closeMessage);
  }

  /**
   * Start a closing handshake.
   *
   *          +----------+   +-----------+   +----------+
   *     - - -|ws.close()|-->|close frame|-->|ws.close()|- - -
   *    |     +----------+   +-----------+   +----------+     |
   *          +----------+   +-----------+         |
   * CLOSING  |ws.close()|<--|close frame|<--+-----+       CLOSING
   *          +----------+   +-----------+   |
   *    |           |                        |   +---+        |
   *                +------------------------+-->|fin| - - - -
   *    |         +---+                      |   +---+
   *     - - - - -|fin|<---------------------+
   *              +---+
   *
   * @param {Number} [code] Status code explaining why the connection is closing
   * @param {String} [data] A string explaining why the connection is closing
   * @public
   */
  close(code, data) {
    if (this.readyState === WebSocket.CLOSED) return;
    if (this.readyState === WebSocket.CONNECTING) {
      const msg = 'WebSocket was closed before the connection was established';
      return abortHandshake(this, this._req, msg);
    }

    if (this.readyState === WebSocket.CLOSING) {
      if (
        this._closeFrameSent &&
        (this._closeFrameReceived || this._receiver._writableState.errorEmitted)
      ) {
        this._socket.end();
      }

      return;
    }

    this._readyState = WebSocket.CLOSING;
    this._sender.close(code, data, !this._isServer, (err) => {
      //
      // This error is handled by the `'error'` listener on the socket. We only
      // want to know if the close frame has been sent here.
      //
      if (err) return;

      this._closeFrameSent = true;

      if (
        this._closeFrameReceived ||
        this._receiver._writableState.errorEmitted
      ) {
        this._socket.end();
      }
    });

    //
    // Specify a timeout for the closing handshake to complete.
    //
    this._closeTimer = setTimeout(
      this._socket.destroy.bind(this._socket),
      closeTimeout
    );
  }

  /**
   * Send a ping.
   *
   * @param {*} [data] The data to send
   * @param {Boolean} [mask] Indicates whether or not to mask `data`
   * @param {Function} [cb] Callback which is executed when the ping is sent
   * @public
   */
  ping(data, mask, cb) {
    if (this.readyState === WebSocket.CONNECTING) {
      throw new Error('WebSocket is not open: readyState 0 (CONNECTING)');
    }

    if (typeof data === 'function') {
      cb = data;
      data = mask = undefined;
    } else if (typeof mask === 'function') {
      cb = mask;
      mask = undefined;
    }

    if (typeof data === 'number') data = data.toString();

    if (this.readyState !== WebSocket.OPEN) {
      sendAfterClose(this, data, cb);
      return;
    }

    if (mask === undefined) mask = !this._isServer;
    this._sender.ping(data || EMPTY_BUFFER, mask, cb);
  }

  /**
   * Send a pong.
   *
   * @param {*} [data] The data to send
   * @param {Boolean} [mask] Indicates whether or not to mask `data`
   * @param {Function} [cb] Callback which is executed when the pong is sent
   * @public
   */
  pong(data, mask, cb) {
    if (this.readyState === WebSocket.CONNECTING) {
      throw new Error('WebSocket is not open: readyState 0 (CONNECTING)');
    }

    if (typeof data === 'function') {
      cb = data;
      data = mask = undefined;
    } else if (typeof mask === 'function') {
      cb = mask;
      mask = undefined;
    }

    if (typeof data === 'number') data = data.toString();

    if (this.readyState !== WebSocket.OPEN) {
      sendAfterClose(this, data, cb);
      return;
    }

    if (mask === undefined) mask = !this._isServer;
    this._sender.pong(data || EMPTY_BUFFER, mask, cb);
  }

  /**
   * Send a data message.
   *
   * @param {*} data The message to send
   * @param {Object} [options] Options object
   * @param {Boolean} [options.compress] Specifies whether or not to compress
   *     `data`
   * @param {Boolean} [options.binary] Specifies whether `data` is binary or
   *     text
   * @param {Boolean} [options.fin=true] Specifies whether the fragment is the
   *     last one
   * @param {Boolean} [options.mask] Specifies whether or not to mask `data`
   * @param {Function} [cb] Callback which is executed when data is written out
   * @public
   */
  send(data, options, cb) {
    if (this.readyState === WebSocket.CONNECTING) {
      throw new Error('WebSocket is not open: readyState 0 (CONNECTING)');
    }

    if (typeof options === 'function') {
      cb = options;
      options = {};
    }

    if (typeof data === 'number') data = data.toString();

    if (this.readyState !== WebSocket.OPEN) {
      sendAfterClose(this, data, cb);
      return;
    }

    const opts = {
      binary: typeof data !== 'string',
      mask: !this._isServer,
      compress: true,
      fin: true,
      ...options
    };

    if (!this._extensions[PerMessageDeflate.extensionName]) {
      opts.compress = false;
    }

    this._sender.send(data || EMPTY_BUFFER, opts, cb);
  }

  /**
   * Forcibly close the connection.
   *
   * @public
   */
  terminate() {
    if (this.readyState === WebSocket.CLOSED) return;
    if (this.readyState === WebSocket.CONNECTING) {
      const msg = 'WebSocket was closed before the connection was established';
      return abortHandshake(this, this._req, msg);
    }

    if (this._socket) {
      this._readyState = WebSocket.CLOSING;
      this._socket.destroy();
    }
  }
}

/**
 * @constant {Number} CONNECTING
 * @memberof WebSocket
 */
Object.defineProperty(WebSocket, 'CONNECTING', {
  enumerable: true,
  value: readyStates.indexOf('CONNECTING')
});

/**
 * @constant {Number} CONNECTING
 * @memberof WebSocket.prototype
 */
Object.defineProperty(WebSocket.prototype, 'CONNECTING', {
  enumerable: true,
  value: readyStates.indexOf('CONNECTING')
});

/**
 * @constant {Number} OPEN
 * @memberof WebSocket
 */
Object.defineProperty(WebSocket, 'OPEN', {
  enumerable: true,
  value: readyStates.indexOf('OPEN')
});

/**
 * @constant {Number} OPEN
 * @memberof WebSocket.prototype
 */
Object.defineProperty(WebSocket.prototype, 'OPEN', {
  enumerable: true,
  value: readyStates.indexOf('OPEN')
});

/**
 * @constant {Number} CLOSING
 * @memberof WebSocket
 */
Object.defineProperty(WebSocket, 'CLOSING', {
  enumerable: true,
  value: readyStates.indexOf('CLOSING')
});

/**
 * @constant {Number} CLOSING
 * @memberof WebSocket.prototype
 */
Object.defineProperty(WebSocket.prototype, 'CLOSING', {
  enumerable: true,
  value: readyStates.indexOf('CLOSING')
});

/**
 * @constant {Number} CLOSED
 * @memberof WebSocket
 */
Object.defineProperty(WebSocket, 'CLOSED', {
  enumerable: true,
  value: readyStates.indexOf('CLOSED')
});

/**
 * @constant {Number} CLOSED
 * @memberof WebSocket.prototype
 */
Object.defineProperty(WebSocket.prototype, 'CLOSED', {
  enumerable: true,
  value: readyStates.indexOf('CLOSED')
});

[
  'binaryType',
  'bufferedAmount',
  'extensions',
  'protocol',
  'readyState',
  'url'
].forEach((property) => {
  Object.defineProperty(WebSocket.prototype, property, { enumerable: true });
});

//
// Add the `onopen`, `onerror`, `onclose`, and `onmessage` attributes.
// See https://html.spec.whatwg.org/multipage/comms.html#the-websocket-interface
//
['open', 'error', 'close', 'message'].forEach((method) => {
  Object.defineProperty(WebSocket.prototype, `on${method}`, {
    enumerable: true,
    get() {
      const listeners = this.listeners(method);
      for (let i = 0; i < listeners.length; i++) {
        if (listeners[i]._listener) return listeners[i]._listener;
      }

      return undefined;
    },
    set(listener) {
      const listeners = this.listeners(method);
      for (let i = 0; i < listeners.length; i++) {
        //
        // Remove only the listeners added via `addEventListener`.
        //
        if (listeners[i]._listener) this.removeListener(method, listeners[i]);
      }
      this.addEventListener(method, listener);
    }
  });
});

WebSocket.prototype.addEventListener = addEventListener;
WebSocket.prototype.removeEventListener = removeEventListener;

module.exports = WebSocket;

/**
 * Initialize a WebSocket client.
 *
 * @param {WebSocket} websocket The client to initialize
 * @param {(String|URL)} address The URL to which to connect
 * @param {String} [protocols] The subprotocols
 * @param {Object} [options] Connection options
 * @param {(Boolean|Object)} [options.perMessageDeflate=true] Enable/disable
 *     permessage-deflate
 * @param {Number} [options.handshakeTimeout] Timeout in milliseconds for the
 *     handshake request
 * @param {Number} [options.protocolVersion=13] Value of the
 *     `Sec-WebSocket-Version` header
 * @param {String} [options.origin] Value of the `Origin` or
 *     `Sec-WebSocket-Origin` header
 * @param {Number} [options.maxPayload=104857600] The maximum allowed message
 *     size
 * @param {Boolean} [options.followRedirects=false] Whether or not to follow
 *     redirects
 * @param {Number} [options.maxRedirects=10] The maximum number of redirects
 *     allowed
 * @private
 */
function initAsClient(websocket, address, protocols, options) {
  const opts = {
    protocolVersion: protocolVersions[1],
    maxPayload: 100 * 1024 * 1024,
    perMessageDeflate: true,
    followRedirects: false,
    maxRedirects: 10,
    ...options,
    createConnection: undefined,
    socketPath: undefined,
    hostname: undefined,
    protocol: undefined,
    timeout: undefined,
    method: undefined,
    host: undefined,
    path: undefined,
    port: undefined
  };

  if (!protocolVersions.includes(opts.protocolVersion)) {
    throw new RangeError(
      `Unsupported protocol version: ${opts.protocolVersion} ` +
        `(supported versions: ${protocolVersions.join(', ')})`
    );
  }

  let parsedUrl;

  if (address instanceof URL) {
    parsedUrl = address;
    websocket._url = address.href;
  } else {
    parsedUrl = new URL(address);
    websocket._url = address;
  }

  const isUnixSocket = parsedUrl.protocol === 'ws+unix:';

  if (!parsedUrl.host && (!isUnixSocket || !parsedUrl.pathname)) {
    const err = new Error(`Invalid URL: ${websocket.url}`);

    if (websocket._redirects === 0) {
      throw err;
    } else {
      emitErrorAndClose(websocket, err);
      return;
    }
  }

  const isSecure =
    parsedUrl.protocol === 'wss:' || parsedUrl.protocol === 'https:';
  const defaultPort = isSecure ? 443 : 80;
  const key = randomBytes(16).toString('base64');
  const get = isSecure ? https.get : http.get;
  let perMessageDeflate;

  opts.createConnection = isSecure ? tlsConnect : netConnect;
  opts.defaultPort = opts.defaultPort || defaultPort;
  opts.port = parsedUrl.port || defaultPort;
  opts.host = parsedUrl.hostname.startsWith('[')
    ? parsedUrl.hostname.slice(1, -1)
    : parsedUrl.hostname;
  opts.headers = {
    'Sec-WebSocket-Version': opts.protocolVersion,
    'Sec-WebSocket-Key': key,
    Connection: 'Upgrade',
    Upgrade: 'websocket',
    ...opts.headers
  };
  opts.path = parsedUrl.pathname + parsedUrl.search;
  opts.timeout = opts.handshakeTimeout;

  if (opts.perMessageDeflate) {
    perMessageDeflate = new PerMessageDeflate(
      opts.perMessageDeflate !== true ? opts.perMessageDeflate : {},
      false,
      opts.maxPayload
    );
    opts.headers['Sec-WebSocket-Extensions'] = format({
      [PerMessageDeflate.extensionName]: perMessageDeflate.offer()
    });
  }
  if (protocols) {
    opts.headers['Sec-WebSocket-Protocol'] = protocols;
  }
  if (opts.origin) {
    if (opts.protocolVersion < 13) {
      opts.headers['Sec-WebSocket-Origin'] = opts.origin;
    } else {
      opts.headers.Origin = opts.origin;
    }
  }
  if (parsedUrl.username || parsedUrl.password) {
    opts.auth = `${parsedUrl.username}:${parsedUrl.password}`;
  }

  if (isUnixSocket) {
    const parts = opts.path.split(':');

    opts.socketPath = parts[0];
    opts.path = parts[1];
  }

  if (opts.followRedirects) {
    if (websocket._redirects === 0) {
      websocket._originalUnixSocket = isUnixSocket;
      websocket._originalSecure = isSecure;
      websocket._originalHostOrSocketPath = isUnixSocket
        ? opts.socketPath
        : parsedUrl.host;

      const headers = options && options.headers;

      //
      // Shallow copy the user provided options so that headers can be changed
      // without mutating the original object.
      //
      options = { ...options, headers: {} };

      if (headers) {
        for (const [key, value] of Object.entries(headers)) {
          options.headers[key.toLowerCase()] = value;
        }
      }
    } else {
      const isSameHost = isUnixSocket
        ? websocket._originalUnixSocket
          ? opts.socketPath === websocket._originalHostOrSocketPath
          : false
        : websocket._originalUnixSocket
        ? false
        : parsedUrl.host === websocket._originalHostOrSocketPath;

      if (!isSameHost || (websocket._originalSecure && !isSecure)) {
        //
        // Match curl 7.77.0 behavior and drop the following headers. These
        // headers are also dropped when following a redirect to a subdomain.
        //
        delete opts.headers.authorization;
        delete opts.headers.cookie;

        if (!isSameHost) delete opts.headers.host;

        opts.auth = undefined;
      }
    }

    //
    // Match curl 7.77.0 behavior and make the first `Authorization` header win.
    // If the `Authorization` header is set, then there is nothing to do as it
    // will take precedence.
    //
    if (opts.auth && !options.headers.authorization) {
      options.headers.authorization =
        'Basic ' + Buffer.from(opts.auth).toString('base64');
    }
  }

  let req = (websocket._req = get(opts));

  if (opts.timeout) {
    req.on('timeout', () => {
      abortHandshake(websocket, req, 'Opening handshake has timed out');
    });
  }

  req.on('error', (err) => {
    if (req === null || req.aborted) return;

    req = websocket._req = null;
    emitErrorAndClose(websocket, err);
  });

  req.on('response', (res) => {
    const location = res.headers.location;
    const statusCode = res.statusCode;

    if (
      location &&
      opts.followRedirects &&
      statusCode >= 300 &&
      statusCode < 400
    ) {
      if (++websocket._redirects > opts.maxRedirects) {
        abortHandshake(websocket, req, 'Maximum redirects exceeded');
        return;
      }

      req.abort();

      let addr;

      try {
        addr = new URL(location, address);
      } catch (err) {
        emitErrorAndClose(websocket, err);
        return;
      }

      initAsClient(websocket, addr, protocols, options);
    } else if (!websocket.emit('unexpected-response', req, res)) {
      abortHandshake(
        websocket,
        req,
        `Unexpected server response: ${res.statusCode}`
      );
    }
  });

  req.on('upgrade', (res, socket, head) => {
    websocket.emit('upgrade', res);

    //
    // The user may have closed the connection from a listener of the `upgrade`
    // event.
    //
    if (websocket.readyState !== WebSocket.CONNECTING) return;

    req = websocket._req = null;

    if (res.headers.upgrade.toLowerCase() !== 'websocket') {
      abortHandshake(websocket, socket, 'Invalid Upgrade header');
      return;
    }

    const digest = createHash('sha1')
      .update(key + GUID)
      .digest('base64');

    if (res.headers['sec-websocket-accept'] !== digest) {
      abortHandshake(websocket, socket, 'Invalid Sec-WebSocket-Accept header');
      return;
    }

    const serverProt = res.headers['sec-websocket-protocol'];
    const protList = (protocols || '').split(/, */);
    let protError;

    if (!protocols && serverProt) {
      protError = 'Server sent a subprotocol but none was requested';
    } else if (protocols && !serverProt) {
      protError = 'Server sent no subprotocol';
    } else if (serverProt && !protList.includes(serverProt)) {
      protError = 'Server sent an invalid subprotocol';
    }

    if (protError) {
      abortHandshake(websocket, socket, protError);
      return;
    }

    if (serverProt) websocket._protocol = serverProt;

    const secWebSocketExtensions = res.headers['sec-websocket-extensions'];

    if (secWebSocketExtensions !== undefined) {
      if (!perMessageDeflate) {
        const message =
          'Server sent a Sec-WebSocket-Extensions header but no extension ' +
          'was requested';
        abortHandshake(websocket, socket, message);
        return;
      }

      let extensions;

      try {
        extensions = parse(secWebSocketExtensions);
      } catch (err) {
        const message = 'Invalid Sec-WebSocket-Extensions header';
        abortHandshake(websocket, socket, message);
        return;
      }

      const extensionNames = Object.keys(extensions);

      if (extensionNames.length) {
        if (
          extensionNames.length !== 1 ||
          extensionNames[0] !== PerMessageDeflate.extensionName
        ) {
          const message =
            'Server indicated an extension that was not requested';
          abortHandshake(websocket, socket, message);
          return;
        }

        try {
          perMessageDeflate.accept(extensions[PerMessageDeflate.extensionName]);
        } catch (err) {
          const message = 'Invalid Sec-WebSocket-Extensions header';
          abortHandshake(websocket, socket, message);
          return;
        }

        websocket._extensions[PerMessageDeflate.extensionName] =
          perMessageDeflate;
      }
    }

    websocket.setSocket(socket, head, opts.maxPayload);
  });
}

/**
 * Emit the `'error'` and `'close'` event.
 *
 * @param {WebSocket} websocket The WebSocket instance
 * @param {Error} The error to emit
 * @private
 */
function emitErrorAndClose(websocket, err) {
  websocket._readyState = WebSocket.CLOSING;
  websocket.emit('error', err);
  websocket.emitClose();
}

/**
 * Create a `net.Socket` and initiate a connection.
 *
 * @param {Object} options Connection options
 * @return {net.Socket} The newly created socket used to start the connection
 * @private
 */
function netConnect(options) {
  options.path = options.socketPath;
  return net.connect(options);
}

/**
 * Create a `tls.TLSSocket` and initiate a connection.
 *
 * @param {Object} options Connection options
 * @return {tls.TLSSocket} The newly created socket used to start the connection
 * @private
 */
function tlsConnect(options) {
  options.path = undefined;

  if (!options.servername && options.servername !== '') {
    options.servername = net.isIP(options.host) ? '' : options.host;
  }

  return tls.connect(options);
}

/**
 * Abort the handshake and emit an error.
 *
 * @param {WebSocket} websocket The WebSocket instance
 * @param {(http.ClientRequest|net.Socket|tls.Socket)} stream The request to
 *     abort or the socket to destroy
 * @param {String} message The error message
 * @private
 */
function abortHandshake(websocket, stream, message) {
  websocket._readyState = WebSocket.CLOSING;

  const err = new Error(message);
  Error.captureStackTrace(err, abortHandshake);

  if (stream.setHeader) {
    stream.abort();

    if (stream.socket && !stream.socket.destroyed) {
      //
      // On Node.js >= 14.3.0 `request.abort()` does not destroy the socket if
      // called after the request completed. See
      // https://github.com/websockets/ws/issues/1869.
      //
      stream.socket.destroy();
    }

    stream.once('abort', websocket.emitClose.bind(websocket));
    websocket.emit('error', err);
  } else {
    stream.destroy(err);
    stream.once('error', websocket.emit.bind(websocket, 'error'));
    stream.once('close', websocket.emitClose.bind(websocket));
  }
}

/**
 * Handle cases where the `ping()`, `pong()`, or `send()` methods are called
 * when the `readyState` attribute is `CLOSING` or `CLOSED`.
 *
 * @param {WebSocket} websocket The WebSocket instance
 * @param {*} [data] The data to send
 * @param {Function} [cb] Callback
 * @private
 */
function sendAfterClose(websocket, data, cb) {
  if (data) {
    const length = toBuffer(data).length;

    //
    // The `_bufferedAmount` property is used only when the peer is a client and
    // the opening handshake fails. Under these circumstances, in fact, the
    // `setSocket()` method is not called, so the `_socket` and `_sender`
    // properties are set to `null`.
    //
    if (websocket._socket) websocket._sender._bufferedBytes += length;
    else websocket._bufferedAmount += length;
  }

  if (cb) {
    const err = new Error(
      `WebSocket is not open: readyState ${websocket.readyState} ` +
        `(${readyStates[websocket.readyState]})`
    );
    cb(err);
  }
}

/**
 * The listener of the `Receiver` `'conclude'` event.
 *
 * @param {Number} code The status code
 * @param {String} reason The reason for closing
 * @private
 */
function receiverOnConclude(code, reason) {
  const websocket = this[kWebSocket];

  websocket._closeFrameReceived = true;
  websocket._closeMessage = reason;
  websocket._closeCode = code;

  if (websocket._socket[kWebSocket] === undefined) return;

  websocket._socket.removeListener('data', socketOnData);
  process.nextTick(resume, websocket._socket);

  if (code === 1005) websocket.close();
  else websocket.close(code, reason);
}

/**
 * The listener of the `Receiver` `'drain'` event.
 *
 * @private
 */
function receiverOnDrain() {
  this[kWebSocket]._socket.resume();
}

/**
 * The listener of the `Receiver` `'error'` event.
 *
 * @param {(RangeError|Error)} err The emitted error
 * @private
 */
function receiverOnError(err) {
  const websocket = this[kWebSocket];

  if (websocket._socket[kWebSocket] !== undefined) {
    websocket._socket.removeListener('data', socketOnData);

    //
    // On Node.js < 14.0.0 the `'error'` event is emitted synchronously. See
    // https://github.com/websockets/ws/issues/1940.
    //
    process.nextTick(resume, websocket._socket);

    websocket.close(err[kStatusCode]);
  }

  websocket.emit('error', err);
}

/**
 * The listener of the `Receiver` `'finish'` event.
 *
 * @private
 */
function receiverOnFinish() {
  this[kWebSocket].emitClose();
}

/**
 * The listener of the `Receiver` `'message'` event.
 *
 * @param {(String|Buffer|ArrayBuffer|Buffer[])} data The message
 * @private
 */
function receiverOnMessage(data) {
  this[kWebSocket].emit('message', data);
}

/**
 * The listener of the `Receiver` `'ping'` event.
 *
 * @param {Buffer} data The data included in the ping frame
 * @private
 */
function receiverOnPing(data) {
  const websocket = this[kWebSocket];

  websocket.pong(data, !websocket._isServer, NOOP);
  websocket.emit('ping', data);
}

/**
 * The listener of the `Receiver` `'pong'` event.
 *
 * @param {Buffer} data The data included in the pong frame
 * @private
 */
function receiverOnPong(data) {
  this[kWebSocket].emit('pong', data);
}

/**
 * Resume a readable stream
 *
 * @param {Readable} stream The readable stream
 * @private
 */
function resume(stream) {
  stream.resume();
}

/**
 * The listener of the `net.Socket` `'close'` event.
 *
 * @private
 */
function socketOnClose() {
  const websocket = this[kWebSocket];

  this.removeListener('close', socketOnClose);
  this.removeListener('data', socketOnData);
  this.removeListener('end', socketOnEnd);

  websocket._readyState = WebSocket.CLOSING;

  let chunk;

  //
  // The close frame might not have been received or the `'end'` event emitted,
  // for example, if the socket was destroyed due to an error. Ensure that the
  // `receiver` stream is closed after writing any remaining buffered data to
  // it. If the readable side of the socket is in flowing mode then there is no
  // buffered data as everything has been already written and `readable.read()`
  // will return `null`. If instead, the socket is paused, any possible buffered
  // data will be read as a single chunk.
  //
  if (
    !this._readableState.endEmitted &&
    !websocket._closeFrameReceived &&
    !websocket._receiver._writableState.errorEmitted &&
    (chunk = websocket._socket.read()) !== null
  ) {
    websocket._receiver.write(chunk);
  }

  websocket._receiver.end();

  this[kWebSocket] = undefined;

  clearTimeout(websocket._closeTimer);

  if (
    websocket._receiver._writableState.finished ||
    websocket._receiver._writableState.errorEmitted
  ) {
    websocket.emitClose();
  } else {
    websocket._receiver.on('error', receiverOnFinish);
    websocket._receiver.on('finish', receiverOnFinish);
  }
}

/**
 * The listener of the `net.Socket` `'data'` event.
 *
 * @param {Buffer} chunk A chunk of data
 * @private
 */
function socketOnData(chunk) {
  if (!this[kWebSocket]._receiver.write(chunk)) {
    this.pause();
  }
}

/**
 * The listener of the `net.Socket` `'end'` event.
 *
 * @private
 */
function socketOnEnd() {
  const websocket = this[kWebSocket];

  websocket._readyState = WebSocket.CLOSING;
  websocket._receiver.end();
  this.end();
}

/**
 * The listener of the `net.Socket` `'error'` event.
 *
 * @private
 */
function socketOnError() {
  const websocket = this[kWebSocket];

  this.removeListener('error', socketOnError);
  this.on('error', NOOP);

  if (websocket) {
    websocket._readyState = WebSocket.CLOSING;
    this.destroy();
  }
}


/***/ }),

/***/ 1208:
/***/ ((module) => {

module.exports = extend

var hasOwnProperty = Object.prototype.hasOwnProperty;

function extend() {
    var target = {}

    for (var i = 0; i < arguments.length; i++) {
        var source = arguments[i]

        for (var key in source) {
            if (hasOwnProperty.call(source, key)) {
                target[key] = source[key]
            }
        }
    }

    return target
}


/***/ }),

/***/ 4091:
/***/ ((module) => {

"use strict";

module.exports = function (Yallist) {
  Yallist.prototype[Symbol.iterator] = function* () {
    for (let walker = this.head; walker; walker = walker.next) {
      yield walker.value
    }
  }
}


/***/ }),

/***/ 665:
/***/ ((module, __unused_webpack_exports, __nccwpck_require__) => {

"use strict";

module.exports = Yallist

Yallist.Node = Node
Yallist.create = Yallist

function Yallist (list) {
  var self = this
  if (!(self instanceof Yallist)) {
    self = new Yallist()
  }

  self.tail = null
  self.head = null
  self.length = 0

  if (list && typeof list.forEach === 'function') {
    list.forEach(function (item) {
      self.push(item)
    })
  } else if (arguments.length > 0) {
    for (var i = 0, l = arguments.length; i < l; i++) {
      self.push(arguments[i])
    }
  }

  return self
}

Yallist.prototype.removeNode = function (node) {
  if (node.list !== this) {
    throw new Error('removing node which does not belong to this list')
  }

  var next = node.next
  var prev = node.prev

  if (next) {
    next.prev = prev
  }

  if (prev) {
    prev.next = next
  }

  if (node === this.head) {
    this.head = next
  }
  if (node === this.tail) {
    this.tail = prev
  }

  node.list.length--
  node.next = null
  node.prev = null
  node.list = null

  return next
}

Yallist.prototype.unshiftNode = function (node) {
  if (node === this.head) {
    return
  }

  if (node.list) {
    node.list.removeNode(node)
  }

  var head = this.head
  node.list = this
  node.next = head
  if (head) {
    head.prev = node
  }

  this.head = node
  if (!this.tail) {
    this.tail = node
  }
  this.length++
}

Yallist.prototype.pushNode = function (node) {
  if (node === this.tail) {
    return
  }

  if (node.list) {
    node.list.removeNode(node)
  }

  var tail = this.tail
  node.list = this
  node.prev = tail
  if (tail) {
    tail.next = node
  }

  this.tail = node
  if (!this.head) {
    this.head = node
  }
  this.length++
}

Yallist.prototype.push = function () {
  for (var i = 0, l = arguments.length; i < l; i++) {
    push(this, arguments[i])
  }
  return this.length
}

Yallist.prototype.unshift = function () {
  for (var i = 0, l = arguments.length; i < l; i++) {
    unshift(this, arguments[i])
  }
  return this.length
}

Yallist.prototype.pop = function () {
  if (!this.tail) {
    return undefined
  }

  var res = this.tail.value
  this.tail = this.tail.prev
  if (this.tail) {
    this.tail.next = null
  } else {
    this.head = null
  }
  this.length--
  return res
}

Yallist.prototype.shift = function () {
  if (!this.head) {
    return undefined
  }

  var res = this.head.value
  this.head = this.head.next
  if (this.head) {
    this.head.prev = null
  } else {
    this.tail = null
  }
  this.length--
  return res
}

Yallist.prototype.forEach = function (fn, thisp) {
  thisp = thisp || this
  for (var walker = this.head, i = 0; walker !== null; i++) {
    fn.call(thisp, walker.value, i, this)
    walker = walker.next
  }
}

Yallist.prototype.forEachReverse = function (fn, thisp) {
  thisp = thisp || this
  for (var walker = this.tail, i = this.length - 1; walker !== null; i--) {
    fn.call(thisp, walker.value, i, this)
    walker = walker.prev
  }
}

Yallist.prototype.get = function (n) {
  for (var i = 0, walker = this.head; walker !== null && i < n; i++) {
    // abort out of the list early if we hit a cycle
    walker = walker.next
  }
  if (i === n && walker !== null) {
    return walker.value
  }
}

Yallist.prototype.getReverse = function (n) {
  for (var i = 0, walker = this.tail; walker !== null && i < n; i++) {
    // abort out of the list early if we hit a cycle
    walker = walker.prev
  }
  if (i === n && walker !== null) {
    return walker.value
  }
}

Yallist.prototype.map = function (fn, thisp) {
  thisp = thisp || this
  var res = new Yallist()
  for (var walker = this.head; walker !== null;) {
    res.push(fn.call(thisp, walker.value, this))
    walker = walker.next
  }
  return res
}

Yallist.prototype.mapReverse = function (fn, thisp) {
  thisp = thisp || this
  var res = new Yallist()
  for (var walker = this.tail; walker !== null;) {
    res.push(fn.call(thisp, walker.value, this))
    walker = walker.prev
  }
  return res
}

Yallist.prototype.reduce = function (fn, initial) {
  var acc
  var walker = this.head
  if (arguments.length > 1) {
    acc = initial
  } else if (this.head) {
    walker = this.head.next
    acc = this.head.value
  } else {
    throw new TypeError('Reduce of empty list with no initial value')
  }

  for (var i = 0; walker !== null; i++) {
    acc = fn(acc, walker.value, i)
    walker = walker.next
  }

  return acc
}

Yallist.prototype.reduceReverse = function (fn, initial) {
  var acc
  var walker = this.tail
  if (arguments.length > 1) {
    acc = initial
  } else if (this.tail) {
    walker = this.tail.prev
    acc = this.tail.value
  } else {
    throw new TypeError('Reduce of empty list with no initial value')
  }

  for (var i = this.length - 1; walker !== null; i--) {
    acc = fn(acc, walker.value, i)
    walker = walker.prev
  }

  return acc
}

Yallist.prototype.toArray = function () {
  var arr = new Array(this.length)
  for (var i = 0, walker = this.head; walker !== null; i++) {
    arr[i] = walker.value
    walker = walker.next
  }
  return arr
}

Yallist.prototype.toArrayReverse = function () {
  var arr = new Array(this.length)
  for (var i = 0, walker = this.tail; walker !== null; i++) {
    arr[i] = walker.value
    walker = walker.prev
  }
  return arr
}

Yallist.prototype.slice = function (from, to) {
  to = to || this.length
  if (to < 0) {
    to += this.length
  }
  from = from || 0
  if (from < 0) {
    from += this.length
  }
  var ret = new Yallist()
  if (to < from || to < 0) {
    return ret
  }
  if (from < 0) {
    from = 0
  }
  if (to > this.length) {
    to = this.length
  }
  for (var i = 0, walker = this.head; walker !== null && i < from; i++) {
    walker = walker.next
  }
  for (; walker !== null && i < to; i++, walker = walker.next) {
    ret.push(walker.value)
  }
  return ret
}

Yallist.prototype.sliceReverse = function (from, to) {
  to = to || this.length
  if (to < 0) {
    to += this.length
  }
  from = from || 0
  if (from < 0) {
    from += this.length
  }
  var ret = new Yallist()
  if (to < from || to < 0) {
    return ret
  }
  if (from < 0) {
    from = 0
  }
  if (to > this.length) {
    to = this.length
  }
  for (var i = this.length, walker = this.tail; walker !== null && i > to; i--) {
    walker = walker.prev
  }
  for (; walker !== null && i > from; i--, walker = walker.prev) {
    ret.push(walker.value)
  }
  return ret
}

Yallist.prototype.splice = function (start, deleteCount, ...nodes) {
  if (start > this.length) {
    start = this.length - 1
  }
  if (start < 0) {
    start = this.length + start;
  }

  for (var i = 0, walker = this.head; walker !== null && i < start; i++) {
    walker = walker.next
  }

  var ret = []
  for (var i = 0; walker && i < deleteCount; i++) {
    ret.push(walker.value)
    walker = this.removeNode(walker)
  }
  if (walker === null) {
    walker = this.tail
  }

  if (walker !== this.head && walker !== this.tail) {
    walker = walker.prev
  }

  for (var i = 0; i < nodes.length; i++) {
    walker = insert(this, walker, nodes[i])
  }
  return ret;
}

Yallist.prototype.reverse = function () {
  var head = this.head
  var tail = this.tail
  for (var walker = head; walker !== null; walker = walker.prev) {
    var p = walker.prev
    walker.prev = walker.next
    walker.next = p
  }
  this.head = tail
  this.tail = head
  return this
}

function insert (self, node, value) {
  var inserted = node === self.head ?
    new Node(value, null, node, self) :
    new Node(value, node, node.next, self)

  if (inserted.next === null) {
    self.tail = inserted
  }
  if (inserted.prev === null) {
    self.head = inserted
  }

  self.length++

  return inserted
}

function push (self, item) {
  self.tail = new Node(item, self.tail, null, self)
  if (!self.head) {
    self.head = self.tail
  }
  self.length++
}

function unshift (self, item) {
  self.head = new Node(item, null, self.head, self)
  if (!self.tail) {
    self.tail = self.head
  }
  self.length++
}

function Node (value, prev, next, list) {
  if (!(this instanceof Node)) {
    return new Node(value, prev, next, list)
  }

  this.list = list
  this.value = value

  if (prev) {
    prev.next = this
    this.prev = prev
  } else {
    this.prev = null
  }

  if (next) {
    next.prev = this
    this.next = next
  } else {
    this.next = null
  }
}

try {
  // add if support for Symbol.iterator is present
  __nccwpck_require__(4091)(Yallist)
} catch (er) {}


/***/ }),

/***/ 1269:
/***/ ((module) => {

module.exports = eval("require")("bufferutil");


/***/ }),

/***/ 132:
/***/ ((module) => {

module.exports = eval("require")("supports-color");


/***/ }),

/***/ 4592:
/***/ ((module) => {

module.exports = eval("require")("utf-8-validate");


/***/ }),

/***/ 4300:
/***/ ((module) => {

"use strict";
module.exports = require("buffer");

/***/ }),

/***/ 6113:
/***/ ((module) => {

"use strict";
module.exports = require("crypto");

/***/ }),

/***/ 2361:
/***/ ((module) => {

"use strict";
module.exports = require("events");

/***/ }),

/***/ 3685:
/***/ ((module) => {

"use strict";
module.exports = require("http");

/***/ }),

/***/ 5687:
/***/ ((module) => {

"use strict";
module.exports = require("https");

/***/ }),

/***/ 1808:
/***/ ((module) => {

"use strict";
module.exports = require("net");

/***/ }),

/***/ 3477:
/***/ ((module) => {

"use strict";
module.exports = require("querystring");

/***/ }),

/***/ 2781:
/***/ ((module) => {

"use strict";
module.exports = require("stream");

/***/ }),

/***/ 4404:
/***/ ((module) => {

"use strict";
module.exports = require("tls");

/***/ }),

/***/ 6224:
/***/ ((module) => {

"use strict";
module.exports = require("tty");

/***/ }),

/***/ 7310:
/***/ ((module) => {

"use strict";
module.exports = require("url");

/***/ }),

/***/ 3837:
/***/ ((module) => {

"use strict";
module.exports = require("util");

/***/ }),

/***/ 9796:
/***/ ((module) => {

"use strict";
module.exports = require("zlib");

/***/ })

/******/ 	});
/************************************************************************/
/******/ 	// The module cache
/******/ 	var __webpack_module_cache__ = {};
/******/ 	
/******/ 	// The require function
/******/ 	function __nccwpck_require__(moduleId) {
/******/ 		// Check if module is in cache
/******/ 		var cachedModule = __webpack_module_cache__[moduleId];
/******/ 		if (cachedModule !== undefined) {
/******/ 			return cachedModule.exports;
/******/ 		}
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = __webpack_module_cache__[moduleId] = {
/******/ 			// no module.id needed
/******/ 			// no module.loaded needed
/******/ 			exports: {}
/******/ 		};
/******/ 	
/******/ 		// Execute the module function
/******/ 		var threw = true;
/******/ 		try {
/******/ 			__webpack_modules__[moduleId].call(module.exports, module, module.exports, __nccwpck_require__);
/******/ 			threw = false;
/******/ 		} finally {
/******/ 			if(threw) delete __webpack_module_cache__[moduleId];
/******/ 		}
/******/ 	
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/ 	
/************************************************************************/
/******/ 	/* webpack/runtime/compat */
/******/ 	
/******/ 	if (typeof __nccwpck_require__ !== 'undefined') __nccwpck_require__.ab = __dirname + "/";
/******/ 	
/************************************************************************/
var __webpack_exports__ = {};
// This entry need to be wrapped in an IIFE because it need to be isolated against other modules in the chunk.
(() => {
const { ConfigParams } = __nccwpck_require__(6528);
const { MqttModule } = __nccwpck_require__(2560);
const { LogicImpl } = __nccwpck_require__(5015);

logicImpl = new LogicImpl()

mqtt = new MqttModule( logicImpl )


})();

module.exports = __webpack_exports__;
/******/ })()
;