from http.server import BaseHTTPRequestHandler
from urllib.parse import urlparse, parse_qs
from ConfigParams import ConfigParams
from DittoRequest import DittoRequest
import json

# Definir el manejador de solicitudes personalizado
class Controller(BaseHTTPRequestHandler):

    def __init__(self):
        self.dittoRequest = DittoRequest()

    def do_GET(self):
        # Endpoint para calcular los puntos de un plano. Recibe como parámetros el
        # valor de Z y la resolución
        if self.path == '/getPlanePoints':
            # Leer el cuerpo de la solicitud
            content_length = int(self.headers['Content-Length'])
            body = self.rfile.read(content_length)

            # Decodificar el cuerpo JSON
            data = json.loads(body)

            zVal = data.get('zVal', '')
            sideYPoints = data.get('sideYPoints', '')
            mode = data.get('mode', '')
            measurement = data.get('measurement', '')
            colorRange = data.get('colorRange', '')

            print(zVal, sideYPoints, mode, measurement, colorRange)

            #self.dittoRequest.getData()



            # Enviar la respuesta al cliente
            self.send_response(200)
            self.send_header('Content-type', 'text/html')
            self.end_headers()
            self.wfile.write(b'GET request received at /getPlanePoints\n')
            self.wfile.write(b'Params: ' + str(data).encode('utf-8'))

        elif self.path == 'get3DPoints':
            pass
        else:
            # Enviar una respuesta de error si la ruta no coincide
            self.send_response(404)
            self.send_header('Content-type', 'text/html')
            self.end_headers()
            self.wfile.write(b'404 Not Found')

    def do_POST(self):
        # Obtener la longitud del cuerpo del mensaje
        content_length = int(self.headers['Content-Length'])

        # Leer el cuerpo del mensaje
        post_data = self.rfile.read(content_length)

        # Enviar la respuesta al cliente
        self.send_response(200)
        self.send_header('Content-type', 'text/html')
        self.end_headers()
        self.wfile.write(b'POST request received\n')
        self.wfile.write(b'Body: ' + post_data)

