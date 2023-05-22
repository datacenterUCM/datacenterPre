from http.server import BaseHTTPRequestHandler
from urllib.parse import urlparse, parse_qs
from ConfigParams import ConfigParams
from DittoRequest import DittoRequest
import json

# Definir el manejador de solicitudes personalizado
class Controller(BaseHTTPRequestHandler):

    def __init__(self, request, client_address, server):
        self.dittoRequest = DittoRequest()
        super().__init__(request, client_address, server)

    def do_GET(self):
        # Endpoint para calcular los puntos de un plano. Recibe como parámetros el
        # valor de Z y la resolución
        print("PATH: ", self.path)

        self.pathWhithNoParams = self.path[:self.path.index('?')]

        if self.pathWhithNoParams == '/getPlanePoints':
            # Obtener los parámetros de la URL
            parsed_url = urlparse(self.path)
            query_params = parse_qs(parsed_url.query)

            print(query_params)

            print("Val:", query_params.get('zVal', [''])[0])
            zVal = float(query_params.get('zVal', [''])[0])
            sideYPoints = int(query_params.get('sideYPoints', [''])[0])
            measurement = query_params.get('measurement', [''])[0]
            # Se da formato a "colorRange" debe ser una lista de enteros
            colorRange = query_params.get('colorRange', [''])[0]
            colorRange = colorRange.split(',')
            colorRange = list( map( lambda color : int(color), colorRange ) ) 
            mode = "heatMap"
            print(zVal, sideYPoints, measurement, colorRange)

            data = self.dittoRequest.getData(zVal, sideYPoints, measurement, colorRange, mode)

            response = {"tiskito":"si"}
            # Convertir el diccionario en JSON
            #print("data:", data)
            dataJson = json.dumps(data)
            # Enviar la respuesta al cliente
            self.send_response(200)
            self.send_header('Content-type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')  # Permitir solicitudes desde cualquier origen
            self.send_header('Access-Control-Allow-Methods', 'GET')  # Permitir solo solicitudes GET
            self.end_headers()
            self.wfile.write(dataJson.encode('utf-8'))

        elif self.pathWhithNoParams == 'get3DPoints':
            pass
        else:
            print("self.path:", self.path)
            # Enviar una respuesta de error si la ruta no coincide
            self.send_response(404)
            self.send_header('Content-type', 'text/html')
            self.send_header('Access-Control-Allow-Origin', '*')  # Permitir solicitudes desde cualquier origen
            self.send_header('Access-Control-Allow-Methods', 'GET')  # Permitir solo solicitudes GET
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
        self.send_header('Access-Control-Allow-Origin', '*')  # Permitir solicitudes desde cualquier origen
        self.send_header('Access-Control-Allow-Methods', 'POST')  # Permitir solo solicitudes POST
        self.end_headers()
        self.wfile.write(b'POST request received\n')
        self.wfile.write(b'Body: ' + post_data)

