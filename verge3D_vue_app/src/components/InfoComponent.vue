<template>
    <div class="right-div">
        <v-row class="fill-row mt-1 mb-1">
            <v-col class="fill-col">
                <InfoCard
                :text1="'min t total'"
                :tag1="minTTotal"
                :color1="minTTotalColor"
                :text2="'max t total'"
                :tag2="maxTTotal"
                :color2="maxTTotalColor"
                :text3="'min h total'"
                :tag3="minHTotal"
                :color3="minHTotalColor"
                :text4="'max h total'"
                :tag4="maxHTotal"
                :color4="maxHTotalColor"
                >
                </InfoCard>
            </v-col>
            <v-col>
                <InfoCard
                :text1="'min t mapa'"
                :tag1="minTMapa"
                :color1="minTMapaColor"
                :text2="'max t mapa'"
                :tag2="maxTMapa"
                :color2="maxTMapaColor"
                :text3="'min h mapa'"
                :tag3="minHMapa"
                :color3="minHMapaColor"
                :text4="'max h mapa'"
                :tag4="maxHMapa"
                :color4="maxHMapaColor"
                >
                </InfoCard>
            </v-col>
        </v-row>
    </div>
</template>

<style>
    .right-div {
        position: fixed;
        top: 0;
        right: 0;
        width: 700px;
        height: 116px;
        /*background-color: blueviolet;*/
    }
    .fill-row {
        width: 100%;
        height: 100%;
    }
    .fill-col{
    width: 100%;
    height: 100%;
    }
</style>

<script>

import InfoCard from '@/components/InfoCard'

export default {

    name: 'InfoComponent',
    
    components:{
        InfoCard
    },

    props:{
        minTTotal:{type:Number, default:'X'},
        maxTTotal:{type:Number, default:'X'},
        minHTotal:{type:Number, default:'X'},
        maxHTotal:{type:Number, default:'X'},
        minTMapa:{type:Number, default:'X'},
        maxTMapa:{type:Number, default:'X'},
        minHMapa:{type:Number, default:'X'},
        maxHMapa:{type:Number, default:'X'},
        minTTotalColor:{type: String, default:'#aaaaaa'},
        maxTTotalColor:{type: String, default:'#aaaaaa'},
        maxHTotalColor:{type: String, default:'#aaaaaa'},
        minHTotalColor:{type: String, default:'#aaaaaa'},
        minTMapaColor:{type: String, default:'#aaaaaa'},
        maxTMapaColor:{type: String, default:'#aaaaaa'},
        maxHMapaColor:{type: String, default:'#aaaaaa'},
        minHMapaColor:{type: String, default:'#aaaaaa'}
        },

    data(){
        return {
            /*minTTotal:0,
            maxTTotal:0,
            minHTotal:0,
            maxHTotal:0,
            minTMapa:0,
            maxTMapa:0,
            minHMapa:0,
            maxHMapa:0*/
        }
    }

}

</script>