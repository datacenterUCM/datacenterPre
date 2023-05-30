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
    :unit="popupCardInfo.unit"
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
      @createSceneEvent="createScene"
    ></UserInterfaceComponent>

    <PopupCard v-if="vCardShow"
    :xValue="popupCardInfo.posx"
    :yValue="popupCardInfo.posy"
    :zValue="popupCardInfo.posz"
    :text="popupCardInfo.text"
    :color="popupCardInfo.color"
    :value="popupCardInfo.value"
    :unit="popupCardInfo.unit"
    :top="vCardPos.y"
    :right="vCardPos.x"
    ></PopupCard>

    <LoadSpinner
    :dialogLoadSpinner="loading"
    :message="loadingMessage">
    </LoadSpinner>

    </div>

</template>

<script>
import { createApp } from '../v3dApp/app';
import UserInterfaceComponent from '@/components/UserInterfaceComponent'
import HideButtonComponent from '@/components/UserInterfaceComponent.vue'
import InfoComponent from '@/components/InfoComponent.vue'
import SimpleInfoComponent from '@/components/SimpleInfoComponent.vue'
import PopupCard from '@/components/PopupCard.vue'
import LoadSpinner from '@/components/LoadSpinner.vue'
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
      vCardShow: false,
      popupCardInfo:{
        posx: 0,
        posy: 0,
        posz: 0,
        value: 0,
        color: '#aaaaaa',
        text: 'temp:',
        unit: 'ºC'
      },

      loadingMessage: 'Cargando',
      loading:false,

      // Este flag se usa para indicar cuándo se está realizando una actualización automática
      updateInProgressFlag: false
    }
  },

  components:{
    UserInterfaceComponent,
    HideButtonComponent,
    InfoComponent,
    SimpleInfoComponent,
    PopupCard,
    LoadSpinner
},

  methods:{

    createScene(){
      this.spinnerOn()
      this.configParams = new ConfigParams()

      this.functions = new Functions(this.app)
      this.functions.createScene(this.configParams.defaultZValue, this.configParams.sideYPoints, this.configParams.measurement, this.configParams.tempColorRange, null).then((result) => {
      this.infoData = result

      this.$refs.userInterface.sceneCreated()

      this.spinnerOff()

      //Timer para actualizar la información periodicamente
      setInterval(() => {
        if(this.loading == false){
          this.updateInProgressFlag = true
          this.functions.updateScene(this.functions.app).then((result) => {
            this.infoData = result
            this.updateInProgressFlag = false
          })
        }
      }, 10000)
      })
        .catch((error) => {
          console.log(error)
          this.spinnerOff()
      })
    },
    // Función que ejecuta el evento "updateZEvent" que emite el hijo.
    updateZ(value){
      this.spinnerOn()
      this.waitUntilUpdate().then(() => {
        this.configParams.zValue = value
        this.functions.zValue = value
        this.functions.updateZ(value).then((resolve, reject) => {
          this.infoData = this.functions.infoData
          this.spinnerOff()
        }).catch((error) => {
          console.log(error)
          this.spinnerOff()
        })
      })      
    },
    // Función que ejecuta el evento "changeModeEvent" que emite el hijo.
    changeMode(){
      this.spinnerOn()
      this.waitUntilUpdate().then(() => {

        this.functions.changeMode(this.configParams.mode).then((result) => {
          this.infoData = result
          this.spinnerOff()
        }).catch((error) => {
          console.log(error)
          this.spinnerOff()
        })

        if (this.configParams.mode == "heatMap"){
          this.configParams.mode = "3DMap"
          this.$refs.userInterface.changeModeButtonName("Cambiar a mapa plano")
        }
        else if (this.configParams.mode == "3DMap"){
          this.configParams.mode = "heatMap"
          this.$refs.userInterface.changeModeButtonName("Cambiar a mapa 3D")
        }

      })
        
    },
    changeMeasurement(){
      this.spinnerOn()
      var a = true
      this.waitUntilUpdate().then(() => {

        this.functions.changeMeasurement().then((result) => {
          this.infoData = result
          this.spinnerOff()
        }).catch((error) => {
          console.log(error)
          this.spinnerOff()
        })
        
        if (this.configParams.measurement == "temp"){
          this.configParams.measurement = "hum"
          this.$refs.userInterface.changeMeasurementButtonName("Mostrar temperatura")
          this.infoData.minText = "min h:"
          this.infoData.maxText = "max h:"
          this.popupCardInfo.text = 'hum:'
          this.popupCardInfo.unit = '%'
        }
        else if (this.configParams.measurement == "hum"){
          this.configParams.measurement = "temp"
          this.$refs.userInterface.changeMeasurementButtonName("Mostrar humedad")
          this.infoData.minText = "min t:"
          this.infoData.maxText = "max t:"
          this.popupCardInfo.text = 'temp:'
          this.popupCardInfo.unit = 'ºC'
        }

      })
    },
    // Función que ejecuta el evento "changeResolutionEvent" que emite el hijo
    changeResolution(value){
      if(value != this.configParams.sideYPoints){
        this.spinnerOn()
        this.waitUntilUpdate().then(() => {

          this.configParams.sideYPoints = value
          this.functions.sideYPoints = value

          this.functions.deleteScene()
          this.functions.changeResolution().then(() => {
            this.spinnerOff()
          }).catch((error) => {
            console.log(error)
            this.spinnerOf()
          })

        })
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
      this.spinnerOn()
      this.waitUntilUpdate().then(() => {
        this.functions.updateScene(this.functions.app).then((result) => {
          this.infoData = result
          this.spinnerOff()
        }).catch((error) => {
          console.log(error)
          this.spinnerOff()
        })
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
      this.spinnerOn()
      this.waitUntilUpdate().then(() => {
        this.functions.updateScene(this.functions.app).then((result) => {
          this.infoData = result
          this.spinnerOff()
        }).catch((error) => {
          console.log(error)
          this.spinnerOff()
        })
      })
    },
    spinnerOn(){
      this.loading=true
    },
    spinnerOff(){
      this.loading=false
    },

    // Esta función sirve para evitar realizar cualquier accion mientras hay una actualización en curso y evitar comportamientos impredecibles

    waitUntilUpdate(){
      return new Promise((resolve, reject) => {
        let timerID = setInterval( () => {
          if(this.updateInProgressFlag == false){
            clearInterval(timerID)
            resolve()
          }
        }, 100)
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
    this.sceneURL = 'v3dApp/objectsDatacenter.gltf';

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
    this.loadApp()

    //Variables para la interactividad con verge3D (Three.js)
    this.raycaster = new v3d.Raycaster();
    this.mouse = new v3d.Vector2();

    window.addEventListener( 'click', (event) => {

      // Se obtiene la posición del ratón y se actualiza la variable mouse.
      this.mouse.x = ( event.clientX / window.innerWidth ) * 2 - 1;
      this.mouse.y = - ( event.clientY / window.innerHeight ) * 2 + 1;
      
      //Se edita el raycaster con la posición del ratón y la cámara
      this.raycaster.setFromCamera(this.mouse, this.app.camera)
      
      // Se obtienen los objetos intersectados con el raycaster
      var isIntersected = this.raycaster.intersectObjects( this.app.scene.children );

      if(isIntersected.length > 0){

        const object = isIntersected[0].object
      
        if (object.name.startsWith('Plane')) {
          // Se actualiza la posición del v-card
          this.vCardPos.x = 100 * (1 - this.mouse.x) / 2
          this.vCardPos.y = 100 * (1 - this.mouse.y) / 2
          //parseFloat(result.infoData.max.toFixed(2))
          this.popupCardInfo.posx = parseFloat((object.position.x / 3).toFixed(2))
          this.popupCardInfo.posy = parseFloat((- object.position.z / 3).toFixed(2))
          this.popupCardInfo.posz = parseFloat((object.position.y / 3).toFixed(2))
          this.popupCardInfo.value = parseFloat((object.value).toFixed(2))
          this.popupCardInfo.color = this.functions.convertColorToHexString([object.material.color.r, object.material.color.g, object.material.color.b])

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