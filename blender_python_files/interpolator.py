import numpy as np
from scipy.interpolate import griddata
from scipy.interpolate import LinearNDInterpolator

class Interpolator:

    # Las variables de clase se establecen de esta manera porque será necesario crear más de una instancia de 
    # Interpolator y que los valores de estas variables se mantengan
    sidePoints = 30
    sideLength = 3
    xBoundary = (0,3)
    yBoundary = (0,3)
    zBoundary = (0,3)

    def __init__(self):
        self.logTag = "[MODULE interpolator]"

    # Setter para las variables de clase 
    def setClassVariables( self, sidePoints, sideLength, xBoundary, yBoundary, zBoundary ):
        Interpolator.sidePoints = sidePoints
        Interpolator.sideLength = sideLength
        Interpolator.xBoundary = xBoundary
        Interpolator.yBoundary = yBoundary
        Interpolator.zBoundary = zBoundary

    # Setter para los puntos de cada lado (para cambiar la resolución del mapa)
    def setSidePoints( self, sidePoints ):
        Interpolator.sidePoints = sidePoints

    #Función para interpolar un punto. values contiene los valores de temperatura y humedad medidos por cada nodo, 
    #points contiene las localizaciones de los sensores y request contiene el punto a interpolar
    def interpolatePoint(self, points, values, request):

        linInter= LinearNDInterpolator(points, values)

        return linInter(request)


    # Función para interpolar un plano. values contiene los valores de temperatura y humedad medidos por cada nodo,
    # points contiene las localizaciones de los sensores, zVal contiene el valor de la coordenada z para la cual se 
    # calculará el plano, numPoints contiene el número de puntos que se calcularán (expresados como un lado del plano,
    # si numPoints=3, se calcularán 3*3=9 puntos) 
    def interpolatePlane(self, points, values, zVal):

        # Crear dos vectores de coordenadas X e Y
        # np.linspace crea un array de puntos equidistantes dado un inicio, un fin y un número de puntos
        #x = np.linspace(start = self.xBoundary[0], stop = self.xBoundary[0], num = numPoints)
        x = np.linspace(start = 0, stop = Interpolator.sideLength, num = int(Interpolator.sidePoints) )
        y = x

        # Crear el grid 2D con meshgrid y apilar filas con vstack
        grid = np.vstack(np.meshgrid(x, y)).reshape(2, -1).T.tolist()

        #Se agrega la dimensión z al grid
        list ( map( lambda e : e.append( zVal ) ,grid ) ) 

        #Se obtienen las interpolaciones de todos los puntos
        resultValues = self.interpolatePoint( points, values,  grid)

        return resultValues, grid