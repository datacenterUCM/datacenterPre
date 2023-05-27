<template>
    <div class="right-div" >

        <v-card class="fill-v-card my-card" :style="{ top: top + '%', right: right + '%' }">

            <v-col cols="12" class="text-center">
                <v-row>
                    <v-col cols="5" class="mx-0">
                        <span class="info-text-class">{{text1}}</span>
                    </v-col>
                    <v-col cols="1" class="mx-0">
                        <v-icon class="icon" :style="{ color: color1 }">mdi-circle</v-icon>
                    </v-col>
                    <v-col cols="5">
                        <span  class="info-text-class">{{tag1}}</span>
                    </v-col>
                </v-row>
            
                <v-row>
                    <v-col cols="5">
                        <span class="info-text-class">{{ text2 }}</span>
                    </v-col>
                    <v-col cols="1">
                        <v-icon class="icon" :style="{ color: color2 }">mdi-circle</v-icon>
                    </v-col>
                    <v-col cols="5">
                        <span class="info-text-class">{{ tag2 }}</span>
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
        width: 160px;
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
        name:'SimpleInfoComponent',

        props:{
          text1:{type: String, default:'text1'},
          tag1:{type: Number, default:0},
          text2:{type: String, default:'text2'},
          tag2:{type: Number, default:0},
          color1:{type: String, default:'#aaaaaa'},
          color2:{type: String, default:'#aaaaaa'},

          top:{type:Number, default:0},
          right:{type:Number, dafault:0}
          
        }

    }

</script>