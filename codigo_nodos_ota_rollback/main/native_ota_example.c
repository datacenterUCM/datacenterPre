/* OTA example

   This example code is in the Public Domain (or CC0 licensed, at your option.)

   Unless required by applicable law or agreed to in writing, this
   software is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR
   CONDITIONS OF ANY KIND, either express or implied.
*/
#include <string.h>
#include "freertos/FreeRTOS.h"
#include "freertos/task.h"
#include "esp_system.h"
#include "esp_event.h"
#include "esp_log.h"
#include "esp_ota_ops.h"
#include "esp_app_format.h"
#include "esp_http_client.h"
#include "esp_flash_partitions.h"
#include "esp_partition.h"
#include "nvs.h"
#include "nvs_flash.h"
#include "driver/gpio.h"
#include "protocol_examples_common.h"
#include "errno.h"

#include <icm42670.h>
#include "ICM42670P.h"
#include "cJSON.h"
#include "mqtt_client.h"
#include "SHTC3Device.h"
#include "SHTC3.h"
#include "driver/i2c.h"

#include "time.h"

#if CONFIG_EXAMPLE_CONNECT_WIFI
#include "esp_wifi.h"
#endif

#define BUFFSIZE 1024
#define HASH_LEN 32 /* SHA-256 digest length */

static const char *TAG = "DATA CENTER";
/*an ota data write buffer ready to write to the flash*/
static char ota_write_data[BUFFSIZE + 1] = {0};
extern const uint8_t server_cert_pem_start[] asm("_binary_ca_cert_pem_start");
extern const uint8_t server_cert_pem_end[] asm("_binary_ca_cert_pem_end");

#define OTA_URL_SIZE 256

#define ICM42670_ADDR 0x68 /*!< Slave address of the ICM42670 sensor */
#define SHTC3_ADDR 0x70    /*!< Slave address of the SHTC3 sensor */

#define TEMP_HUM_PERIOD 10000 /*Periodo de muestreo de la temperatura y humedad*/
#define GYRO_PERIOD 20        /*Periodo de muestreo del giroscopio*/
#define ACCEL_PERIOD 10       /*Periodo de muestreo del acelerómetro*/
static uint16_t accelPeriod = 10;

#define GPIO_BUILTIN_LED 7
#define GPIO_PIN_SEL 1ULL << GPIO_BUILTIN_LED

#define VIB_ARRAY_LENGTH 5

TaskHandle_t gyroAlarmTaskHandle;
TaskHandle_t monitorVibTaskHandle;
TaskHandle_t twinGetDataTaskHandle;
TaskHandle_t twinSendGetDataTaskHandle;
TaskHandle_t checkVibrationsTaskHandle;

// Identificador del "thing" en eclipse ditto
const char *thingId = "org.eclipse.ditto:datacentertwin";

static uint8_t nodeId = 0;
// Buffer para el tópico al que se suscribirá el nodo dependiendo de su número de nodo
char *subsTopic[23];
// Buffer para suscribirse al tópico de nodo en específico y recibir actualizaciones ota individuales
char *otaTopicSingle[17];
// Buffer para suscribirse al tópico de nodo en específico y recibir reseteos individuales
char *resetTopicSingle[19];

// static const char* brokerUri = "mqtt://192.168.1.141:1883";
static const char *otaTopic = "/datacenter/ota";
static const char *alarmModuleTopic = "/datacenter/alarmModule";
static const char *dittoTopic = "eclipse-ditto-sandbox/org.eclipse.ditto:datacentertwin/things/twin/commands/modify";
static const char *generalReportTopic = "/datacenter/generalReport";
static const char *movementDetectedTopic = "/datacenter/movement";
static const char *movementNotDetectedTopic = "/datacenter/noMovement";
static const char *setThresholdTopic = "/datacenter/setThresh";
static const char *setTimeoutTopic = "/datacenter/setTimeout";
static const char *measureVibrOnTopic = "/datacenter/measureVibOn"; // Tópico que recibe la orden de medir las vibraciones. Si se miden, se envían las lecturas por mqtt, si no no.
static const char *measureVibrOffTopic = "/datacenter/measureVibOff";
static const char *vibMeasurementTopic = "/datacenter/vibMeasurement"; // Tópico al que se publican las medidas de vibracion, en caso de que estén activadas.
static const char *accelPeriodTopic = "/datacenter/accelPeriod";       // Tópico para modificar el periodo del acelerómetro
static const char *resetTopic = "/datacenter/reset"; // Tópico para resetear todos los nodos
static const char *logTopic = "/datacenter/log"; // En este tópico se publican los mensajes de log
static const char *logTopicOn = "/datacenter/logOn"; //Este tópico sirve para activar el envío de mensajes de log
static const char *logTopicOff = "/datacenter/logOff"; //Este tópico sirve para desactivar el envío de mensajes de log

static gpio_num_t i2c_gpio_sda = 10;
static gpio_num_t i2c_gpio_scl = 8;

static i2c_port_t i2c_port = I2C_NUM_0;

// Queue for twin
QueueHandle_t twinQueue;

// Cola donde se almacenarán los datos de vibración
QueueHandle_t vibQueue;

struct vibStructFormat{
    int16_t xVal;
    int16_t yVal;
    int16_t zVal;
};

// Estructura de datos que sirve para intercambiar información entre la tarea que recopila los datos
// y la tarea que envía los datos a ditto
struct twinDataFormat
{
    float temp;
    float rh;
} twinDataf;

// Esta variable sirve para almacenar los últimos valores medidos.
struct twinDataFormat lastMeasurements;

struct otaTaskParamsFormat
{
    char url[70];
    int urlLen;
} otaTaskParams;

static struct otaTaskParamsFormat otaParams;

// Variables que almacenan las direcciones de los registros del acelerómetro y variable que almacena la instancia del dispositivo.
// Estas variables son globales porque son usadas por dos tareas.
static const uint8_t accelxReg = ICM42670_REG_ACCEL_DATA_X1;
static const uint8_t accelyReg = ICM42670_REG_ACCEL_DATA_Y1;
static const uint8_t accelzReg = ICM42670_REG_ACCEL_DATA_Z1;
icm42670_t device = {0};
// Este valor es el umbral de vibración a partir del cual se detecta movimiento.
static uint16_t vibThres;
// Este es el tiempo que debería transcurrir entre vibraciones de la máquina de frio (m).
static uint16_t vibTime;
// Esta variable sirve para activar o desactivar el envío por mqtt de los datos de vibración.
static bool sendVibrOnOff = false;
// Llaves para la nvs
char *vibTimeKey = "vibTime";
char *vibThresKey = "vibThres";

