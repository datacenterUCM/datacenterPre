<template>
  <div :id="containerId">
    <div
      :id="fsButtonId"
      class="fullscreen-button fullscreen-open"
      title="Toggle fullscreen mode"
      ></div>
      <UserInterfaceComponent v-if="showInterface" ref="userInterface" 
                              @changeMeasurementEvent="changeMeasurement" 
                              @changeResolutionEvent="changeResolution" 
                              @updateZEvent="updateZ" 
                              @changeModeEvent="changeMode"
                              @minTempChangeEvent="changeMinTemp"
                              @maxTempChangeEvent="changeMaxTemp"
                              @minHumChangeEvent="changeMinHum"
                              @maxHumChangeEvent="changeMaxHum"
                              @applyRangeEvent="applyRange"
                              
                              ></UserInterfaceComponent>
      <HideButtonComponent ref="hideButtonComp" @showUIEvent="showUI"></HideButtonComponent>
  </div>
</template>

<script>
import { createApp } from '../v3dApp/app';
import UserInterfaceComponent from '@/components/UserInterfaceComponent'
import HideButtonComponent from '@/components/UserInterfaceComponent.vue'
import { v4 as uuidv4 } from 'uuid';
const { Functions } = require('@/logic/functions');
const { ConfigParams } = require('@/logic/ConfigParams')

export default {
  name: 'V3DApp',

  data(){
    return{

      showInterface: true

    }
  },

  components:{

    UserInterfaceComponent,
    HideButtonComponent

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
        this.$refs.userInterface.changeModeButtonName("Cambiar a mapa plano")
      }
      else if (this.configParams.mode == "3DMap"){
        this.configParams.mode = "heatMap"
        this.$refs.userInterface.changeModeButtonName("Cambiar a mapa 3D")
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
        this.functions.changeResolution()
      }
    },
    //Función para ocultar/mostrar la UI
    showUI(){
      if (this.showInterface == false){
        this.showInterface = true
        this.$refs.hideButtonComp.changeText("Ocultar interfaz")
      }
      else {
        this.showInterface = false
        this.$refs.hideButtonComp.changeText("Mostrar Interfaz")
      }
    },
    //Función para cambiar la temperatura mínima del mapa 3D
    changeMinTemp(value){
      //La temperatura mínima no puede ser mayor que la temperatura máxima
      if(this.functions.map3DTempRange[1] >= value){
        this.functions.map3DTempRange[0] = value
      }
      else{
        this.$refs.userInterface.setMinTemp(this.functions.map3DTempRange[0])
      }
    },
    //Función para cambiar la temperatura máxima del mapa 3D
    changeMaxTemp(value){
      //La temperatura máxima no puede ser menor que la temperatura mínima
      if(this.functions.map3DTempRange[0] <= value){
        this.functions.map3DTempRange[1] = value
      }
      else{
        this.$refs.userInterface.setMaxTemp(this.functions.map3DTempRange[1])
      }
    },
    //Función para cambiar la humedad mínima del mapa 3D
    changeMinHum(value){
      //La humedad mínima no puede ser mayor que la humedad máxima
      if(this.functions.map3DHumRange[1] >= value){
        this.functions.map3DHumRange[0] = value
      }
      else{
        this.$refs.userInterface.setMinHum(this.functions.map3DHumRange[0])
      }
    },
    //Función para cambiar la humedad máxima del mapa 3D
    changeMaxHum(value){
      //La humedad máxima no puede ser menor que la humedad mínima
      if(this.functions.map3DHumRange[0] <= value){
        this.functions.map3DHumRange[1] = value
      }
      else{
        this.$refs.userInterface.setMaxHum(this.functions.map3DHumRange[1])
      }
    },
    //Función para alicar los cambios del rango de temperatura y humedad
    applyRange(){
      this.functions.updateScene(this.functions.app)
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
      this.functions.createScene(this.configParams.defaultZValue, this.configParams.sideYPoints, this.configParams.measurement, this.configParams.tempColorRange, null)
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


