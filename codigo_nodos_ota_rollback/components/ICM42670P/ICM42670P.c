#include "esp_log.h"
#include "driver/i2c.h"

#define SENSOR_ADDR                     0x68               /*!< Slave address of the SHTC3 sensor */

static i2c_port_t i2c_port = I2C_NUM_0;

static const char* TAG = "IMC42670P";

//REGISTERS
const uint8_t tempData1 = 0x09;
const uint8_t gyroDataX1 = 0x11;
const uint8_t acelDataX1 = 0x0B;
const uint8_t pwr_mgmt0 = 0x1F;
const uint8_t accel_config0 = 0x21;

//COMMANDS
const uint8_t gyroLowNoise = 0b00001100;
const uint8_t gyroAcelOnCmd = 0b00001111;
const uint8_t accel100Hz16g = 0b00001001;

void readGyro(int16_t *result){

    uint8_t buf[6];

    i2c_master_write_to_device( i2c_port, SENSOR_ADDR, &gyroDataX1, 1, 1000/portTICK_PERIOD_MS );

    i2c_master_read_from_device( i2c_port, SENSOR_ADDR, buf, 6, 1000/portTICK_PERIOD_MS );

    for(int i = 0; i<3; i++){

        *(result + i) = buf[2*i - 1] | ( buf[2*i] << 8 );

    }

}

void readAcelerometer(int16_t *result){

    uint8_t buf[6];

    i2c_master_write_to_device( i2c_port, SENSOR_ADDR, &acelDataX1, 1, 1000/portTICK_PERIOD_MS );

    i2c_master_read_from_device( i2c_port, SENSOR_ADDR, buf, 6, 1000/portTICK_PERIOD_MS );

    for(int i = 0; i<3; i++){

        *(result + i) = buf[2*i - 1] | ( buf[2*i] << 8 );

    }
 
}

float readTemp(){

    uint8_t buf[2];

    i2c_master_write_to_device( i2c_port, SENSOR_ADDR, &tempData1, 1, 1000/portTICK_PERIOD_MS );

    i2c_master_read_from_device( i2c_port, SENSOR_ADDR, buf, 2, 1000/portTICK_PERIOD_MS );

    ESP_LOGI(TAG, "Raw ICM42670P temp data: %d %d", buf[0], buf [1]);

    int data = buf[1] | ( buf[0] << 8);
    float result = ( data / 128 ) + 25;
    return result;

}

void setGyroLowNoise(){

    const uint8_t buf[2] = {pwr_mgmt0, gyroLowNoise};

    i2c_master_write_to_device( i2c_port, SENSOR_ADDR, &buf, 2, 1000/portTICK_PERIOD_MS );

}

void gyroAcelOn(){

    const uint8_t buf[2] = {pwr_mgmt0, gyroAcelOnCmd};

    i2c_master_write_to_device( i2c_port, SENSOR_ADDR, &buf, 2, 1000/portTICK_PERIOD_MS );

}

void configureAcel(){

    const uint8_t buf[2] = {accel_config0, accel100Hz16g};

    i2c_master_write_to_device( i2c_port, SENSOR_ADDR, &buf, 2, 1000/portTICK_PERIOD_MS );

}

void configureGyro(){



}