// Esta variable sirve para activar o descartivar el envío de mensajes de log
static bool sendLog = false;
char *logBuf [200];

// Handle para la nvs
nvs_handle_t nvsHandle;

// Esta variable sirve para indicar si el estado de la máquina de frio es el correcto
// Cambiará a false cuando haya transcurrido un tiempo desde que no se detectan vibraciones en la máquina.
static bool airConditioningOk = true;

static void log_error_if_nonzero(const char *message, int error_code)
{
    if (error_code != 0)
    {
        ESP_LOGE(TAG, "Last error %s: 0x%x", message, error_code);
    }
}

void gyroAlarmTask(void *pvParameters)
{

    icm42670_t device = {0};

    // Init device descriptor and device
    ESP_ERROR_CHECK(icm42670_init_desc(&device,
                                       ICM42670_ADDR,
                                       i2c_port,
                                       i2c_gpio_sda,
                                       i2c_gpio_scl));

    ESP_ERROR_CHECK(icm42670_init(&device));

    // enable accelerometer and gyro in low-noise (LN) mode
    ESP_ERROR_CHECK(icm42670_set_gyro_pwr_mode(&device, ICM42670_GYRO_ENABLE_LN_MODE));

    uint8_t gyroxReg = ICM42670_REG_GYRO_DATA_X1;
    uint8_t gyroyReg = ICM42670_REG_GYRO_DATA_Y1;
    uint8_t gyrozReg = ICM42670_REG_GYRO_DATA_Z1;

    int16_t gyroDataX;
    int16_t gyroDataY;
    int16_t gyroDataZ;

    while (1)
    {

        ESP_ERROR_CHECK(icm42670_read_raw_data(&device, gyroxReg, &gyroDataX));
        ESP_ERROR_CHECK(icm42670_read_raw_data(&device, gyroyReg, &gyroDataY));
        ESP_ERROR_CHECK(icm42670_read_raw_data(&device, gyrozReg, &gyroDataZ));

        // ESP_LOGI(TAG, "gyro x: %d, gyro y: %d, gyro z: %d\n", gyroDataX, gyroDataY, gyroDataZ);

        if (gyroDataY > 300 || gyroDataY < -300 || gyroDataY > 300 || gyroDataY < -300)
        {
            ESP_LOGW(TAG, "MOVIMIENTO DETECTADO\n");
            vTaskDelay(3000 / portTICK_PERIOD_MS);
        }

        vTaskDelay(pdMS_TO_TICKS(GYRO_PERIOD));
    }
}

// Esta función lee la cola de vibraciones, calcula la media de los 4 últimos elementos de la cola y 
// los compara con el primero de la cola.
// Si la medida ha variado un determinado umbral con respecto a la media, es que se ha producido movimiento y se envía la alarma.
void checkVibrationsTask(void *pvParameters){

    // Obtain the mqtt client
    esp_mqtt_client_handle_t client = *((esp_mqtt_client_handle_t *)pvParameters);

    clock_t timer = clock();

    const char *type = "airConditionateAlarm";

    // En este array se guardan todos los valores de la cola
    struct vibStructFormat vibMeasArray[5];

    BaseType_t xStatus;

    //Este contador sirve para comprobar que cuando se empiecen a procesar los datos del array, este tenga
    //ya 5 elementos
    uint8_t contador = 0;

    while(1){

        // El elemento de la cola (la última vibración medida) se guarda en la primera posición del array
        xStatus = xQueueReceive(vibQueue, &vibMeasArray[0], 1000);
        if(xStatus == pdTRUE){
            if(contador < 5) contador ++;

            // Tan sólo se procesan los datos si el array tiene 5 datos de vibración cargados
            if(contador == 5){
                struct vibStructFormat vibAvg;
                vibAvg.xVal = 0;
                vibAvg.yVal = 0;
                vibAvg.zVal = 0;

                // Se calcula la media de las 4 últimas posiciones del array
                for(int i=0; i<VIB_ARRAY_LENGTH-1; i++){
                    vibAvg.xVal = vibAvg.xVal + vibMeasArray[i+1].xVal;
                    vibAvg.yVal = vibAvg.yVal + vibMeasArray[i+1].yVal;
                    vibAvg.zVal = vibAvg.zVal + vibMeasArray[i+1].zVal;
                }
                vibAvg.xVal = vibAvg.xVal / (VIB_ARRAY_LENGTH-1);
                vibAvg.yVal = vibAvg.yVal / (VIB_ARRAY_LENGTH-1);
                vibAvg.zVal = vibAvg.zVal / (VIB_ARRAY_LENGTH-1);

                //printf("Z vib: [%d, %d, %d, %d, %d] media: %d, vibThresh: %d\n", vibMeasArray[0].zVal, vibMeasArray[1].zVal, vibMeasArray[2].zVal,vibMeasArray[3].zVal, vibMeasArray[4].zVal, vibAvg.zVal, vibThres);

                if(sendLog == true){
                    sprintf(logBuf, "Z vib: [%d, %d, %d, %d, %d] media: %d, vibThresh: %d\n", vibMeasArray[0].zVal, vibMeasArray[1].zVal, vibMeasArray[2].zVal,vibMeasArray[3].zVal, vibMeasArray[4].zVal, vibAvg.zVal, vibThres);
                    esp_mqtt_client_publish(client, logTopic, logBuf, 0, 0, 0);
                }
                

                // Si la la última medida de vibración (posicion 0 del array) se diferencia en el umbral 
                // a la media de las 4 medidas anteriores, se ha detectado movimiento.
                if (vibMeasArray[0].xVal > vibAvg.xVal + vibThres || vibMeasArray[0].xVal < vibAvg.xVal - vibThres 
                    || vibMeasArray[0].yVal > vibAvg.yVal + vibThres || vibMeasArray[0].yVal < vibAvg.yVal - vibThres 
                    || vibMeasArray[0].zVal > vibAvg.zVal + vibThres || vibMeasArray[0].zVal < vibAvg.yVal - vibThres){

                        ESP_LOGI(TAG, "MOVIMIENTO DETECTADO\n");

                        // Cada vez que se detecta movimiento se resetea el reloj.
                        timer = clock();

                        // Cada vez que se detecta movimiento se avisa por mqtt
                        cJSON *root = cJSON_CreateObject();

                        cJSON_AddStringToObject(root, "type", type);
                        cJSON_AddNumberToObject(root, "node", nodeId);
                        cJSON_AddNumberToObject(root, "xVal", vibMeasArray[0].xVal);
                        cJSON_AddNumberToObject(root, "yVal", vibMeasArray[0].yVal);
                        cJSON_AddNumberToObject(root, "zVal", vibMeasArray[0].zVal);
                        cJSON_AddNumberToObject(root, "xAvg", vibAvg.xVal);
                        cJSON_AddNumberToObject(root, "yAvg", vibAvg.yVal);
                        cJSON_AddNumberToObject(root, "zAvg", vibAvg.zVal);
                        cJSON_AddNumberToObject(root, "vibThresh", vibThres);
                        const char *buf = cJSON_Print(root);
                        cJSON_Delete(root);
                        esp_mqtt_client_publish(client, movementDetectedTopic, buf, 0, 0, 0);
                        free(buf);

                        contador = 0;

                        airConditioningOk = true;
                        vTaskDelay(1000 / portTICK_PERIOD_MS);

                        //TODO limpiar la cola
                        xQueueReset(vibQueue);
                }

            }

            // Se calcula el tiempo transcurrido desde la última vez que se detectó movimiento y el instante actual.
            // Si ha transcurrido más tiempo que el habitual entre vibraciones, se lanza una alarma y se marca la variable
            // de estado "airConditioningOk" como "false".
            double time = ((double)(clock() - timer)) / CLOCKS_PER_SEC;
            if (time > (vibTime * 60) && airConditioningOk == true)
            {
                ESP_LOGW(TAG, "HAN TRANSCURRIDO %dmin DESDE LA ÚLTIMA VIBRACIÓN. ENVIANDO ALERTA...", vibTime);
                airConditioningOk = false;

                // Se prepara un mensaje de alarma para indicar que no se han detectado las vibraciones desde hace un tiempo
                cJSON *root = cJSON_CreateObject();

                cJSON_AddStringToObject(root, "thingId", thingId);
                cJSON_AddStringToObject(root, "type", type);
                cJSON_AddNumberToObject(root, "node", nodeId);
                const char *buf = cJSON_Print(root);
                cJSON_Delete(root);
                esp_mqtt_client_publish(client, movementNotDetectedTopic, buf, 0, 0, 0);
                free(buf);
            }

            // Se desplazan todos los elementos del array hacia la derecha para dejar libre la primera posición. 
            // Se deshecha el último valor
            for(int i=VIB_ARRAY_LENGTH-1; i>0; i--){
                vibMeasArray[i] = vibMeasArray[i-1];
            }

        }

    }

}

