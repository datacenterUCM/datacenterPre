<template>
    <div class="right-div">
        <v-row class="fill-row mt-1 mb-1">
            <v-col class="fill-col">
                <InfoCard>

                </InfoCard>
            </v-col>
            <v-col>
                <InfoCard>

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
        width: 600px;
        height: 120px;
        background-color: blueviolet;
        /* Agrega aquí otros estilos deseados */
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
    }

}

</script>