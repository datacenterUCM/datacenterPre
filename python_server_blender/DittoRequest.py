import requests
import json
import numpy as np
from Interpolator import Interpolator
import time
from ConfigParams import ConfigParams
import logging

class DittoRequest:

    def __init__(self):
        self.logTag = "[MODULE dittoRequest]"

        self.configParams = ConfigParams()

        self.url = self.configParams.dittoUrl
        self.user = self.configParams.dittoUser
        self.passwd = self.configParams.dittoPass

        # Objeto para las interpolaciones. Las dimensiones de la sala son de 3x3x3
        # Se determina la longitud del lado de la sala y los puntos por cada lado

        self.interpolator = Interpolator()

        self.sideXLength = self.configParams.sideXLength
        self.sideYLength = self.configParams.sideYLength

    def fetchData(self):
        try:
            auth = requests.auth.HTTPBasicAuth(self.user, self.passwd)

            response = requests.get(self.url, auth=auth)  # Hacer la petición GET

            if response.status_code == 200:  # Si la respuesta es exitosa
                self.data = json.loads(response.text)  # Obtener los datos de la respuesta en formato JSON
                #print(self.logTag, "data received")  # Imprimir los datos obtenidos
            else:
                #print("Error al hacer la petición GET")  # En caso de error, imprimir mensaje de error
                logging.error('Error al hacer fetch a ditto. Response: %s\n', str(response))
        
        except Exception as e:
            logging.exception('Error al hacer fetch a ditto. Error: %s\n', str(e))


    def getPoints(features):
        return 1


    #Gives format to data to be used by iterator
    def formatData(self):

        values = []
        points = []

        try:

            for i in self.data["features"].items():
                
                #Se procesan los puntos. Se obtienen dos listas separadas, una para valores de temp y hum y otra para la localización de los sensores.
                if "Loc" in i[0]:
                    points.append( [ i[1]["properties"]['x'], i[1]["properties"]['y'], i[1]["properties"]['z'] ] )
                
                elif "Val" in i[0]:
                    values.append( [ i[1]["properties"]["temp"], i[1]["properties"]["rh"] ] )

        except Exception as e:
            logging.exception('Error dar formato a los datos provenientes de ditto. %s\nvalues: %s\n points: %s\n', str(e), str(values), str(points))

        return values, points


    def getData( self , zVal, sideYPoints, measurement, colorRange, mode, searchRange):
        #################################################
        # FETCH DATA FROM DITTO
        #################################################
        self.fetchData()

        #Se obtienen los valores de la temperatura y humedad y las localizaciones de cada nodo de la sala
        values, points = self.formatData()
        
        #Se multiplican por 3 los valores de las posiciones de los nodos (porque 1m = 3 cuadros)
        points = list( map( lambda point: [point[0] * 3, point[1] * 3, point[2] * 3], points ) )
        
        #################################################
        # INTERPOLATE DATA
        #################################################

        #Se trabaja con arrays de numpy, que son más ligeros y tienen múltiples funciones más eficientes para trabajar con arrays grandes
        values = np.array(values)

        tempValues = values[:, 0] # Lista de temperaturas
        rhValues = values[:, 1] # Lista de humedades relativas

        if mode == "heatMap":
            #Se obtienen las interpolaciones para un plano en z determinado
            try:
                planeResults, planePoints, faceSideXLength, faceSideYLength, infoData, values = self.interpolator.interpolatePlane(points = points, 
                                                                        measurement = measurement,
                                                                        sideYPoints = sideYPoints,
                                                                        colorRange = colorRange,
                                                                        values = values, 
                                                                        zVal = zVal)

                data = {"planeResults": planeResults.tolist(), 
                        "planePoints": planePoints, 
                        "faceSideXLength": faceSideXLength, 
                        "faceSideYLength": faceSideYLength,
                        "infoData": infoData,
                        "values": values.tolist()}
                
            except Exception as e:
                logging.exception('Error al obtener las interpolaciones para el modo heatMap. %s\n', str(e))

            return data
        
        elif mode == "3DMap":

            try:
                planeResults, planePoints, faceSideXLength, faceSideYLength, infoData, values = self.interpolator.interpolate3D( points = points, 
                                                                    measurement = measurement,
                                                                    sideYPoints = sideYPoints,
                                                                    colorRange = colorRange,
                                                                    values = values,
                                                                    searchRange = searchRange )
                
                data = {"planeResults": planeResults.tolist(), 
                        "planePoints": planePoints, 
                        "faceSideXLength": faceSideXLength, 
                        "faceSideYLength": faceSideYLength,
                        "infoData": infoData,
                        "values": values.tolist()}
                
            except Exception as e:
                logging.exception('Error al obtener las interpolaciones para el modo 3DMap. %s\n', str(e))

            return data
    