// Esta tarea únicamente mide y envía los datos de vibración
void monitorVibTask(void *pvParameters)
{
    printf("tarea de monitorizacion\n");

    //Estructura para guardar los datos de vibración
    struct vibStructFormat vibMeasurements;
    //Cola donde se introducen los datos de vibración
    vibQueue = xQueueCreate(5, sizeof(vibMeasurements));

    // Obtain the mqtt client
    esp_mqtt_client_handle_t client = *((esp_mqtt_client_handle_t *)pvParameters);

    // Init device descriptor and device
    ESP_ERROR_CHECK(icm42670_init_desc(&device,
                                       ICM42670_ADDR,
                                       i2c_port,
                                       i2c_gpio_sda,
                                       i2c_gpio_scl));

    ESP_ERROR_CHECK(icm42670_init(&device));

    // enable accelerometer and gyro in low-noise (LN) mode
    ESP_ERROR_CHECK(icm42670_set_accel_pwr_mode(&device, ICM42670_ACCEL_ENABLE_LN_MODE));

    // Variables para almacenar los valores instantáneos del acelerómetro y para almacenar su media en cada eje:
    int16_t accelDataX;
    int16_t accelDataY;
    int16_t accelDataZ;

    const char *type = "airConditionateMeasurement";

    while (1)
    {
        /*ESP_ERROR_CHECK(icm42670_read_raw_data(&device, accelxReg, &accelDataX));
        ESP_ERROR_CHECK(icm42670_read_raw_data(&device, accelyReg, &accelDataY));
        ESP_ERROR_CHECK(icm42670_read_raw_data(&device, accelzReg, &accelDataZ));*/

        ESP_ERROR_CHECK(icm42670_read_raw_data(&device, accelxReg, &(vibMeasurements.xVal)));
        ESP_ERROR_CHECK(icm42670_read_raw_data(&device, accelyReg, &vibMeasurements.yVal));
        ESP_ERROR_CHECK(icm42670_read_raw_data(&device, accelzReg, &vibMeasurements.zVal));

        // Las medidas se toman en valor absoluto ya que, como se va a calcular la media, el resultado de esta podría ser próximo a 0 si
        // se están tomando medidas consecutivamente positivas y negativas: media(700, -700, 700, -700) = 0
        if (vibMeasurements.xVal < 0)
            vibMeasurements.xVal = -1 * vibMeasurements.xVal;
        if (vibMeasurements.yVal < 0)
            vibMeasurements.yVal = -1 * vibMeasurements.yVal;
        if (vibMeasurements.zVal < 0)
            vibMeasurements.zVal = -1 * vibMeasurements.zVal;

        // Si el envío del valor de las vibraciones está activado se envían las mediciones
        if (sendVibrOnOff == true)
        {

            cJSON *root = cJSON_CreateObject();

            cJSON_AddStringToObject(root, "thingId", thingId);
            cJSON_AddStringToObject(root, "type", type);
            cJSON_AddNumberToObject(root, "node", nodeId);
            cJSON_AddNumberToObject(root, "xVal", vibMeasurements.xVal);
            cJSON_AddNumberToObject(root, "yVal", vibMeasurements.yVal);
            cJSON_AddNumberToObject(root, "zVal", vibMeasurements.zVal);

            const char *buf = cJSON_Print(root);
            cJSON_Delete(root);
            esp_mqtt_client_publish(client, vibMeasurementTopic, buf, 0, 0, 0);
            free(buf);
        }

        //printf("introduciendo valor en la cola...\n");
        xQueueSendToFront(vibQueue, &vibMeasurements, 100);

        vTaskDelay(pdMS_TO_TICKS(accelPeriod));
    }
}

// This task colects the data from sensors and insert them into a queue
void twinGetDataTask(void *pvParameters)
{

    // Init queue
    twinQueue = xQueueCreate(5, sizeof(twinDataf));

    // Init i2c
    shtc3_t dev;

    ESP_ERROR_CHECK(shtc3_init_desc(&dev,
                                    SHTC3_ADDR,
                                    i2c_port,
                                    i2c_gpio_sda,
                                    i2c_gpio_scl));

    struct twinDataFormat twinData;

    while (1)
    {

        ESP_ERROR_CHECK(readDeviceTH(&dev, &twinData.temp, &twinData.rh));
        ESP_LOGI(TAG, "SHTC3 temperature: %f, humidity: %f\n", twinData.temp, twinData.rh);

        lastMeasurements.temp = twinData.temp;
        lastMeasurements.rh = twinData.rh;

        xQueueSendToFront(twinQueue, &twinData, 100);

        vTaskDelay(TEMP_HUM_PERIOD / portTICK_PERIOD_MS);
    }
}

