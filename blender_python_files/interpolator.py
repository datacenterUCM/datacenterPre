import numpy as np
from scipy.interpolate import griddata
from scipy.interpolate import LinearNDInterpolator
from scipy.interpolate import RectBivariateSpline
from configParams import ConfigParams
from scipy.spatial.distance import cdist

class Interpolator:
    configParams = ConfigParams()

    # Las variables de clase se establecen de esta manera porque será necesario crear más de una instancia de 
    # Interpolator y que los valores de estas variables se mantengan
    sideXPoints = 10
    sideYPoints = configParams.sideYPoints
    sideXLength = configParams.sideXLength
    sideYLength = configParams.sideYLength
    xLastPoint = 10
    yLastPoint = 10
    xBoundary = (0,3)
    yBoundary = (0,3)
    zBoundary = (0,3)

    def __init__(self):
        self.logTag = "[MODULE interpolator]"

    # Setter para las variables de clase 
    def setClassVariables( self, sideYPoints, sideXLength, sideYLength, xBoundary, yBoundary, zBoundary ):
        Interpolator.sideXLength = sideXLength
        Interpolator.sideYLength = sideYLength
        Interpolator.xBoundary = xBoundary
        Interpolator.yBoundary = yBoundary
        Interpolator.zBoundary = zBoundary
        Interpolator.sideYPoints = sideYPoints
        # El número de puntos del eje X se saca a partir de los de Y
        Interpolator.sideXPoints = round( (sideXLength / sideYLength) * sideYPoints )

    # Setter para los puntos de cada lado (para cambiar la resolución del mapa)
    def setSidePoints( self, sideYPoints ):
        Interpolator.sideYPoints = sideYPoints
        Interpolator.sideXPoints = round( (Interpolator.sideXLength / Interpolator.sideYLength) * sideYPoints )

    #Función para interpolar un punto. values contiene los valores de temperatura y humedad medidos por cada nodo, 
    #points contiene las localizaciones de los sensores y request contiene el punto a interpolar
    def interpolatePoints(self, points, values, request):
        print("values:", values)
        print("points:", points)

        linInter= LinearNDInterpolator(points, values)
        interpolatedPoints = linInter(request)
        print("interpolatedPoints:", interpolatedPoints)

        return interpolatedPoints


    #def interpolatePointsAbove(self, points, values, request):
        #interpolador = RectBivariateSpline(,)

    # Función para interpolar un plano. values contiene los valores de temperatura y humedad medidos por cada nodo,
    # points contiene las localizaciones de los sensores, zVal contiene el valor de la coordenada z para la cual se 
    # calculará el plano, numPoints contiene el número de puntos que se calcularán (expresados como un lado del plano,
    # si numPoints=3, se calcularán 3*3=9 puntos) 
    def interpolatePlane(self, points, values, zVal):

        # Se determinan las posiciones de x e y que contendrán el último punto del grid (para que el mapa de calor no se salga 
        # de los límites de las paredes)
        Interpolator.xLastPoint = ( Interpolator.sideXLength / (int(Interpolator.sideXPoints) + 1) ) * (int(Interpolator.sideXPoints))
        Interpolator.yLastPoint = ( Interpolator.sideYLength / (int(Interpolator.sideYPoints) + 1) ) * (int(Interpolator.sideYPoints))

        # Crear dos vectores de coordenadas X e Y
        # np.linspace crea un array de puntos equidistantes dado un inicio, un fin y un número de puntos
        x = np.linspace(start = 0, stop = Interpolator.xLastPoint, num = int(Interpolator.sideXPoints) )
        y = np.linspace(start = 0, stop = Interpolator.yLastPoint, num = int(Interpolator.sideYPoints) )
        

        # Crear el grid 2D con meshgrid y apilar filas con vstack
        grid = np.vstack(np.meshgrid(x, y)).reshape(2, -1).T.tolist()

        #Se agrega la dimensión z al grid
        list ( map( lambda e : e.append( zVal ) ,grid ) ) 

        # Se obtienen las interpolaciones de todos los puntos
        # Si el valor de Z para el que se quieren calcular las temperaturas es mayor que la mayor altura de los nodos
        # no es calculable en un principio, por eso se usa "interpolatePointsAbove" que hace una interpolación distinta
        #if zVal > Interpolator.configParams.maxZValue:
        #    resultValues = self.interpolatePointsAbove(points, values, grid)
        #else:
        resultValues = self.interpolatePoints( points, values,  grid)

        return resultValues, grid