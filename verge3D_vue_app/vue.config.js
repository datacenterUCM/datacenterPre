const { defineConfig } = require('@vue/cli-service')
module.exports = defineConfig({
  devServer: {
    host: '0.0.0.0',
    port: 8083,
  },
  transpileDependencies: [
    'vuetify'
  ]
})