// This task reads the queue and send data through mqtt to Ditto
void twinSendGetDataTask(void *pvParameters)
{
    // Obtain the mqtt client
    esp_mqtt_client_handle_t client = *((esp_mqtt_client_handle_t *)pvParameters);

    // Config for Queue
    struct twinDataFormat twinData;
    BaseType_t xStatus;

    // Config for JSON format
    char *tempUnits = "C";
    char *humUnits = "rh";
    char *type = "measurements";

    while (1)
    {

        xStatus = xQueueReceive(twinQueue, &twinData, 1000);

        if (xStatus == pdTRUE)
        {
            cJSON *root = cJSON_CreateObject();

            cJSON_AddStringToObject(root, "thingId", thingId);
            cJSON_AddStringToObject(root, "type", type);
            cJSON_AddNumberToObject(root, "node", nodeId);
            cJSON_AddNumberToObject(root, "temp", (double)twinData.temp);
            cJSON_AddNumberToObject(root, "hum", (double)twinData.rh);
            const char *buf = cJSON_Print(root);
            cJSON_Delete(root);
            esp_mqtt_client_publish(client, dittoTopic, buf, 0, 0, 0);
            free(buf);
        }
    }
}

static void http_cleanup(esp_http_client_handle_t client)
{
    esp_http_client_close(client);
    esp_http_client_cleanup(client);
}

static void __attribute__((noreturn)) task_fatal_error(void)
{
    ESP_LOGE(TAG, "Exiting task due to fatal error...");
    esp_restart();
    (void)vTaskDelete(NULL);

    while (1)
    {
        ;
    }
}

static void infinite_loop(void)
{
    int i = 0;
    ESP_LOGI(TAG, "When a new firmware is available on the server, press the reset button to download it");
    ESP_LOGI(TAG, "La versión de la imagen a descargar no es válida. Procediendo a reseteo...");
    esp_restart();
    while (1)
    {
        ESP_LOGI(TAG, "Waiting for a new firmware ... %d", ++i);
        vTaskDelay(2000 / portTICK_PERIOD_MS);
    }
}

static void ota_task_fcn(void)
{
    esp_err_t err;
    // update handle : set by esp_ota_begin(), must be freed via esp_ota_end()
    esp_ota_handle_t update_handle = 0;
    const esp_partition_t *update_partition = NULL;

    ESP_LOGI(TAG, "Starting OTA example task");

    const esp_partition_t *configured = esp_ota_get_boot_partition();
    const esp_partition_t *running = esp_ota_get_running_partition();

    if (configured != running)
    {
        ESP_LOGW(TAG, "Configured OTA boot partition at offset 0x%08x, but running from offset 0x%08x",
                 configured->address, running->address);
        ESP_LOGW(TAG, "(This can happen if either the OTA boot data or preferred boot image become corrupted somehow.)");
    }
    ESP_LOGI(TAG, "Running partition type %d subtype %d (offset 0x%08x)",
             running->type, running->subtype, running->address);

    esp_http_client_config_t config = {
        //.url = CONFIG_EXAMPLE_FIRMWARE_UPG_URL,
        .url = otaParams.url,
        .cert_pem = (char *)server_cert_pem_start,
        .timeout_ms = CONFIG_EXAMPLE_OTA_RECV_TIMEOUT,
        .keep_alive_enable = true,
    };

#ifdef CONFIG_EXAMPLE_FIRMWARE_UPGRADE_URL_FROM_STDIN // NO
    char url_buf[OTA_URL_SIZE];
    if (strcmp(config.url, "FROM_STDIN") == 0)
    {
        example_configure_stdin_stdout();
        fgets(url_buf, OTA_URL_SIZE, stdin);
        int len = strlen(url_buf);
        url_buf[len - 1] = '\0';
        config.url = url_buf;
    }
    else
    {
        ESP_LOGE(TAG, "Configuration mismatch: wrong firmware upgrade image url");
        abort();
    }
#endif

#ifdef CONFIG_EXAMPLE_SKIP_COMMON_NAME_CHECK // NO
    config.skip_cert_common_name_check = true;
#endif
    esp_http_client_handle_t client = esp_http_client_init(&config);
    if (client == NULL)
    {
        printf("oda0\n");
        ESP_LOGE(TAG, "Failed to initialise HTTP connection");
        task_fatal_error();
    }
    err = esp_http_client_open(client, 0);
    if (err != ESP_OK)
    {
        ESP_LOGE(TAG, "Failed to open HTTP connection: %s", esp_err_to_name(err));
        esp_http_client_cleanup(client);
        task_fatal_error();
    }
    esp_http_client_fetch_headers(client);
    update_partition = esp_ota_get_next_update_partition(NULL);
    assert(update_partition != NULL);
    ESP_LOGI(TAG, "Writing to partition subtype %d at offset 0x%x",
             update_partition->subtype, update_partition->address);

    int binary_file_length = 0;
    // deal with all receive packet
    bool image_header_was_checked = false;

    while (1)
    {
        int data_read = esp_http_client_read(client, ota_write_data, BUFFSIZE);
        if (data_read < 0)
        {
            ESP_LOGE(TAG, "Error: SSL data read error");
            http_cleanup(client);
            task_fatal_error();
        }
        else if (data_read > 0)
        {
            if (image_header_was_checked == false)
            {
                esp_app_desc_t new_app_info;
                if (data_read > sizeof(esp_image_header_t) + sizeof(esp_image_segment_header_t) + sizeof(esp_app_desc_t))
                {
                    // check current version with downloading
                    memcpy(&new_app_info, &ota_write_data[sizeof(esp_image_header_t) + sizeof(esp_image_segment_header_t)], sizeof(esp_app_desc_t));
                    ESP_LOGI(TAG, "New firmware version: %s", new_app_info.version);

                    esp_app_desc_t running_app_info;
                    if (esp_ota_get_partition_description(running, &running_app_info) == ESP_OK)
                    {
                        ESP_LOGI(TAG, "Running firmware version: %s", running_app_info.version);
                    }

                    const esp_partition_t *last_invalid_app = esp_ota_get_last_invalid_partition();
                    esp_app_desc_t invalid_app_info;
                    if (esp_ota_get_partition_description(last_invalid_app, &invalid_app_info) == ESP_OK)
                    {
                        ESP_LOGI(TAG, "Last invalid firmware version: %s", invalid_app_info.version);
                    }

                    if (atoi(new_app_info.version) < atoi(running_app_info.version))
                    {
                        ESP_LOGW(TAG, "La versión nueva es anterior a la actual. Reseteando...");
                        esp_restart();
                    }

                    // check current version with last invalid partition
                    if (last_invalid_app != NULL)
                    {
                        if (memcmp(invalid_app_info.version, new_app_info.version, sizeof(new_app_info.version)) == 0)
                        {
                            ESP_LOGW(TAG, "New version is the same as invalid version.");
                            ESP_LOGW(TAG, "Previously, there was an attempt to launch the firmware with %s version, but it failed.", invalid_app_info.version);
                            ESP_LOGW(TAG, "The firmware has been rolled back to the previous version.");
                            http_cleanup(client);
                            // infinite_loop();
                            task_fatal_error();
                        }
                    }
#ifndef CONFIG_EXAMPLE_SKIP_VERSION_CHECK
                    if (memcmp(new_app_info.version, running_app_info.version, sizeof(new_app_info.version)) == 0)
                    {
                        ESP_LOGW(TAG, "Current running version is the same as a new. We will not continue the update.");
                        http_cleanup(client);
                        infinite_loop();
                    }
#endif

                    image_header_was_checked = true;

                    err = esp_ota_begin(update_partition, OTA_WITH_SEQUENTIAL_WRITES, &update_handle);
                    if (err != ESP_OK)
                    {
                        ESP_LOGE(TAG, "esp_ota_begin failed (%s)", esp_err_to_name(err));
                        http_cleanup(client);
                        esp_ota_abort(update_handle);
                        task_fatal_error();
                    }
                    ESP_LOGI(TAG, "esp_ota_begin succeeded");
                }
                else
                {
                    ESP_LOGE(TAG, "received package is not fit len");
                    http_cleanup(client);
                    esp_ota_abort(update_handle);
                    task_fatal_error();
                }
            }
            err = esp_ota_write(update_handle, (const void *)ota_write_data, data_read);
            if (err != ESP_OK)
            {
                http_cleanup(client);
                esp_ota_abort(update_handle);
                task_fatal_error();
            }
            binary_file_length += data_read;
            ESP_LOGD(TAG, "Written image length %d", binary_file_length);
        }
        else if (data_read == 0)
        {

            // As esp_http_client_read never returns negative error code, we rely on
            //`errno` to check for underlying transport connectivity closure if any

            if (errno == ECONNRESET || errno == ENOTCONN)
            {
                ESP_LOGE(TAG, "Connection closed, errno = %d", errno);
                break;
            }
            if (esp_http_client_is_complete_data_received(client) == true)
            {
                ESP_LOGI(TAG, "Connection closed");
                break;
            }
        }
    }
    ESP_LOGI(TAG, "Total Write binary data length: %d", binary_file_length);
    if (esp_http_client_is_complete_data_received(client) != true)
    {
        ESP_LOGE(TAG, "Error in receiving complete file");
        http_cleanup(client);
        esp_ota_abort(update_handle);
        task_fatal_error();
    }

    err = esp_ota_end(update_handle);
    if (err != ESP_OK)
    {
        if (err == ESP_ERR_OTA_VALIDATE_FAILED)
        {
            ESP_LOGE(TAG, "Image validation failed, image is corrupted");
        }
        else
        {
            ESP_LOGE(TAG, "esp_ota_end failed (%s)!", esp_err_to_name(err));
        }
        http_cleanup(client);
        task_fatal_error();
    }

    err = esp_ota_set_boot_partition(update_partition);
    if (err != ESP_OK)
    {
        ESP_LOGE(TAG, "esp_ota_set_boot_partition failed (%s)!", esp_err_to_name(err));
        http_cleanup(client);
        task_fatal_error();
    }
    ESP_LOGI(TAG, "Prepare to restart system!");
    esp_restart();
    return;
}

