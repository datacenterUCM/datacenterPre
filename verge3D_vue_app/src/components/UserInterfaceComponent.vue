<template>
    <div class="my-div">
    <v-app>
        <v-card-text>
            <v-slider
                @change="updateZ"
                v-model="zoom"
                append-icon="mdi-magnify-plus-outline"
                prepend-icon="mdi-magnify-minus-outline"
                :min="minZValue"
                :max="maxZValue"
                step="0.1"
                @click:append="zoomIn"
                @click:prepend="zoomOut"
            ></v-slider>
        </v-card-text>
    </v-app>
    </div>
</template>

<script>

export default {
    name: 'UserInterfaceComponent',

    data() {
        return {
            minZValue: 0,
            maxZValue: 3 * 4.5,

            backgroundColor: "grey",

            blue: "blue",

            zoom: 0,
        }
    },

    methods: {
        zoomOut() {
            this.zoom = (this.zoom - 10) || 0
            //Se emite un evento que ejecutará el padre para actualizar la Z
            this.$emit('updateZEvent', this.zoom)
        },
        zoomIn() {
            this.zoom = (this.zoom + 10) || 100
            //Se emite un evento que ejecutará el padre para actualizar la Z
            this.$emit('updateZEvent', this.zoom)
        },
        updateZ(value){
            //Se emite un evento que ejecutará el padre para actualizar la Z
            this.$emit('updateZEvent', value)
        }
    },
}



</script>

<style>
.my-div {
  height: 100vh;      /* Ocupa todo el alto disponible de la pantalla (100% de la altura de la ventana del navegador) */
  width: 20%;       /* Ancho personalizado, ajusta este valor según tus necesidades */
}

.v-app-class {
background-color: blue;
}
</style>