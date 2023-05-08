#imagen base de python
FROM python:3.10 

#se especifica el nombre del programa de python y de los archivos a utilizar
COPY ota_https_server.py ca_cert.pem ca_key.pem /

EXPOSE 8070:8070

CMD ["python3", "/ota_https_server.py"]



