<template>

    <v-btn
        rounded
        color="primary"
        dark
        @click = "showUI"
        >
        {{ hideButtonText }}
    </v-btn>

</template> 

<script>

export default {
    name: 'HideButtonComponent',

    data(){
        return{

            hideButtonText: "Mostrar interfaz"

        }
    },

    methods:{
        showUI(){
            this.$emit("showUIEvent")
        },
        changeText(newText){
            this.hideButtonText = newText
        }
    }
}

</script>