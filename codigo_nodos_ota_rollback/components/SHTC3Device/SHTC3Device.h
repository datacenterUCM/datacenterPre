#include <i2cdev.h>
#include <esp_err.h>

typedef struct
{
    i2c_dev_t i2c_dev;
    // TODO: add more vars for configuration
} shtc3_t;

esp_err_t shtc3_init_desc(shtc3_t *dev, uint8_t addr, i2c_port_t port, gpio_num_t sda_gpio, gpio_num_t scl_gpio);

esp_err_t readDeviceTH(shtc3_t *dev, float *temp, float *rh);