// Esta función se ejecuta para comprobar la conexión con el servidor https
bool check_https_connection()
{
    printf("sape\n");
    int len = strlen("test.txt");
    int urlLen = sizeof(CONFIG_EXAMPLE_FIRMWARE_UPG_URL);
    int bufSize = len + urlLen - 1;
    printf("sapito\n");
    const char *partialUrl = CONFIG_EXAMPLE_FIRMWARE_UPG_URL;
    char newImageUrl[50];
    strcpy(newImageUrl, partialUrl);
    printf("sapeeeeeeee\n");
    strncat(newImageUrl, "test.txt", bufSize);  
    newImageUrl[bufSize + 1] = '\0';
    printf("url: %s\n", newImageUrl);

    esp_http_client_config_t config = {
        .url = newImageUrl,
        .cert_pem = (char *)server_cert_pem_start,
        .timeout_ms = CONFIG_EXAMPLE_OTA_RECV_TIMEOUT,
        .keep_alive_enable = true,
    };

    esp_http_client_handle_t client = esp_http_client_init(&config);
    if (client == NULL) {
        ESP_LOGE(TAG, "Failed to initialise HTTP connection");
        return false;
    }
    esp_err_t err = esp_http_client_open(client, 0);
    if (err != ESP_OK) {
        ESP_LOGE(TAG, "Failed to open HTTP connection: %s", esp_err_to_name(err));
        esp_http_client_cleanup(client);
        return false;
    }
    esp_http_client_fetch_headers(client);

    esp_http_client_close(client);
    esp_http_client_cleanup(client);

    return true;
}

static void print_sha256(const uint8_t *image_hash, const char *label)
{
    char hash_print[HASH_LEN * 2 + 1];
    hash_print[HASH_LEN * 2] = 0;
    for (int i = 0; i < HASH_LEN; ++i)
    {
        sprintf(&hash_print[i * 2], "%02x", image_hash[i]);
    }
    ESP_LOGI(TAG, "%s: %s", label, hash_print);
}

