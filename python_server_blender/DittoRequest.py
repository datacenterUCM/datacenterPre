import requests
import json
import numpy as np
from Interpolator import Interpolator
import time
from ConfigParams import ConfigParams

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
        auth = requests.auth.HTTPBasicAuth(self.user, self.passwd)

        response = requests.get(self.url, auth=auth)  # Hacer la petición GET

        if response.status_code == 200:  # Si la respuesta es exitosa
            self.data = json.loads(response.text)  # Obtener los datos de la respuesta en formato JSON
            print(self.logTag, "data received")  # Imprimir los datos obtenidos
        else:
            print("Error al hacer la petición GET")  # En caso de error, imprimir mensaje de error


    def getPoints(features):
        return 1


    #Gives format to data to be used by iterator
    def formatData(self):

        values = []
        points = []

        for i in self.data["features"].items():
            
            #Se procesan los puntos. Se obtienen dos listas separadas, una para valores de temp y hum y otra para la localización de los sensores.
            if "Loc" in i[0]:
                points.append( [ i[1]["properties"]['x'], i[1]["properties"]['y'], i[1]["properties"]['z'] ] )
            
            elif "Val" in i[0]:
                values.append( [ i[1]["properties"]["temp"], i[1]["properties"]["rh"] ] )

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
            planeResults, planePoints, faceSideXLength, faceSideYLength = self.interpolator.interpolatePlane(points = points, 
                                                                    measurement = measurement,
                                                                    sideYPoints = sideYPoints,
                                                                    colorRange = colorRange,
                                                                    values = values, 
                                                                    zVal = zVal)

            data = {"planeResults": planeResults.tolist(), 
                    "planePoints": planePoints, 
                    "faceSideXLength": faceSideXLength, 
                    "faceSideYLength": faceSideYLength}

            return data
        
        elif mode == "3DMap":
            planeResults, planePoints, faceSideXLength, faceSideYLength = self.interpolator.interpolate3D( points = points, 
                                                                  measurement = measurement,
                                                                  sideYPoints = sideYPoints,
                                                                  colorRange = colorRange,
                                                                  values = values,
                                                                  searchRange = searchRange )
            
            data = {"planeResults": planeResults.tolist(), 
                    "planePoints": planePoints, 
                    "faceSideXLength": faceSideXLength, 
                    "faceSideYLength": faceSideYLength}

            return data
    

    def updateZ(self, blenderScene):
        updateTimeInit = time.time()
        tempResults, humResults, planePoints = self.getData(  )
        blenderScene.updateScene( tempResults = tempResults )
        print( "[MAIN] updateTime:", time.time() - updateTimeInit )
        return 5