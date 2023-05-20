<template>
  <div :id="containerId">
    <div
      :id="fsButtonId"
      class="fullscreen-button fullscreen-open"
      title="Toggle fullscreen mode"
      ></div>
    <UserInterfaceComponent @updateZEvent="updateZ"></UserInterfaceComponent>
  </div>
</template>

<script>
import { createApp } from '../v3dApp/app';
import UserInterfaceComponent from '@/components/UserInterfaceComponent'
import { v4 as uuidv4 } from 'uuid';
const { Functions } = require('@/logic/functions');

export default {
  name: 'V3DApp',

  components:{

    UserInterfaceComponent

  },

  methods:{

    //Función que ejecuta el evento "updateZEvent" que emite el hijo.
    updateZ(value){
      this.functions.updateZ(this.app, value)
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
    this.loadApp();
    
    this.functions = new Functions()
    this.configParams = new ConfigParams()

    this.functions.createScene(this.app, this.configParams.defaultZValue, this.configParams.sideYPoints, this.configParams.measurement, this.configParams.map3DTempRange)
  },

  beforeDestroy() {
    this.disposeApp();
  },
}
</script>

<style>
@import '../v3dApp/app.css';
</style>


