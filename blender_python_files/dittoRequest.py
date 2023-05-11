import requests
import json
import numpy as np
from interpolator import Interpolator
from blenderScene import BlenderScene
from blenderUI import UIRegister
import time
from configParams import ConfigParams

class DittoRequest:

    def __init__(self, url, auth, sideXLength, sideYLength, sideYPoints):
        self.logTag = "[MODULE dittoRequest]"

        self.url = url
        self.user = auth[0]
        self.passwd = auth[1]

        # Objeto para las interpolaciones. Las dimensiones de la sala son de 3x3x3
        # Se determina la longitud del lado de la sala y los puntos por cada lado

        self.interpolator = Interpolator()
        self.interpolator.setClassVariables( sideYPoints=sideYPoints, sideXLength=sideXLength, sideYLength=sideYLength, xBoundary=(0,3), yBoundary=(0,3), zBoundary=(0,3) )

        self.configParams = ConfigParams()

        self.zValue =  self.configParams.defaultZValue * 3  # Valor para la Z inicial del mapa de calor

        self.sideXLength = sideXLength
        self.sideYLength = sideYLength


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


    def getData( self ):
        #################################################
        # FETCH DATA FROM DITTO
        #################################################
        self.fetchData()

        #Se obtienen los valores de la temperatura y humedad y las localizaciones de cada nodo de la sala
        values, points = self.formatData()
        print("points antes:", points)
        
        points = list( map( lambda point: [point[0] * 3, point[1] * 3, point[2] * 3], points ) )
            
        print("points después", points)
        
        #################################################
        # INTERPOLATE DATA
        #################################################

        #Se trabaja con arrays de numpy, que son más ligeros y tienen múltiples funciones más eficientes para trabajar con arrays grandes
        values = np.array(values)

        tempValues = values[:, 0] # Lista de temperaturas
        rhValues = values[:, 1] # Lista de humedades relativas

        #Se obtienen las interpolaciones para un plano en z determinado
        planeResults, planePoints = self.interpolator.interpolatePlane(points = points, 
                                                                values = values, 
                                                                zVal = self.zValue)

        tempResults = planeResults[:,0] #Lista de temperaturas interpoladas
        humResults = planeResults[:,1] #Lista de humedades interpoladas

        return tempResults, humResults, planePoints
    

    def updateZ(self, blenderScene):
        updateTimeInit = time.time()
        tempResults, humResults, planePoints = self.getData(  )
        blenderScene.updateScene( tempResults = tempResults )
        print( "[MAIN] updateTime:", time.time() - updateTimeInit )
        return 5