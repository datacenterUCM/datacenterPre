import http.server
import socketserver
import ssl

# Especifica la ruta del archivo de certificado y la clave privada
certfile = "ca_cert.pem"
keyfile = "ca_key.pem"

# Especifica el puerto en el que se ejecutara el servidor
port = 8070

class ThreadedHTTPServer(socketserver.ThreadingMixIn, http.server.HTTPServer):
    pass

# Crea un servidor HTTP basico
httpd = ThreadedHTTPServer(('10.42.0.1', port), http.server.SimpleHTTPRequestHandler)

# Crea un contexto SSL
context = ssl.SSLContext(ssl.PROTOCOL_TLS_SERVER)
context.load_cert_chain(certfile=certfile, keyfile=keyfile)

# Configura el servidor HTTP para que use SSL
httpd.socket = context.wrap_socket(httpd.socket, server_side=True)

# Ejecuta el servidor
print(f"Servidor HTTPS escuchando en el puerto {port}...")
httpd.serve_forever()
