from http.server import HTTPServer
from Controller import Controller
from ConfigParams import ConfigParams

configParams = ConfigParams()

# Definir la dirección y el puerto en el que se ejecutará el servidor
server_address = (configParams.IP, configParams.port)

# Crear una instancia del servidor HTTP
httpd = HTTPServer(server_address, Controller)

# Iniciar el servidor
print('Server listening on port', configParams.port)
httpd.serve_forever()
