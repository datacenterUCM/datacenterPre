import numpy as np
from scipy.interpolate import LinearNDInterpolator
from ConfigParams import ConfigParams
from scipy.spatial.distance import cdist
from Regressions import Regressions


class Interpolator:
    configParams = ConfigParams()

    # Las variables de clase se establecen de esta manera porque será necesario crear más de una instancia de
    # Interpolator y que los valores de estas variables se mantengan
    sideXPoints = 10
    sideZPoints = 10
    sideYPoints = configParams.sideYPoints
    sideXLength = configParams.sideXLength
    sideYLength = configParams.sideYLength
    xLastPoint = 10
    yLastPoint = 10
    xBoundary = (0, 3)
    yBoundary = (0, 3)
    zBoundary = (0, 3)
    map3DTempRange = configParams.map3DTempRange
    map3DHumRange = configParams.map3DHumRange
    measurement = configParams.measurement
    mode = configParams.mode
    interpolator = configParams.interpolator

    def __init__(self):
        self.logTag = "[MODULE interpolator]"
        self.regressions = Regressions()

    # Setter para las variables de clase

    def setClassVariables(self, sideYPoints, sideXLength, sideYLength, xBoundary, yBoundary, zBoundary):
        Interpolator.sideXLength = sideXLength
        Interpolator.sideYLength = sideYLength
        Interpolator.xBoundary = xBoundary
        Interpolator.yBoundary = yBoundary
        Interpolator.zBoundary = zBoundary
        Interpolator.sideYPoints = sideYPoints
        # El número de puntos del eje X se saca a partir de los de Y
        Interpolator.sideXPoints = round(
            (sideXLength / sideYLength) * sideYPoints)
        Interpolator.sideZPoints = round(
            (Interpolator.configParams.sideZLength / Interpolator.sideYLength) * sideYPoints)

    # Setter para los puntos de cada lado (para cambiar la resolución del mapa)
    def setSidePoints(self, sideYPoints):
        Interpolator.sideYPoints = sideYPoints
        Interpolator.sideXPoints = round(
            (Interpolator.sideXLength / Interpolator.sideYLength) * sideYPoints)
        Interpolator.sideZPoints = round(
            (Interpolator.configParams.sideZLength / Interpolator.sideYLength) * sideYPoints)
        
    # Setter para modificar la medida (temperatura o humedad)
    def setMeasurement( self, measurement ):
        Interpolator.measurement = measurement

    # Setter para modificar el modo (3D o mapa de calor plano)
    def setMode(self, mode):
        Interpolator.mode = mode

    # Función para interpolar un punto. values contiene los valores de temperatura y humedad medidos por cada nodo,
    # points contiene las localizaciones de los sensores y request contiene el punto a interpolar
    def interpolatePoints(self, points, values, request):

        if Interpolator.interpolator == "LinearNDInterpolator":

            linInter = LinearNDInterpolator(points, values)
            interpolatedPoints = linInter(request)

        elif Interpolator.interpolator == "LinearRegression":

            interpolatedPoints = self.regressions.linearRegressor(
                points=points, values=values, pointsToPredict=request)

        elif Interpolator.interpolator == "PolynomialFeatures":

            interpolatedPoints = self.regressions.polynomicRegressor(
                points=points, values=values, pointsToPredict=request)

        elif Interpolator.interpolator == "griddata":
            interpolatedPoints = self.regressions.gridDataInterpolator(
                points=points, values=values, pointsToPredict=request)
            
        elif Interpolator.interpolator == "Rbf":
            interpolatedPoints = self.regressions.RbfInterpolator(
                points=points, values=values, pointsToPredict=request)

        return interpolatedPoints

    # Función para interpolar un plano. values contiene los valores de temperatura y humedad medidos por cada nodo,
    # points contiene las localizaciones de los sensores, zVal contiene el valor de la coordenada z para la cual se
    # calculará el plano, numPoints contiene el número de puntos que se calcularán (expresados como un lado del plano,
    # si numPoints=3, se calcularán 3*3=9 puntos)
    def interpolatePlane(self, points, values, zVal):

        # Se determinan las posiciones de x e y que contendrán el último punto del grid (para que el mapa de calor no se salga
        # de los límites de las paredes)
        Interpolator.xLastPoint = (Interpolator.sideXLength / (
            int(Interpolator.sideXPoints) + 1)) * (int(Interpolator.sideXPoints))
        Interpolator.yLastPoint = (Interpolator.sideYLength / (
            int(Interpolator.sideYPoints) + 1)) * (int(Interpolator.sideYPoints))

        # Crear dos vectores de coordenadas X e Y
        # np.linspace crea un array de puntos equidistantes dado un inicio, un fin y un número de puntos
        x = np.linspace(start=0, stop=Interpolator.xLastPoint,
                        num=int(Interpolator.sideXPoints))
        y = np.linspace(start=0, stop=Interpolator.yLastPoint,
                        num=int(Interpolator.sideYPoints))

        # Crear el grid 2D con meshgrid y apilar filas con vstack
        grid = np.vstack(np.meshgrid(x, y)).reshape(2, -1).T.tolist()

        # Se agrega la dimensión z al grid
        list(map(lambda e: e.append(zVal), grid))

        # Se obtienen las interpolaciones de todos los puntos
        resultValues = self.interpolatePoints(points, values,  grid)

        return resultValues, grid

    # Esta función interpola todos los puntos del interior de la sala, no sólo de un plano.
    def interpolate3D(self, points, values):

        # Se determinan las posiciones de x, y, z que contendrán el último punto del grid (para que el mapa de calor no se salga
        # de los límites de las paredes)
        Interpolator.zLastPoint = (Interpolator.configParams.sideZLength / (
            int(Interpolator.sideZPoints) + 1)) * (int(Interpolator.sideZPoints))
        Interpolator.xLastPoint = (Interpolator.sideXLength / (
            int(Interpolator.sideXPoints) + 1)) * (int(Interpolator.sideXPoints))
        Interpolator.yLastPoint = (Interpolator.sideYLength / (
            int(Interpolator.sideYPoints) + 1)) * (int(Interpolator.sideYPoints))

        # Crear tres vectores de coordenadas X Y Z
        # np.linspace crea un array de puntos equidistantes dado un inicio, un fin y un número de puntos
        x = np.linspace(start=0, stop=Interpolator.xLastPoint,
                        num=int(Interpolator.sideXPoints))
        y = np.linspace(start=0, stop=Interpolator.yLastPoint,
                        num=int(Interpolator.sideYPoints))
        z = np.linspace(start=0, stop=Interpolator.zLastPoint,
                        num=int(Interpolator.sideZPoints))

        # Crear el grid 3D con meshgrid
        grid3D_x, grid3D_y, grid3D_z = np.meshgrid(x, y, z)
        # Apilar filas en el grid 3D
        grid3D = np.vstack((grid3D_x.ravel(), grid3D_y.ravel(), grid3D_z.ravel())).T

        # Se obtienen las interpolaciones de todos los puntos
        resultValues = self.interpolatePoints(points, values,  grid3D)

        allTempResults = resultValues[:,0] # Lista de temperaturas interpoladas
        allHumResults = resultValues[:,1] # Lista de humedades interpoladas

        tempResults = []
        humResults = []
        points3D = []

        for i in range(len(grid3D)):

            if(Interpolator.map3DTempRange[0] <= allTempResults[i] <= Interpolator.map3DTempRange[1]):
                tempResults.append( allTempResults[i] )
                if( Interpolator.measurement == "temp" ):
                    points3D.append( grid3D[i] )

            if(Interpolator.map3DHumRange[0] <= allHumResults[i] <= Interpolator.map3DHumRange[1]):
                humResults.append( allHumResults[i])
                if( Interpolator.measurement == "hum" ):
                    points3D.append( grid3D[i] )


        return tempResults, humResults, points3D