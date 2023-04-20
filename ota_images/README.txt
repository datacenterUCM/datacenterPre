Es necesario modificar la IP del código e igualarla a la IP del punto de acceso        
de la máquina. También es necesario crear el certificado y clave con 
"sudo openssl req -x509 -newkey rsa:2048 -keyout ca_key.pem -out ca_cert.pem -days 365 -nodes"

Para correr el servidor usar "sudo python3 ota_server_https.py"
