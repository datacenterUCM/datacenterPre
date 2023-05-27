<template>
  <v-card class="fill-v-card my-card">
    <v-row class="fill-row">
      <v-col cols="6" class="text-center">
        <v-row>
          <v-col cols="7" class="mx-0">
            <span class="info-text-class">{{text1}}</span>
          </v-col>
          <v-col cols="1" class="mx-0">
            <v-icon class="icon" :style="{ color: color1 }">mdi-circle</v-icon>
          </v-col>
          <v-col class="mx-0">
            <span  class="info-text-class">{{tag1}}</span>
          </v-col>
        </v-row>
      </v-col>
      <v-col cols="6" class="text-center">
        <v-row>
          <v-col cols="7">
            <span class="info-text-class">{{ text2 }}</span>
          </v-col>
          <v-col cols="1">
            <v-icon class="icon" :style="{ color: color2 }">mdi-circle</v-icon>
          </v-col>
          <v-col>
            <span class="info-text-class">{{ tag2 }}</span>
          </v-col>
        </v-row>
      </v-col>
      <v-col cols="6" class="text-center">
        <v-row>
          <v-col cols="7">
            <span class="info-text-class">{{ text3 }}</span>
          </v-col>
          <v-col cols="1">
            <v-icon class="icon" :style="{ color: color3 }">mdi-circle</v-icon>
          </v-col>
          <v-col>
            <span  class="info-text-class">{{ tag3 }}</span>
          </v-col>
        </v-row>
      </v-col>
      <v-col cols="6" class="text-center">
        <v-row>
          <v-col cols="7">
            <span class="info-text-class">{{ text4 }}</span>
          </v-col>
          <v-col cols="1">
            <v-icon class="icon" :style="{ color: color4 }">mdi-circle</v-icon>
          </v-col>
          <v-col>
            <span class="info-text-class">{{ tag4 }}</span>
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
.info-text-class{
  font-size: 14px;
}

</style>

<script>

    export default {
        name:'InfoCard',

        props:{
          text1:{type: String, default:'text1'},
          tag1:{type: String, default:'tag1'},
          text2:{type: String, default:'text2'},
          tag2:{type: String, default:'tag2'},
          text3:{type: String, default:'text3'},
          tag3:{type: String, default:'tag3'},
          text4:{type: String, default:'text4'},
          tag4:{type: String, default:'tag4'},
          color1:{type: String, default:'#aaaaaa'},
          color2:{type: String, default:'#aaaaaa'},
          color3:{type: String, default:'#aaaaaa'},
          color4:{type: String, default:'#aaaaaa'}
        }
    }

</script>


