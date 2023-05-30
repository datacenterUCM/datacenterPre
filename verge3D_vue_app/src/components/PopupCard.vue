<template>
    <div class="right-div" >

        <v-card class="fill-v-card my-card" :style="{ top: top + 'vh', right: right + 'vw' }">

            <v-col cols="12" class="text-center">
                <v-row>
                    <v-col cols="4" class="mx-0">
                        <span class="info-text-class">x: {{ xValue }}m</span>
                    </v-col>
                    <v-col cols="4" class="mx-0">
                        <span class="info-text-class">y: {{ yValue }}m</span>
                    </v-col>
                    <v-col cols="4">
                        <span class="info-text-class">z: {{ zValue }}m</span>
                    </v-col>
                </v-row>
            
                <v-row>
                    <v-col cols="3">
                        <span class="info-text-class">{{ text }}</span>
                    </v-col>
                    <v-col cols="1">
                        <v-icon class="icon" :style="{ color: color }">mdi-circle</v-icon>
                    </v-col>
                    <v-col cols="4">
                        <span class="info-text-class">{{ value }}{{ unit }}</span>
                    </v-col>
                </v-row>
            </v-col>

        </v-card>

    </div>
</template>

<style>
    .my-card {
    margin-top: 5px; /* Ajusta el valor según tus necesidades */
    }
    .right-div {
        position: fixed;
        width: 240px;
        height: 92px;
        /*background-color: blueviolet;*/
        margin-right:5px;
    }
    .fill-row {
        width: 100%;
        height: 100%;
    }
    .fill-col{
    width: 100%;
    height: 100%;
    }
    .fill-v-card {
        width: 100%;
        height: 100%;
    }
    .info-text-class{
        font-size: 15px;
        }
</style>

<script>

    export default{
        name:'PopupCard',

        props:{
            xValue:{type: Number, default:0},
            yValue:{type: Number, default:0},
            zValue:{type: Number, default:0},
            text:{type: String, default:'value'},
            color:{type: String, default:'#aaaaaa'},
            value:{type:Number, default:0},
            unit:{type:String, default:''},

            top:{type:Number, default:0},
            right:{type:Number, dafault:0}
          
        }

    }

</script>