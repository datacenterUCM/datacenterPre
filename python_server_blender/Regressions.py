from sklearn import linear_model
from sklearn.preprocessing import PolynomialFeatures
from ConfigParams import ConfigParams
from sklearn.linear_model import Ridge
from scipy.interpolate import griddata
from scipy.interpolate import Rbf
import numpy as np


class Regressions:

    def __init__(self):
        self.configParams = ConfigParams()

    # Uso de un regresor lineal
    def linearRegressor(self, points, values, pointsToPredict):

        # Se entrena el modelo
        reg = linear_model.LinearRegression()
        reg.fit(points, values)

        # Se obtienen las predicciones
        return reg.predict(pointsToPredict)

    # Uso de un interpolador polinómico.
    def polynomicRegressor(self, points, values, pointsToPredict):

        # El regresor polinómico transforma datos en una matriz de características polinómicas.
        # Es necesario transformar los datos de entrenamiento y los datos a predecir en estas características.
        # Con estas características se entrena un modelo lineal.

        poly = PolynomialFeatures(degree=self.configParams.polynomicDegree)
        reg = linear_model.LinearRegression()

        poly.fit(points, values)

        pointsFeatures = poly.fit_transform(points)
        pointsToPredictFeatures = poly.fit_transform(pointsToPredict)

        reg.fit(pointsFeatures, values)

        return reg.predict(pointsToPredictFeatures)

    def gridDataInterpolator(self, points, values, pointsToPredict):

        predictedValues = griddata(
            points, values, pointsToPredict, method='linear')

        return predictedValues

    def RbfInterpolator(self, points, values, pointsToPredict):

        points = np.array(points)
        values = np.array(values)
        pointsToPredict = np.array(pointsToPredict)

        rbfTemp = Rbf(points[:, 0], points[:, 1], points[:, 2], values[:, 0])
        rbfHum = Rbf(points[:, 0], points[:, 1], points[:, 2], values[:, 1])

        tempPredictions = rbfTemp(
            pointsToPredict[:, 0], pointsToPredict[:, 1], pointsToPredict[:, 2])
        humPredictions = rbfHum(
            pointsToPredict[:, 0], pointsToPredict[:, 1], pointsToPredict[:, 2])

        predictions = list(zip(tempPredictions, humPredictions))

        predictionsArray = np.array([list(tupla) for tupla in predictions])

        return predictionsArray
