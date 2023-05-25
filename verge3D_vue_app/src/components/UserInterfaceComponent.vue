<template>
    <div class="my-div">
    <v-app>
        <v-col align="center">

            <h2 style="font-size: 20px; font-weight: bold; ">
                INTERFAZ DE USUARIO
            </h2>
            <!-- Botón para cambiar la medida (temperatura o humedad) -->
            <!-- mb- significa "margin bottom" y mt- significa "margin top" -->
            <!-- Se usa d-flex y justify-center para centrar el botón con respecto al div-->
             <v-row class="mt-4 mb-4 d-flex justify-center"> 
                    <v-btn
                    rounded
                    color="primary"
                    dark
                    @click = "changeMeasurement"
                    >
                    {{ measurementButtonText }}
                    </v-btn>
            </v-row>
            <!-- Slider para cambiar el valor de Z -->
            <v-row class="mb-4">
                <v-card class="card-full-width">
                    <v-card-text style="font-size: 15px;">
                        Altura del plano
                    </v-card-text>
                    <v-slider
                        thumb-label
                        :disabled="disableZ"
                        @change="updateZ"
                        v-model="zVal"
                        :min="minZValue"
                        :max="maxZValue"
                        step="0.1"
                    >
                        <template v-slot:append>
                            <v-text-field
                            :disabled="disableZ"
                            v-model="zVal"
                            @change="updateZ"
                            class="mt-0 pt-0"
                            type="number"
                            style="width: 50px"
                            step="0.1"
                            ></v-text-field>
                        </template>
                    </v-slider>
                </v-card>
            </v-row>
            <!-- Slider para modificar la resolución -->
            <v-row class="mb-4">
                <v-card class="card-full-width">
                    <v-card-text style="font-size: 15px;">
                        Resolución
                    </v-card-text>
                    <v-slider
                        thumb-label
                        @change="updateResolution"
                        v-model="resVal"
                        :min="minResValue"
                        :max="maxResValue"
                        step="1"
                    >
                        <template v-slot:append>
                                <v-text-field
                                v-model="resVal"
                                @change="updateResolution"
                                class="mt-0 pt-0"
                                type="number"
                                style="width: 50px"
                                ></v-text-field>
                        </template>
                    </v-slider>
                
                </v-card>
            </v-row>
            <!-- Botón para cambiar el modo (mapa3D o plano) -->
            <v-row class="mb-4 d-flex justify-center">
                    <v-btn
                    rounded
                    color="primary"
                    dark
                    @click = "changeMode"
                    >
                    {{ modeButtonText }}
                    </v-btn>
            </v-row>
            <!-- Sliders para cambiar los límites de temperatura y humedad para el mapa3D -->
            <v-row class="mb-4 d-flex justify-center">
                <DoubleSliderComponent :title="'Rangos de temperatura para el mapa 3D'"
                                        :step="0.1"
                                        @applyRangeEvent="applyRangeTemp"
                                        ></DoubleSliderComponent>
            </v-row>
            <v-row class="mb-4 d-flex justify-center">
                <DoubleSliderComponent :title="'Rangos de humedad para el mapa 3D'"
                                        :step="0.1"
                                        @applyRangeEvent="applyRangeHum"
                                        ></DoubleSliderComponent>
            </v-row>
            <v-row class="mb-4 d-flex justify-center">
                <DoubleSliderComponent :title="'Rangos de color de temperatura'"
                                        :step="1"
                                        @applyRangeEvent="applyColorTemp"
                                        ></DoubleSliderComponent>
            </v-row>
            <v-row class="mb-4 d-flex justify-center">
                <DoubleSliderComponent :title="'Rangos de color de humedad'"
                                        :step="1"
                                        @applyRangeEvent="applyColorHum"
                                        ></DoubleSliderComponent>
            </v-row>
        </v-col>
    </v-app>
    </div>
</template>

<style>

.my-div {
  height: 100vh;      /* Ocupa todo el alto disponible de la pantalla (100% de la altura de la ventana del navegador) */
  width: 25%;       /* Ancho personalizado, ajusta este valor según tus necesidades */
  overflow-y: auto; /* Agrega desplazamiento vertical */
}

.v-app-class {
background-color: blue;
}

.card-full-width {
  width: 100%;
  margin-left: 0 !important;
  margin-right: 0 !important;
}

</style>

<script>

import DoubleSliderComponent from '@/components/DoubleSliderComponent'

export default {
    name: 'UserInterfaceComponent',

    components:{
        DoubleSliderComponent
    },

    data() {
        return {
            // Valores máximos y mínimos de z
            minZValue: 0,
            maxZValue: 3 * 4.5,

            // Valores máximos y mínimos de resolución
            minResValue: 10,
            maxResValue: 35,

            modeButtonText: "Cambiar a mapa 3D",

            measurementButtonText: "Mostrar humedad",

            backgroundColor: "grey",

            blue: "blue",

            zVal: 2.25,
            resVal: 15,
            
            // Varible para habilitar/deshabilitar la actualización de z
            disableZ: false
        }
    },

    methods: {
        updateZ(value){
            //Se emite un evento que ejecutará el padre para actualizar la Z
            this.$emit('updateZEvent', value)
        },
        changeMode(){
            this.disableZ = !this.disableZ
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
        },
        applyRange(){
            this.$emit('applyRangeEvent')
        },
        //Funciones que se ejecutan para cambiar los valores del rango de temp y hum del mapa3D
        applyRangeTemp(min, max){
            this.$emit('tempChangeEvent', min, max)
            this.$emit('applyRangeEvent')
        },
        applyRangeHum(min, max){
            this.$emit('humChangeEvent', min, max)
            this.$emit('applyRangeEvent')
        },
        applyColorTemp(min, max){
            this.$emit('tempColorChangeEvent', min, max)
            this.$emit('applyColorRangeEvent')
        },
        applyColorHum(min, max){
            this.$emit('humColorChangeEvent', min, max)
            this.$emit('applyColorRangeEvent')
        }
    },
}

</script>

