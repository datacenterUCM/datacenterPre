<template>
  <div :id="containerId">
    <div
      :id="fsButtonId"
      title="Toggle fullscreen mode"
    ></div>

    <SimpleInfoComponent
    :text1="infoData.minText"
    :text2="infoData.maxText"
    :tag1="infoData.minValue"
    :tag2="infoData.maxValue"
    :color1="infoData.minColor"
    :color2="infoData.maxColor"
    ></SimpleInfoComponent>

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

    <SimpleInfoComponent v-if="vCardShow"
    :text1="infoData.minText"
    :text2="infoData.maxText"
    :tag1="infoData.minValue"
    :tag2="infoData.maxValue"
    :color1="infoData.minColor"
    :color2="infoData.maxColor"
    :top="vCardPos.x"
    :right="vCardPos.y"
    ></SimpleInfoComponent>

    </div>

</template>

<script>
import { createApp } from '../v3dApp/app';
import UserInterfaceComponent from '@/components/UserInterfaceComponent'
import HideButtonComponent from '@/components/UserInterfaceComponent.vue'
import InfoComponent from '@/components/InfoComponent.vue'
import SimpleInfoComponent from '@/components/SimpleInfoComponent.vue'
import { v4 as uuidv4 } from 'uuid';
const { Functions } = require('@/logic/functions');
const { ConfigParams } = require('@/logic/ConfigParams')
const v3d = require('verge3d')

export default {
  name: 'V3DApp',

  data(){
    return{

      showInterface: true,

      infoData:{
        minText:'min t:',
        maxText:'max t:',
        minValue:10,
        maxValue:0,
        minColor:'#aaaaaa',
        maxColor:'#aaaaaa',
      },

      // Variables para el vcard que aparece al hacer click en el mapa
      vCardPos: {
        x:0,
        y:100
      },
      vCardShow: false

    }
  },

  components:{
    UserInterfaceComponent,
    HideButtonComponent,
    InfoComponent,
    SimpleInfoComponent
},

  methods:{

    // Función que ejecuta el evento "updateZEvent" que emite el hijo.
    updateZ(value){
      this.configParams.zValue = value
      this.functions.zValue = value
      this.functions.updateZ(value)
      this.infoData = this.functions.infoData
    },
    // Función que ejecuta el evento "changeModeEvent" que emite el hijo.
    changeMode(){
      this.functions.changeMode(this.configParams.mode).then((result) => {
        this.infoData = result
      }).catch((error) => {
        console.log(error)
      })

      if (this.configParams.mode == "heatMap"){
        this.configParams.mode = "3DMap"
        this.$refs.userInterface.changeModeButtonName("Cambiar a mapa plano")
      }
      else if (this.configParams.mode == "3DMap"){
        this.configParams.mode = "heatMap"
        this.$refs.userInterface.changeModeButtonName("Cambiar a mapa 3D")
      }
        
    },
    changeMeasurement(){
      this.functions.changeMeasurement().then((result) => {
        this.infoData = result
      }).catch((error) => {
        console.log(error)
      })
      
      if (this.configParams.measurement == "temp"){
        this.configParams.measurement = "hum"
        this.$refs.userInterface.changeMeasurementButtonName("Mostrar temperatura")
        this.infoData.minText = "min h:"
        this.infoData.maxText = "max h:"
      }
      else if (this.configParams.measurement == "hum"){
        this.configParams.measurement = "temp"
        this.$refs.userInterface.changeMeasurementButtonName("Mostrar humedad")
        this.infoData.minText = "min t:"
        this.infoData.maxText = "max t:"
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
      this.functions.updateScene(this.functions.app).then((result) => {
        this.infoData = result
      }).catch((error) => {
        console.log(error)
      })
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
      this.functions.updateScene(this.functions.app).then((result) => {
        this.infoData = result
      }).catch((error) => {
        console.log(error)
      })
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
    console.log("MOUNTED")
    this.configParams = new ConfigParams()

    this.loadApp().then(result => {

      this.functions = new Functions(this.app)
      this.functions.createScene(this.configParams.defaultZValue, this.configParams.sideYPoints, this.configParams.measurement, this.configParams.tempColorRange, null).then((result) => {
        this.infoData = result

        //Timer para actualizar la información periodicamente
      }).then(() => {
        setInterval(() => {
          this.functions.updateScene(this.functions.app).then((result) => {
            this.infoData = result
          }).catch((error) => {
            console.log(error)
          })
        }, 10000)
      })
      .catch((error) => {
        console.log(error)
      })
      
    })

    //Variables para la interactividad con verge3D (Three.js)
    this.raycaster = new v3d.Raycaster();
    this.mouse = new v3d.Vector2();

    window.addEventListener( 'click', (event) => {

      this.mouse.x = ( event.clientX / window.innerWidth ) * 2 - 1;
      this.mouse.y = - ( event.clientY / window.innerHeight ) * 2 + 1;
      
      this.raycaster.setFromCamera(this.mouse, this.app.camera)
      
      var isIntersected = this.raycaster.intersectObjects( this.app.scene.children );

      if(isIntersected.length > 0){

        const object = isIntersected[0].object
      
        if (object.name.startsWith('Plane')) {
          console.log("asies")
          console.log(this.mouse.x + '  ' + this.mouse.y)

          // Se actualiza la posición del v-card
          this.vCardPos.x = 100 * (1 - this.mouse.x) / 2
          this.vCardPos.y = 100 * (1 - this.mouse.y) / 2

          console.log(this.vCardPos.x)

          // Mostrar v-card
          this.vCardShow = true

        }
        else {
          this.vCardShow = false
        }

      }
      else{
        this.vCardShow = false
      }
    }, false );
  
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


<InfoComponent
:minTTotal="infoData.minTTotal"
:maxTTotal="infoData.maxTTotal"
:minHTotal="infoData.minHTotal"
:maxHTotal="infoData.maxHTotal"
:minTMapa="infoData.minTMapa"
:maxTMapa="infoData.maxTMapa"
:minHMapa="infoData.minHMapa"
:maxHMapa="infoData.maxHMapa"
:minTTotalColor="infoData.minTTotalColor"
:maxTTotalColor="infoData.maxTTotalColor"
:maxHTotalColor="infoData.maxHTotalColor"
:minHTotalColor="infoData.minHTotalColor"
:minTMapaColor="infoData.minTMapaColor"
:maxTMapaColor="infoData.maxTMapaColor"
:maxHMapaColor="infoData.maxHMapaColor"
:minHMapaColor="infoData.minHMapaColor"
>
</InfoComponent>