static void mqtt_event_handler(void *handler_args, esp_event_base_t base, int32_t event_id, void *event_data)
{
    // ESP_LOGD(TAG, "Event dispatched from event loop base=%s, event_id=%d", base, event_id);
    esp_mqtt_event_handle_t event = event_data;
    esp_mqtt_client_handle_t client = event->client;
    switch ((esp_mqtt_event_id_t)event_id)
    {
    case MQTT_EVENT_CONNECTED:
        ESP_LOGI(TAG, "MQTT_EVENT_CONNECTED");

        sprintf(subsTopic, "/datacenter/node/%d/#", nodeId);
        sprintf(otaTopicSingle, "/datacenter/ota/%d", nodeId);
        sprintf(resetTopicSingle, "/datacenter/reset/%d", nodeId);
        printf("reset single topic: %s\n",resetTopicSingle);
        esp_mqtt_client_subscribe(client, subsTopic, 2);
        esp_mqtt_client_subscribe(client, otaTopicSingle, 2);
        esp_mqtt_client_subscribe(client, otaTopic, 2);
        esp_mqtt_client_subscribe(client, generalReportTopic, 2);
        esp_mqtt_client_subscribe(client, resetTopic, 2);
        esp_mqtt_client_subscribe(client, resetTopicSingle, 2);
        esp_mqtt_client_subscribe(client, logTopicOn, 2);
        esp_mqtt_client_subscribe(client, logTopicOff, 2);
        if (nodeId == 9)
        {
            esp_mqtt_client_subscribe(client, setThresholdTopic, 2);
            esp_mqtt_client_subscribe(client, setTimeoutTopic, 2);
            esp_mqtt_client_subscribe(client, measureVibrOnTopic, 2);
            esp_mqtt_client_subscribe(client, measureVibrOffTopic, 2);
            esp_mqtt_client_subscribe(client, accelPeriodTopic, 2);
        }

        break;
    case MQTT_EVENT_DISCONNECTED:
        ESP_LOGI(TAG, "MQTT_EVENT_DISCONNECTED");

        ESP_LOGI(TAG, "Performing reboot due to broker disconnection");
        // Se realiza un reseteo si no se puede conectar con el broker
        esp_restart();
        break;

    case MQTT_EVENT_SUBSCRIBED:
        ESP_LOGI(TAG, "MQTT_EVENT_SUBSCRIBED, msg_id=%d", event->msg_id);
        break;

    case MQTT_EVENT_UNSUBSCRIBED:
        ESP_LOGI(TAG, "MQTT_EVENT_UNSUBSCRIBED, msg_id=%d", event->msg_id);
        break;

    case MQTT_EVENT_PUBLISHED:
        ESP_LOGI(TAG, "MQTT_EVENT_PUBLISHED, msg_id=%d", event->msg_id);
        break;

    case MQTT_EVENT_DATA:
        ESP_LOGI(TAG, "MQTT_EVENT_DATA");
        printf("TOPIC=%.*s\r\n", event->topic_len, event->topic);
        printf("DATA=%.*s\r\n", event->data_len, event->data);

        // Si se recibe una orden para hacer ota se ejecuta el proceso.
        // Es necesario comprobar que la longitud de la url recibida no exceda la longitud del buffer de recepción para que
        // no se produzca un desbordamiento de buffer.
        // El payload recibido contiene el nombre de la imagen que se flasheará.
        if (strncmp(event->topic, otaTopic, 15) == 0 || strncmp(event->topic, otaTopicSingle, 17) == 0)
        {
            int msgLen = event->data_len;
            int urlLen = sizeof(CONFIG_EXAMPLE_FIRMWARE_UPG_URL);
            const char *partialUrl = CONFIG_EXAMPLE_FIRMWARE_UPG_URL;
            char newImageUrl[50];
            int bufSize = msgLen + urlLen - 1;
            if (bufSize <= sizeof(otaParams.url))
            {
                // int bufSize = strlen(newImageUrl) + event->data_len;
                strcpy(newImageUrl, partialUrl);
                strncat(newImageUrl, event->data, bufSize);

                // Se preparan los parámetros para la tarea ota (url de la nueva imagen y longitud de la url)
                strncpy(otaParams.url, newImageUrl, bufSize);
                otaParams.url[bufSize + 1] = '\0';
                otaParams.urlLen = bufSize;
                ESP_LOGI(TAG, "New image url: %s\n", otaParams.url);
                if (nodeId == 9)
                {
                    vTaskSuspend(monitorVibTaskHandle);
                    vTaskSuspend(checkVibrationsTaskHandle);
                }
                vTaskSuspend(twinGetDataTaskHandle);
                vTaskSuspend(twinSendGetDataTaskHandle);

                ota_task_fcn();
            }
            else
            {
                ESP_LOGW(TAG, "Rejected ota request: Tried to overflow buffer");
            }
        }
        // Orden recibida para reportar el estado del sensor
        else if (strncmp(event->topic, subsTopic, 18) == 0 || strncmp(event->topic, generalReportTopic, 25) == 0)
        {
            // El mensaje que se recibe aquí es single o multi (single para cuando el servidor requiere tan sólo los datos de un nodo
            // y multi cuando se requieren datos de todos los nodos)
            char type[6];
            strncpy(type, event->data, 5);
            type[5] = '\0';

            // Se obtiene la versión del firmware corriendo actualmente
            esp_partition_t *running = esp_ota_get_running_partition();
            esp_app_desc_t running_app_info;
            if (esp_ota_get_partition_description(running, &running_app_info) == ESP_OK)
            {
                ESP_LOGI(TAG, "Running firmware version: %s", running_app_info.version);
            }

            ESP_LOGI(TAG, "Mensaje recibido del módulo de alarmas\n");
            // Se crea un json con los datos para enviarlo

            cJSON *root = cJSON_CreateObject();

            cJSON_AddStringToObject(root, "type", type);
            cJSON_AddStringToObject(root, "version", running_app_info.version);
            cJSON_AddNumberToObject(root, "node", nodeId);
            cJSON_AddNumberToObject(root, "temp", (double)lastMeasurements.temp);
            cJSON_AddNumberToObject(root, "hum", (double)lastMeasurements.rh);
            if (nodeId == 9)
            {
                cJSON_AddNumberToObject(root, "vibTime", vibTime);
                cJSON_AddNumberToObject(root, "vibThres", vibThres);
                cJSON_AddBoolToObject(root, "airConditioningOk", airConditioningOk);
            }
            const char *buf = cJSON_Print(root);

            esp_mqtt_client_publish(client, alarmModuleTopic, buf, 0, 0, 0);

            cJSON_Delete(root);
            free(buf);
            // lastMeasurements.temp
        }
        // Orden para cambiar el umbral a partir del cual se detecta vibración
        else if (strncmp(event->topic, setThresholdTopic, 21) == 0)
        {
            ESP_LOGI(TAG, "Modificando valor del umbral de vibración. Umbral anterior: %d Umbral nuevo: %.*s", vibThres, event->data_len, event->data);
            vibThres = 0;
            char num[5];
            sprintf(num, "%.*s", event->data_len, event->data);
            vibThres = atoi(num);
            // printf("%u\n", vibThres);
            ESP_LOGI(TAG, "Opening nvs...\n");
            ESP_ERROR_CHECK(nvs_open("nodeIdSpace", NVS_READWRITE, &nvsHandle));
            nvs_set_u16(nvsHandle, vibThresKey, vibThres);
            ESP_LOGI(TAG, "vibThres set in nvs");
            nvs_close(nvsHandle);
        }
        // Orden para cambiar el tiempo a partir del cual se envía una alarma de la máquina de frío
        else if (strncmp(event->topic, setTimeoutTopic, 22) == 0)
        {
            ESP_LOGI(TAG, "Modificando valor del tiempo de vibración. Tiempo anterior: %d Umbral nuevo: %.*s", vibTime, event->data_len, event->data);
            vibTime = 0;
            char num[5];
            sprintf(num, "%.*s", event->data_len, event->data); 
            vibTime = atoi(num);
            // printf("%u\n", vibTime);
            ESP_LOGI(TAG, "Opening nvs...\n");
            ESP_ERROR_CHECK(nvs_open("nodeIdSpace", NVS_READWRITE, &nvsHandle));
            nvs_set_u16(nvsHandle, vibTimeKey, vibTime);
            ESP_LOGI(TAG, "vibTime set in nvs");
            nvs_close(nvsHandle);
        }
        // Orden para activar el envío de datos de vibración (solo nodo 9 en modo monitor)
        else if (strncmp(event->topic, measureVibrOnTopic, 24) == 0)
        {

            ESP_LOGI(TAG, "Envío de datos de vibración ON");
            sendVibrOnOff = true;
        }
        // Orden para desactivar el envío de datos de vibración (solo nodo 9 en modo monitor)
        else if (strncmp(event->topic, measureVibrOffTopic, 25) == 0)
        {

            ESP_LOGI(TAG, "Envío de datos de vibración OFF");
            sendVibrOnOff = false;
        }
        // Orden para modificar el tiempo de muestreo de las vibraciones (solo nodo 9 en modo monitor) 
        else if (strncmp(event->topic, accelPeriodTopic, 23) == 0)
        {
            ESP_LOGI(TAG, "Modificación del periodo de muestreo de las vibraciones");
            char num[5];
            sprintf(num, "%.*s", event->data_len, event->data);
            accelPeriod = atoi(num);
        }
        // Orden para resetear el nodo. Reseteo general e indivitual
        else if (strncmp(event->topic, resetTopic, 17) == 0){
            ESP_LOGI(TAG, "Reseteo general. Reseteando ...");
            esp_restart();
        }
        else if(strncmp(event->topic, resetTopicSingle, 19) == 0){
            ESP_LOGI(TAG, "Reseteo individual. Reseteando ...");
            esp_restart();
        }
        //Orden para activar el envío de mensajes de log
        else if(strncmp(event->topic, logTopicOn, 17) == 0){
            ESP_LOGI(TAG, "Activando envío de log...");
            sendLog = true;
        }
        //Orden para desactivar el envío de mensajes de log
        else if(strncmp(event->topic, logTopicOff, 18) == 0){
            ESP_LOGI(TAG, "Desactivando envío de log...");
            sendLog = false;
        }
        break;

    case MQTT_EVENT_ERROR:
        ESP_LOGI(TAG, "MQTT_EVENT_ERROR");
        if (event->error_handle->error_type == MQTT_ERROR_TYPE_TCP_TRANSPORT)
        {
            log_error_if_nonzero("reported from esp-tls", event->error_handle->esp_tls_last_esp_err);
            log_error_if_nonzero("reported from tls stack", event->error_handle->esp_tls_stack_err);
            log_error_if_nonzero("captured as transport's socket errno", event->error_handle->esp_transport_sock_errno);
            ESP_LOGI(TAG, "Last errno string (%s)", strerror(event->error_handle->esp_transport_sock_errno));
        }
        break;

    default:
        ESP_LOGI(TAG, "Other event id:%d", event->event_id);
        break;
    }
}

