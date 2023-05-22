from http.server import HTTPServer
from Controller import Controller
from ConfigParams import ConfigParams

configParams = ConfigParams()

# Definir la dirección y el puerto en el que se ejecutará el servidor
server_address = (configParams.IP, configParams.port)

# Crear una instancia del servidor HTTP
httpd = HTTPServer(server_address, Controller)
print('Server listening on port', configParams.port)

# Iniciar el servidor
httpd.serve_forever()
