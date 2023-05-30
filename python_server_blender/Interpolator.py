import numpy as np
from scipy.interpolate import LinearNDInterpolator
from ConfigParams import ConfigParams
from scipy.spatial.distance import cdist
from Regressions import Regressions
import matplotlib.cm as cm


class Interpolator:
    configParams = ConfigParams()

    # Las variables de clase se establecen de esta manera porque será necesario crear más de una instancia de
    # Interpolator y que los valores de estas variables se mantengan
    sideXPoints = 10
    sideZPoints = 10
    sideXLength = configParams.sideXLength
    sideYLength = configParams.sideYLength
    xLastPoint = 10
    yLastPoint = 10
    xBoundary = (0, 3)
    yBoundary = (0, 3)
    zBoundary = (0, 3)
    interpolator = configParams.interpolator

    def __init__(self):
        self.logTag = "[MODULE interpolator]"
        self.regressions = Regressions()
        self.cmap = cm.get_cmap('jet')
        self.configParams = ConfigParams()

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
    def interpolatePlane(self, points, measurement, sideYPoints, values, zVal, colorRange):
        # Se calculan el número de puntos que tiene cada eje en función de los puntos del eje Y:
        sideXPoints, sideZPoints = self.getSidePoints(sideYPoints)

        # Se determinan las posiciones de x e y que contendrán el último punto del grid (para que el mapa de calor no se salga
        # de los límites de las paredes)
        xLastPoint, yLastPoint, zLastPoint = self.getLastPoints(sideXPoints, sideYPoints, sideZPoints)

        # Crear dos vectores de coordenadas X e Y
        # np.linspace crea un array de puntos equidistantes dado un inicio, un fin y un número de puntos
        x = np.linspace(start=0, stop=xLastPoint, num=sideXPoints)
        y = np.linspace(start=0, stop=yLastPoint, num=sideYPoints)

        # Crear el grid 2D con meshgrid y apilar filas con vstack
        grid = np.vstack(np.meshgrid(x, y)).reshape(2, -1).T.tolist()

        # Se agrega la dimensión z al grid
        grid = [point + [zVal] for point in grid]

        # Se obtienen las interpolaciones de todos los puntos
        resultValues = self.interpolatePoints(points, values, grid)

        if measurement == "temp":
            resultValues = resultValues[:, 0]  # Lista de temperaturas interpoladas
        elif measurement == "hum":
            resultValues = resultValues[:, 1]  # Lista de humedades interpoladas

        # Se obtiene la escala de color de cada punto:
        normValues = self.normalizeValues(resultValues, colorRange)
        colors = self.cmap(normValues)

        # Se obtienen los valores maximos y minimos de temperatura y humedad
        minVal = np.min(resultValues) if len(resultValues) > 0 else 0
        maxVal = np.max(resultValues) if len(resultValues) > 0 else 0

        infoData = {
            'max': maxVal,
            'min': minVal,
            'maxColor': self.cmap(self.normalizeValues([maxVal], colorRange))[0].tolist(),
            'minColor': self.cmap(self.normalizeValues([minVal], colorRange))[0].tolist()
        }

        faceSideXLength = xLastPoint / (sideXPoints - 1)
        faceSideYLength = yLastPoint / (sideYPoints - 1)

        return colors, grid, faceSideXLength, faceSideYLength, infoData, resultValues


    # Esta función interpola todos los puntos del interior de la sala, no sólo de un plano.
    def interpolate3D(self, points, measurement, sideYPoints, colorRange, values, searchRange):
        # Se calculan el número de puntos que tiene cada eje en función de los puntos del eje Y:
        sideXPoints, sideZPoints = self.getSidePoints(sideYPoints)

        # Se determinan las posiciones de x, y, z que contendrán el último punto del grid (para que el mapa de calor no se salga
        # de los límites de las paredes)
        xLastPoint, yLastPoint, zLastPoint = self.getLastPoints(sideXPoints, sideYPoints, sideZPoints)

        # Crear los vectores de coordenadas X, Y, Z utilizando np.linspace para generar puntos equidistantes
        x = np.linspace(start=0, stop=xLastPoint, num=sideXPoints)
        y = np.linspace(start=0, stop=yLastPoint, num=sideYPoints)
        z = np.linspace(start=0, stop=zLastPoint, num=sideZPoints)

        # Crear el grid 3D utilizando np.mgrid para generar una rejilla de puntos en los tres ejes
        grid3D_x, grid3D_y, grid3D_z = np.mgrid[0:xLastPoint:complex(0, sideXPoints),
                                                0:yLastPoint:complex(0, sideYPoints),
                                                0:zLastPoint:complex(0, sideZPoints)]

        # Apilar filas en el grid 3D para obtener una matriz de puntos en el espacio 3D
        grid3D = np.vstack((grid3D_x.ravel(), grid3D_y.ravel(), grid3D_z.ravel())).T

        # Se obtienen las interpolaciones de todos los puntos
        resultValues = self.interpolatePoints(points, values, grid3D)

        # Obtener los resultados de temperatura y humedad interpolados
        allTempResults = resultValues[:, 0]
        allHumResults = resultValues[:, 1]

        # Filtrar los resultados dentro del rango de búsqueda dependiendo de la medida
        if measurement == "temp":
            valid_indices = np.where((searchRange[0] <= allTempResults) & (allTempResults <= searchRange[1]))
            results = allTempResults[valid_indices]
            points3D = grid3D[valid_indices].tolist()
        elif measurement == "hum":
            valid_indices = np.where((searchRange[0] <= allHumResults) & (allHumResults <= searchRange[1]))
            results = allHumResults[valid_indices]
            points3D = grid3D[valid_indices].tolist()

        # Obtener la escala de color de cada punto
        normValues = self.normalizeValues(results, colorRange)
        colors = self.cmap(normValues)

        # Obtener los valores máximos y mínimos de temperatura y humedad
        minVal = np.min(results) if len(results) > 0 else 0
        maxVal = np.max(results) if len(results) > 0 else 0

        # Crear el diccionario de información
        infoData = {
            'max': maxVal,
            'min': minVal,
            'maxColor': self.cmap(self.normalizeValues([maxVal], colorRange))[0].tolist(),
            'minColor': self.cmap(self.normalizeValues([minVal], colorRange))[0].tolist()
        }

        # Calcular las longitudes de los lados de la sala
        faceSideXLength = xLastPoint / (sideXPoints - 1)
        faceSideYLength = yLastPoint / (sideYPoints - 1)

        return colors, points3D, faceSideXLength, faceSideYLength, infoData, results

    def normalizeValues(self, results, colorRange):

        # La siguiente normalización se hace en función de unos máximos y mínimos fijos:
        normValues = np.divide( ( np.subtract(results,colorRange[0] )) , (colorRange[1] - colorRange[0]) )

        return normValues


    def getSidePoints(self, sideYPoints):
        sideXPoints = round(
            (self.configParams.sideXLength / self.configParams.sideYLength) * sideYPoints)
        sideZPoints = round(
            (self.configParams.sideZLength / self.configParams.sideYLength) * sideYPoints)

        return sideXPoints, sideZPoints


    def getLastPoints(self, sideXPoints, sideYPoints, sideZPoints):
        xLastPoint = (self.configParams.sideXLength / (sideXPoints + 1)) * sideXPoints
        yLastPoint = (self.configParams.sideYLength / (sideYPoints + 1)) * sideYPoints
        zLastPoint = (self.configParams.sideZLength / (sideZPoints +1)) * sideZPoints

        return xLastPoint, yLastPoint, zLastPoint
