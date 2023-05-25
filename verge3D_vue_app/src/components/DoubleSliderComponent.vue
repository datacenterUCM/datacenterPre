<template>
    <!-- Este componente contiene un título, dos sliders y un botón de aplicar -->
    <v-card class="card-full-width">
        <v-card-text style="font-size: 15px;">
            {{ title }}
        </v-card-text>
        <v-col>
            <v-row>
                <v-col>
                    <v-slider
                    thumb-label
                    @change="updateMin"
                    v-model="minVal"
                    :min="0"
                    :max="100"
                    label="min"
                    :step="step"
                    >
                        <template v-slot:append>
                            <v-text-field
                            v-model="minVal"
                            @change="updateMin"
                            class="mt-0 pt-0"
                            type="number"
                            style="width: 50px"
                            :step="step"
                            ></v-text-field>
                        </template>
                    </v-slider>
                </v-col>
            </v-row>
            <v-row>
                <v-col>
                    <v-slider
                    thumb-label
                    @change="updateMax"
                    v-model="maxVal"
                    :min="0"
                    :max="100"
                    :step="step"
                    label="max"
                    >
                        <template v-slot:append>
                            <v-text-field
                            v-model="maxVal"
                            @change="updateMax"
                            class="mt-0 pt-0"
                            type="number"
                            style="width: 50px"
                            :step="step"
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
</template>

<script>

    export default{

        name: 'DoubleSliderComponent',

        props: {
            title: '',
            step: {
                type: Number,
                default: 1
            }
        },

        data(){
            return{
                
                minVal:25,
                maxVal:26

            }
        },

        methods:{
            updateMin(value){
                if(this.maxVal <= value){
                    this.minVal = this.maxVal
                }
            },
            updateMax(value){
                if(this.minVal >= value){
                    this.maxVal = this.minVal
                }
            },
            applyRange(){
                this.$emit('applyRangeEvent', this.minVal, this.maxVal)
            }
        }

    }

</script>