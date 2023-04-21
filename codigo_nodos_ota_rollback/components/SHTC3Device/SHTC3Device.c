#include <esp_log.h>
#include <i2cdev.h>
#include <freertos/FreeRTOS.h>
#include "SHTC3Device.h"

#define I2C_FREQ_HZ 1000000 // 1MHz
#define ESP_ERROR 0

const uint8_t sleep_cmd[2] = {0xB8, 0x98};
const uint8_t wakeup_cmd[2] = {0x35, 0x17};
//static const uint8_t read_temp_cmd[2] = {0x78, 0x66};
//static const uint8_t sensor_ID_cmd[2] = {0xEF, 0xC8};
const uint8_t read_temp_lp_cmd[2] = {0x60, 0x9C};

static uint8_t read_buff[6] = {0x00, 0x00, 0x00, 0x00, 0x00, 0x00};

esp_err_t shtc3_init_desc(shtc3_t *dev, uint8_t addr, i2c_port_t port, gpio_num_t sda_gpio, gpio_num_t scl_gpio){

    dev->i2c_dev.port = port;
    dev->i2c_dev.addr = addr;
    dev->i2c_dev.cfg.sda_io_num = sda_gpio;
    dev->i2c_dev.cfg.scl_io_num = scl_gpio;
    dev->i2c_dev.timeout_ticks = 0; // set to default
#if HELPER_TARGET_IS_ESP32
    dev->i2c_dev.cfg.master.clk_speed = I2C_FREQ_HZ;
#endif

    return i2c_dev_create_mutex(&dev->i2c_dev);

}

esp_err_t readDeviceTH(shtc3_t *dev, float *temp, float *rh){

    //esp_err_t ret;

    //Se despierta el sensor del modo ahorro de energía:
    ESP_ERROR_CHECK( i2c_dev_write(&dev->i2c_dev, NULL, 0, wakeup_cmd, 2) );

    vTaskDelay(1/portTICK_PERIOD_MS); //Se espera 1ms a que se despierte el sensor

    //Se lee el sensor de temperatura y humedad:
    ESP_ERROR_CHECK( i2c_dev_write(&dev->i2c_dev, NULL, 0, read_temp_lp_cmd, 2) );

    vTaskDelay(13/portTICK_PERIOD_MS); //EL tiempo máximo de medida del sensor es de 12.1 ms

    ESP_ERROR_CHECK( i2c_dev_read(&dev->i2c_dev, NULL, 0, read_buff, 6) );

    //Se forma el dato de temperatura
    int temp_code = (read_buff[0] << 8) | read_buff[1];
    int rh_code = (read_buff[3] << 8) | read_buff[4];

    *temp = -45 + ((175 *  temp_code) >> 16) ;

    *rh = ( 100 * rh_code ) >> 16;

    //Se activa el modo bajo consumo
    //ERROR AQUÍ
    i2c_dev_write(&dev->i2c_dev, NULL, 0, sleep_cmd, 2);

    return ESP_OK;
}