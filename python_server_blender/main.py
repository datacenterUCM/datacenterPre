from http.server import HTTPServer
from Controller import Controller
from ConfigParams import ConfigParams
import logging

logging.basicConfig(level=logging.WARNING, filename='server.log', format='%(asctime)s - %(levelname)s - %(message)s')

configParams = ConfigParams()

# Definir la dirección y el puerto en el que se ejecutará el servidor
server_address = (configParams.IP, configParams.port)

# Crear una instancia del servidor HTTP
httpd = HTTPServer(server_address, Controller)
logging.warning('Server listening on port%s\n', str(configParams.port))

# Iniciar el servidor
httpd.serve_forever()
