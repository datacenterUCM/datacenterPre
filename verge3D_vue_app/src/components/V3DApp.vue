<template>
  <div :id="containerId">
    <div
      :id="fsButtonId"
      class="fullscreen-button fullscreen-open"
      title="Toggle fullscreen mode"
      ></div>
    <UserInterfaceComponent ref="userInterface" @changeMeasurementEvent="changeMeasurement" @changeResolutionEvent="changeResolution" @updateZEvent="updateZ" @changeModeEvent="changeMode"></UserInterfaceComponent>
  </div>
</template>

<script>
import { createApp } from '../v3dApp/app';
import UserInterfaceComponent from '@/components/UserInterfaceComponent'
import { v4 as uuidv4 } from 'uuid';
const { Functions } = require('@/logic/functions');
const { ConfigParams } = require('@/logic/ConfigParams')

export default {
  name: 'V3DApp',

  components:{

    UserInterfaceComponent

  },

  methods:{

    // Función que ejecuta el evento "updateZEvent" que emite el hijo.
    updateZ(value){
      this.configParams.zValue = value
      this.functions.zValue = value
      this.functions.updateZ(value)
    },
    // Función que ejecuta el evento "changeModeEvent" que emite el hijo.
    changeMode(){
      this.functions.changeMode(this.configParams.mode)
      if (this.configParams.mode == "heatMap"){
        this.configParams.mode = "3DMap"
        this.$refs.userInterface.changeModeButtonName("Mapa 3D")
      }
      else if (this.configParams.mode == "3DMap"){
        this.configParams.mode = "heatMap"
        this.$refs.userInterface.changeModeButtonName("Mapa plano")
      }

      //this.functions.pruebas()
      //this.functions.createPlane(planeData)
        
    },
    changeMeasurement(){
      this.functions.changeMeasurement()
      if (this.configParams.measurement == "temp"){
        this.configParams.measurement = "hum"
        this.$refs.userInterface.changeMeasurementButtonName("Mostrar temperatura")
      }
      else if (this.configParams.measurement == "hum"){
        this.configParams.measurement = "temp"
        this.$refs.userInterface.changeMeasurementButtonName("Mostrar humedad")
      }
    },
    // Función que ejecuta el evento "changeResolutionEvent" que emite el hijo
    changeResolution(value){
      if(value != this.configParams.sideYPoints){
        this.configParams.sideYPoints = value
        this.functions.sideYPoints = value

        this.functions.deleteScene()
        this.functions.createScene(this.configParams.zValue, this.configParams.sideYPoints, this.configParams.measurement, this.configParams.tempColorRange)

      }
    },
    
  },

  created() {
    this.app = null;
    this.PL = null,

    // this.uuid = window.crypto.randomUUID();
    this.uuid = uuidv4();
    this.containerId = `v3d-container-${this.uuid}`;
    this.fsButtonId = `fullscreen-button-${this.uuid}`;
    this.sceneURL = 'v3dApp/datacenter.gltf';

    this.loadApp = async function() {
      ({ app: this.app, PL: this.PL } = await createApp({
        containerId: this.containerId,
        fsButtonId: this.fsButtonId,
        sceneURL: this.sceneURL,
      }));
    }

    this.disposeApp = function() {
      this.app?.dispose();
      this.app = null;

      // dispose Puzzles' visual logic
      this.PL?.dispose();
      this.PL = null;
    }

    this.reloadApp = function() {
      this.disposeApp();
      this.loadApp();
    }
  },

  mounted() {
    this.configParams = new ConfigParams()

    this.loadApp().then(result => {

      this.functions = new Functions(this.app)
      this.functions.createScene(this.configParams.defaultZValue, this.configParams.sideYPoints, this.configParams.measurement, this.configParams.tempColorRange)
      this.functions.initTimer()
    })
  
  },

  beforeDestroy() {
    this.disposeApp();
  },

  watch: {
  app(newValue) {
    console.log("Cambió")
    if (newValue !== null && this.functions === null) {
      this.functions = new Functions();
    }
  }
},

}
</script>

<style>
@import '../v3dApp/app.css';
</style>


