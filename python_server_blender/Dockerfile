# Usa una imagen base adecuada para Python
FROM python:3.10.6

# Establece el directorio de trabajo dentro del contenedor
WORKDIR /app

# Copia los archivos necesarios al directorio de trabajo del contenedor
COPY requirements.txt .
COPY main.py .
COPY ConfigParams.py .
COPY Controller.py .
COPY DittoRequest.py .
COPY Interpolator.py .
COPY Regressions.py .

# Instala las dependencias del servidor
RUN pip install --no-cache-dir -r requirements.txt

# Expone el puerto en el que se ejecutará el servidor
EXPOSE 8085

# Comando para ejecutar el servidor
CMD ["python", "main.py"]
