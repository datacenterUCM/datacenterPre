<template>
    <div class="my-div">
    <v-app>
        <v-col>
            <v-row>
                <div class="text-center">
                    <v-btn
                    rounded
                    color="primary"
                    dark
                    @click = "changeMeasurement"
                    >
                    {{ measurementButtonText }}
                    </v-btn>
                </div>
            </v-row>

            <v-row>
                <v-card-text>
                    <v-slider
                        @change="updateZ"
                        v-model="zVal"
                        append-icon="mdi-magnify-plus-outline"
                        prepend-icon="mdi-magnify-minus-outline"
                        :min="minZValue"
                        :max="maxZValue"
                        step="0.1"
                        @click:append="zoomIn"
                        @click:prepend="zoomOut"
                    ></v-slider>
                </v-card-text>
            </v-row>

            <v-row>
                <div class="text-center">
                    <v-btn
                    rounded
                    color="primary"
                    dark
                    @click = "changeMode"
                    >
                    {{ modeButtonText }}
                    </v-btn>
                </div>
            </v-row>

            <v-row>
                <v-card-text>
                    <v-slider
                        @change="updateResolution"
                        v-model="resVal"
                        :min="minResValue"
                        :max="maxResValue"
                        step="1"
                    ></v-slider>
                </v-card-text>
            </v-row>
        </v-col>
    </v-app>
    </div>
</template>

<script>

export default {
    name: 'UserInterfaceComponent',

    data() {
        return {
            // Valores máximos y mínimos de z
            minZValue: 0,
            maxZValue: 3 * 4.5,

            // Valores máximos y mínimos de resolución
            minResValue: 10,
            maxResValue: 35,

            modeButtonText: "Mapa plano",

            measurementButtonText: "Mostrar humedad",

            backgroundColor: "grey",

            blue: "blue",

            zVal: 2.25,
            resVal: 15,
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
        },
        changeMode(){
            this.$emit('changeModeEvent')
        },
        changeMeasurement(){
            this.$emit('changeMeasurementEvent')
        },
        //Función que ejecuta el padre para modificar el texto del botón de mode
        changeModeButtonName(newName){
            this.modeButtonText = newName
        },
        //Función que ejecuta el padre para modificar el texto del botón de measurement
        changeMeasurementButtonName(newName){
            this.measurementButtonText = newName
        },
        updateResolution(value){
            this.$emit('changeResolutionEvent', value)
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