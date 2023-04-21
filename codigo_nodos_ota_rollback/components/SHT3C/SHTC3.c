
#include "esp_log.h"
#include "driver/i2c.h"

#define T_H_SENSOR_ADDR                     0x70               //!< Slave address of the SHTC3 sensor 

static i2c_port_t i2c_port = I2C_NUM_0;

//static const char* TAG = "SHTC3";

static const uint8_t sleep_cmd[2] = {0xB8, 0x98};
static const uint8_t wakeup_cmd[2] = {0x35, 0x17};
//static const uint8_t read_temp_cmd[2] = {0x78, 0x66};
//static const uint8_t sensor_ID_cmd[2] = {0xEF, 0xC8};
static const uint8_t read_temp_lp_cmd[2] = {0x60, 0x9C};

static uint8_t read_buff[6] = {0x00, 0x00, 0x00, 0x00, 0x00, 0x00};

void read_T_H (float *temp, float *rh) {

    //Se despierta el sensor del modo ahorro de energía:
    i2c_master_write_to_device( i2c_port, T_H_SENSOR_ADDR, wakeup_cmd, 2, 1000/portTICK_PERIOD_MS );
    vTaskDelay(1/portTICK_PERIOD_MS); //Se espera 1ms a que se despierte el sensor

    //Se lee el sensor de temperatura y humedad:
    i2c_master_write_to_device( i2c_port, T_H_SENSOR_ADDR, read_temp_lp_cmd, 2, 1000/portTICK_PERIOD_MS );
    vTaskDelay(13/portTICK_PERIOD_MS); //EL tiempo máximo de medida del sensor es de 12.1 ms

    i2c_master_read_from_device( i2c_port, T_H_SENSOR_ADDR, read_buff, 6, 1000/portTICK_PERIOD_MS );
    
    //Se forma el dato de temperatura
    int temp_code = (read_buff[0] << 8) | read_buff[1];
    int rh_code = (read_buff[3] << 8) | read_buff[4];

    *temp = -45 + ((175 *  temp_code) >> 16) ;

    *rh = ( 100 * rh_code ) >> 16;

    //Modo de bajo consumo:
    i2c_master_write_to_device( i2c_port, T_H_SENSOR_ADDR, sleep_cmd, 2, 1000/portTICK_PERIOD_MS );
    
}