static void mqtt_app_start(void)
{
    esp_mqtt_client_config_t mqtt_cfg = {
        .broker.address.uri = CONFIG_EXAMPLE_BROKER_URL,
        //.broker.address.uri = brokerUri,
    };
    printf("BROKER URI: %s\n", mqtt_cfg.broker.address.uri);
#if CONFIG_BROKER_URL_FROM_STDIN
    char line[128];

    if (strcmp(mqtt_cfg.broker.address.uri, "FROM_STDIN") == 0)
    {
        int count = 0;
        printf("Please enter url of mqtt broker\n");
        while (count < 128)
        {
            int c = fgetc(stdin);
            if (c == '\n')
            {
                line[count] = '\0';
                break;
            }
            else if (c > 0 && c < 127)
            {
                line[count] = c;
                ++count;
            }
            vTaskDelay(10 / portTICK_PERIOD_MS);
        }
        mqtt_cfg.broker.address.uri = line;
        // printf("Broker url: %s\n", line);
    }
    else
    {
        ESP_LOGE(TAG, "Configuration mismatch: wrong broker url");
        abort();
    }
#endif /* CONFIG_BROKER_URL_FROM_STDIN */

    esp_mqtt_client_handle_t client = esp_mqtt_client_init(&mqtt_cfg);
    /* The last argument may be used to pass data to the event handler, in this example mqtt_event_handler */
    esp_mqtt_client_register_event(client, ESP_EVENT_ANY_ID, mqtt_event_handler, NULL);
    esp_mqtt_client_start(client);

    // Se crean las tareas que requieren la instancia del cliente mqtt (pasada como parámetro).
    xTaskCreate(twinSendGetDataTask, "twinSendDataTask", 4096, &client, 3, &twinSendGetDataTaskHandle);
    if (nodeId == 9)
    {
        xTaskCreate(monitorVibTask, "monitorVibTask", 4096, &client, 4, &monitorVibTaskHandle);
        xTaskCreate(checkVibrationsTask, "checkVibrationsTask", 4096, &client, 4, &checkVibrationsTaskHandle);
    }
}

static bool diagnostic(void)
{
    // Se comprueba el funcionamiento del led:
    gpio_config_t io_conf;
    io_conf.intr_type = GPIO_INTR_DISABLE;
    io_conf.pin_bit_mask = GPIO_PIN_SEL;
    io_conf.mode = GPIO_MODE_OUTPUT;
    esp_err_t errorCheck = gpio_config(&io_conf);
    if (errorCheck != ESP_OK)
        return false;

    // Se comprueba el funcionamiento del bus I2C
    errorCheck = i2cdev_init();
    if (errorCheck != ESP_OK)
        return false;

    // Se comprueba el funcionamiento de la nvs:
    errorCheck = nvs_flash_init();
    if (errorCheck != ESP_OK)
        return false;

    // Se comprueba el funcionamiento del módulo wifi, conexión al AP:
    errorCheck = esp_netif_init();
    if (errorCheck != ESP_OK)
        return false;
    errorCheck = esp_netif_init();
    if (errorCheck != ESP_OK)
        return false;
    errorCheck = esp_event_loop_create_default();
    if (errorCheck != ESP_OK)
        return false;
    errorCheck = example_connect();
    if (errorCheck != ESP_OK)
        return false;
    
    bool httpsCheck = check_https_connection();
    if (httpsCheck == false)
        return false;

    return true;
}

