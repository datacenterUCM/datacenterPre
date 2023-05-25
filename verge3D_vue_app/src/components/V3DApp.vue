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
      @tempChangeEvent="tempChange"
      @humChangeEvent="humChange"
      @applyRangeEvent="applyRange"
      @tempColorChangeEvent="tempColorChange"
      @humColorChangeEvent="humColorChange"
      @applyColorRangeEvent="applyColorRange"
    ></UserInterfaceComponent>
            
    <InfoComponent></InfoComponent>

    </div>

</template>

<script>
import { createApp } from '../v3dApp/app';
import UserInterfaceComponent from '@/components/UserInterfaceComponent'
import HideButtonComponent from '@/components/UserInterfaceComponent.vue'
import InfoComponent from '@/components/InfoComponent.vue'
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
    HideButtonComponent,
    InfoComponent

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
    // Función para ocultar/mostrar la UI
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
    // Función para cambiar la temperatura mínima y máxima del mapa 3D
    tempChange(min, max){
      this.functions.map3DTempRange[0] = min
      this.functions.map3DTempRange[1] = max
    },
    // Función para cambiar la humedad mínima y máxima del mapa 3D
    humChange(min, max){
      this.functions.map3DHumRange[0] = min
      this.functions.map3DHumRange[1] = max
    },
    // Función para alicar los cambios del rango de temperatura y humedad
    applyRange(){
      this.functions.updateScene(this.functions.app)
    },
    // Función para cambiar el rango de color de la temperatura
    tempColorChange(min, max){
      this.functions.tempColorRange = [min, max]
    },
    // Función para cambiar el rango de color de la humedad
    humColorChange(min, max){
      this.functions.humColorRange = [min, max]
    },
    // Función para aplicar los cambios del rango de colores
    applyColorRange(){
      this.functions.updateScene(this.functions.app)
    }

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


