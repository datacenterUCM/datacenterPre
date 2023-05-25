<template>
  <v-card class="fill-v-card my-card">
    <v-row class="fill-row">
      <v-col cols="6" class="text-center">
        <v-row>
          <v-col cols="6">
            <span>min t</span>
          </v-col>
          <v-col cols="1">
            <v-icon class="icon" color="blue darken-2">mdi-circle</v-icon>
          </v-col>
          <v-col>
            <span>23</span>
          </v-col>
        </v-row>
      </v-col>
      <v-col cols="6" class="text-center">
        <v-row>
          <v-col cols="4">
            <span>min Temp</span>
          </v-col>
          <v-col cols="2">
            <v-icon class="icon" color="blue darken-2">mdi-circle</v-icon>
          </v-col>
          <v-col cols="6">
            <span class="ml-1">23</span>
          </v-col>
        </v-row>
      </v-col>
      <v-col cols="6" class="text-center">
        <v-row>
          <v-col cols="4">
            <span>min Temp</span>
          </v-col>
          <v-col cols="2">
            <v-icon class="icon" color="blue darken-2">mdi-circle</v-icon>
          </v-col>
          <v-col cols="6">
            <span class="ml-1">23</span>
          </v-col>
        </v-row>
      </v-col>
      <v-col cols="6" class="text-center">
        <v-row>
          <v-col cols="4">
            <span>min Temp</span>
          </v-col>
          <v-col cols="2">
            <v-icon class="icon" color="blue darken-2">mdi-circle</v-icon>
          </v-col>
          <v-col cols="6">
            <span class="ml-1">23</span>
          </v-col>
        </v-row>
      </v-col>
    </v-row>
  </v-card>
</template>


<style>
.fill-v-card {
        width: 100%;
        height: 100%;
    }
.fill-col{
    width: 100%;
    height: 100%;
}
.fill-row {
        width: 100%;
        height: 100%;
    }
.my-card {
  margin-top: 20px; /* Ajusta el valor según tus necesidades */
}
.icon {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
}

</style>

<script>

    export default {
        name:'InfoCard'
    }



</script>


<v-row class="fill-row">
    <v-col>
        <v-row class="fill-row">
            <p>hola</p>
        </v-row>
        <v-row class="fill-row">
            <p>hola</p>
        </v-row>
    </v-col>
    <v-col>
        <v-row class="fill-row">
            <p>hola</p>
        </v-row>
        <v-row class="fill-row">
            <p>hola</p>
        </v-row>
    </v-col>
</v-row>