void app_main(void)
{
    ESP_LOGI(TAG, "OTA example app_main start");

    // BuiltinLed configuracion. Al principio el led está apagado. Cuando se conecta al wifi se enciende
    gpio_config_t io_conf;
    io_conf.intr_type = GPIO_INTR_DISABLE;
    io_conf.pin_bit_mask = GPIO_PIN_SEL;
    io_conf.mode = GPIO_MODE_OUTPUT;
    gpio_config(&io_conf);
    gpio_set_level(GPIO_BUILTIN_LED, 0);

    uint8_t sha_256[HASH_LEN] = {0};
    esp_partition_t partition;

    // get sha256 digest for the partition table
    partition.address = ESP_PARTITION_TABLE_OFFSET;
    partition.size = ESP_PARTITION_TABLE_MAX_LEN;
    partition.type = ESP_PARTITION_TYPE_DATA;
    esp_partition_get_sha256(&partition, sha_256);
    print_sha256(sha_256, "SHA-256 for the partition table: ");

    // get sha256 digest for bootloader
    partition.address = ESP_BOOTLOADER_OFFSET;
    partition.size = ESP_PARTITION_TABLE_OFFSET;
    partition.type = ESP_PARTITION_TYPE_APP;
    esp_partition_get_sha256(&partition, sha_256);
    print_sha256(sha_256, "SHA-256 for bootloader: ");

    // get sha256 digest for running partition
    esp_partition_get_sha256(esp_ota_get_running_partition(), sha_256);
    print_sha256(sha_256, "SHA-256 for current firmware: ");

    const esp_partition_t *running = esp_ota_get_running_partition();
    esp_ota_img_states_t ota_state;
    // Esta función comprueba si la partición que está corriendo es una partición OTA
    if (esp_ota_get_state_partition(running, &ota_state) == ESP_OK)
    {
        if (ota_state == ESP_OTA_IMG_PENDING_VERIFY)
        {
            // run diagnostic function ...
            bool diagnostic_is_ok = diagnostic();
            if (diagnostic_is_ok)
            {
                ESP_LOGI(TAG, "Diagnostics completed successfully! Marking valid and reboot ...");
                esp_ota_mark_app_valid_cancel_rollback();
                esp_restart();
            }
            else
            {
                ESP_LOGE(TAG, "Diagnostics failed! Start rollback to the previous version ...");
                esp_ota_mark_app_invalid_rollback_and_reboot();
            }
        }
    }

    // Initialize NVS.
    printf("Initializing nvs\n");
    esp_err_t err = nvs_flash_init();
    printf("nvs initialized\n");
    if (err == ESP_ERR_NVS_NO_FREE_PAGES || err == ESP_ERR_NVS_NEW_VERSION_FOUND)
    {
        // OTA app partition table has a smaller NVS partition size than the non-OTA
        // partition table. This size mismatch may cause NVS initialization to fail.
        // If this happens, we erase NVS partition and initialize NVS again.
        ESP_ERROR_CHECK(nvs_flash_erase());
        err = nvs_flash_init();
    }
    ESP_ERROR_CHECK(err);

    // Se escribe en la nvs el número/identificador del nodo
    // El ID del nodo se escribe en la nvs ya que es independiente de las nuevas imágenes que se carguen
    // en dispositivo.
    printf("Opening nvs...\n");
    ESP_ERROR_CHECK(nvs_open("nodeIdSpace", NVS_READWRITE, &nvsHandle));
    printf("oppened nvs\n");
    char *nodeIdKey = "nodeId";
    nvs_get_u8(nvsHandle, nodeIdKey, &nodeId);
    if (!(nodeId > 0 && nodeId <= 255))
    {
        nvs_set_u8(nvsHandle, nodeIdKey, 9);
        ESP_LOGI(TAG, "nodeId set in nvs\n");
    }
    nvs_get_u8(nvsHandle, nodeIdKey, &nodeId);

    // Se escribe en la nvs el tiempo y el umbral de vibración
    if (nodeId == 9)
    {
        nvs_get_u16(nvsHandle, vibTimeKey, &vibTime);
        ESP_LOGI(TAG, "vibTime: %u\n", vibTime);
        if (!(vibTime > 0 && vibTime <= 65535))
        {
            ESP_ERROR_CHECK(nvs_set_u16(nvsHandle, vibTimeKey, 10));
            ESP_LOGI(TAG, "vibTime set in nvs");
        }
        nvs_get_u16(nvsHandle, vibTimeKey, &vibTime);

        nvs_get_u16(nvsHandle, vibThresKey, &vibThres);
        ESP_LOGI(TAG, "vibThres: %u\n", vibThres);
        if (!(vibThres > 0 && vibThres <= 65535))
        {
            nvs_set_u16(nvsHandle, vibThresKey, 300);
            ESP_LOGI(TAG, "vibThres set in nvs");
        }
        nvs_get_u16(nvsHandle, vibThresKey, &vibThres);
    }
    nvs_close(nvsHandle);
    ESP_LOGI(TAG, "nodeId: %d \n", nodeId);

    ESP_ERROR_CHECK(esp_netif_init());
    ESP_ERROR_CHECK(esp_event_loop_create_default());

    /* This helper function configures Wi-Fi or Ethernet, as selected in menuconfig.
     * Read "Establishing Wi-Fi or Ethernet Connection" section in
     * examples/protocols/README.md for more information about this function.
     */ 
    // Cuando se conecta al wifi se enciende el led para indicarlo
    ESP_ERROR_CHECK(example_connect());
    ESP_LOGI(TAG, "CONNECTED TO WIFI");
    gpio_set_level(GPIO_BUILTIN_LED, 1);

    ESP_ERROR_CHECK(i2cdev_init());
    ESP_LOGI(TAG, "I2C initialized successfully");

#if CONFIG_EXAMPLE_CONNECT_WIFI
    /* Ensure to disable any WiFi power save mode, this allows best throughput
     * and hence timings for overall OTA operation.
     */
    esp_wifi_set_ps(WIFI_PS_NONE);
#endif // CONFIG_EXAMPLE_CONNECT_WIFI

    xTaskCreate(twinGetDataTask, "twinGetDataTask", 4096, NULL, 3, &twinGetDataTaskHandle);

    mqtt_app_start();
}
