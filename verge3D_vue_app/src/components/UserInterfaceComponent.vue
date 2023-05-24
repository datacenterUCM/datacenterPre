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
                        @change="updateZ"
                        v-model="zVal"
                        :min="minZValue"
                        :max="maxZValue"
                        step="0.1"
                    >
                        <template v-slot:append>
                            <v-text-field
                            v-model="zVal"
                            class="mt-0 pt-0"
                            type="number"
                            style="width: 35px"
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
                                class="mt-0 pt-0"
                                type="number"
                                style="width: 35px"
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
                <v-card class="card-full-width">
                    <v-card-text style="font-size: 15px;">
                        Rangos de temperatura para el mapa 3D
                    </v-card-text>
                    <v-col>
                        <v-row>
                            <v-col cols="auto">
                                <p>min</p>
                            </v-col>
                            <v-col>
                                <v-slider
                                thumb-label
                                @change="updateMinTemp"
                                v-model="minTempVal"
                                :min="0"
                                :max="100"
                                step="0.1"
                                >
                                    <template v-slot:append>
                                        <v-text-field
                                        v-model="minTempVal"
                                        class="mt-0 pt-0"
                                        type="number"
                                        style="width: 35px"
                                        ></v-text-field>
                                    </template>
                                </v-slider>
                            </v-col>
                        </v-row>
                        <v-row>
                            <v-col cols="auto">
                                <p>max</p>
                            </v-col>
                            <v-col>
                                <v-slider
                                thumb-label
                                @change="updateMaxTemp"
                                v-model="maxTempVal"
                                :min="0"
                                :max="100"
                                step="0.1"
                                >
                                    <template v-slot:append>
                                        <v-text-field
                                        v-model="maxTempVal"
                                        class="mt-0 pt-0"
                                        type="number"
                                        style="width: 35px"
                                        ></v-text-field>
                                    </template>
                                </v-slider>
                            </v-col>
                        </v-row>
                        <!-- Botón para aplicar los cambios al rango de temperatura del mapa 3D -->
                        <v-row class="mb-2 d-flex justify-center">
                            <v-btn
                            rounded
                            color="primary"
                            dark
                            @click = "applyRange"
                            >
                            Aplicar
                            </v-btn>
                        </v-row>
                    </v-col>
                </v-card>
            </v-row>
            <v-row class="mb-4 d-flex justify-center">
                <v-card class="card-full-width">
                    <v-card-text style="font-size: 15px;">
                        Rangos de temperatura para el mapa 3D
                    </v-card-text>
                    <v-col>
                        <v-row>
                            <v-col>
                                <v-slider
                                thumb-label
                                @change="updateMinHum"
                                v-model="minHumVal"
                                :min="0"
                                :max="100"
                                label="min"
                                step="0.1"
                                >
                                    <template v-slot:append>
                                        <v-text-field
                                        v-model="minHumVal"
                                        class="mt-0 pt-0"
                                        type="number"
                                        style="width: 35px"
                                        ></v-text-field>
                                    </template>
                            
                                </v-slider>
                            </v-col>
                        </v-row>
                        <v-row>
                            <v-col>
                                <!-- MODIFICAR ESTE SLIDER -->
                                <v-slider
                                thumb-label
                                v-model="maxHumVal"
                                @change="updateMaxHum"
                                :max="100"
                                :min="0"
                                label="max"
                                class="align-center"
                                >
                                    <template v-slot:append>
                                        <v-text-field
                                        v-model="maxHumVal"
                                        class="mt-0 pt-0"
                                        type="number"
                                        style="width: 35px"
                                        ></v-text-field>
                                    </template>
                                </v-slider>
                            </v-col>
                        </v-row>
                        <!-- Botón para aplicar los cambios al rango de temperatura del mapa 3D -->
                        <v-row class="mb-2 d-flex justify-center">
                            <v-btn
                            rounded
                            color="primary"
                            dark
                            @click = "applyRange"
                            >
                            Aplicar
                            </v-btn>
                        </v-row>
                    </v-col>
                </v-card>
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

            modeButtonText: "Cambiar a mapa 3D",

            measurementButtonText: "Mostrar humedad",

            backgroundColor: "grey",

            blue: "blue",

            zVal: 2.25,
            resVal: 15,

            //Valores minimos y máximos de temperatura y humedad para el mapa 3D
            minTempVal:28,
            maxTempVal:29,
            minHumVal:30,
            maxHumVal:35

        }
    },

    methods: {
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
        },
        //Funciones que se ejecutan para cambiar los valores del rango de temp y hum del mapa3D
        updateMinTemp(value){
            this.$emit('minTempChangeEvent', value)
        },
        updateMaxTemp(value){
            this.$emit('maxTempChangeEvent', value)
        },
        updateMinHum(value){
            this.$emit('minHumChangeEvent', value)
        },
        updateMaxHum(value){
            console.log("tis")
            this.$emit('maxHumChangeEvent', value)
        },
        //Funciones para rectificar los valores maximos y minimos de temp y hum del mapa 3D
        setMinTemp(value){
            this.minTempVal = value
        },
        setMaxTemp(value){
            this.maxTempVal = value
        },
        setMinHum(value){
            this.minHumVal = value
        },
        setMaxHum(value){
            this.maxHumVal = value
        },
        setMinHum(value){
            this.minHumVal = value
        },
        setMaxHum(value){
            this.maxHumVal = value
        },
        applyRange(){
            this.$emit('applyRangeEvent')
        },
    },
}

</script>

