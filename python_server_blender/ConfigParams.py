from Secrets import Secrets

class ConfigParams:

    def __init__(self):

        self.secrets = Secrets()

        self.IP = '0.0.0.0' #Dirección de bind para el contenedor de docker
        #self.IP = '192.168.1.41'
        #self.IP = 'localhost'
        self.port = 8085
        
        self.dittoUrl = 'http://147.96.81.123:8080/api/2/things/org.eclipse.ditto:datacentertwin'
        #self.dittoUrl = 'http://localhost:8080/api/2/things/org.eclipse.ditto:datacentertwin'
        #self.dittoUrl = 'http://192.168.1.41:8080/api/2/things/org.eclipse.ditto:sergio-room-v2'
        #self.dittoUrl = 'http://81.34.233.47:8080/api/2/things/org.eclipse.ditto:sergio-room-v2'

        # Longitud de los lados de la sala
        self.sideXLength = 3 * 7.26
        self.sideYLength = 3 * 2.74
        self.sideZLength = 3 * 4.5

        self.dittoUser = self.secrets.dittoUser
        self.dittoPass = self.secrets.dittoPass

        #Medidas del gemelo digital
        self.twinXLength = 7.26
        self.twinYLength = 2.74
        self.twinZLength = 4.5

        # Valor máximo de Z la localización de los nodos. Los puntos por encima de este valor de Z no son a priori calculables
        # por lo que se usa el interpolador de manera distinta. Se puede ver en la función "interpolatePlane"
        self.maxZValue = 6.26

        # Tipo de interpolador a utilizar
        #self.interpolator = "LinearNDInterpolator"
        #self.interpolator = "LinearRegression"
        #self.interpolator = "PolynomialFeatures"
        #self.interpolator = "griddata"
        self.interpolator = "Rbf"

        # Grado del interpolador polinómico
        self.polynomicDegree = 4