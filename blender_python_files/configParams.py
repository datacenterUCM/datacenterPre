class ConfigParams():

    def __init__(self):
        
        #self.dittoUrl = 'http://147.96.81.123:8080/api/2/things/org.eclipse.ditto:datacentertwin2'
        self.dittoUrl = 'http://localhost:8080/api/2/things/org.eclipse.ditto:sergio-room-v2'

        #self.dittoUser = 'datacenter'
        self.dittoUser = 'sergio'
        #self.dittoPass = 'esp32twin'
        self.dittoPass = 'sergiotfm'

        # Longitud de los lados de la sala
        self.sideXLength = 3 * 7.26
        self.sideYLength = 3 * 2.74
        self.sideZLength = 3 * 4.5

        # Número de puntos del lado Y. Los de X se sacan a partir de estos.
        self.sideYPoints = 15

        #Lista de objetos que se importarán del archivo que contiene la escena
        self.objectsToImport = ["SimpleChair", "maquinaDeFrio", "estanteriaPeque1", "estanteriaPeque2", "estanteriaGrande", "suelo", "pared1", "pared2", "pared3", "Point"]

        self.blenderObjectsRoute = '/home/sergio/Escritorio/master/TFM/git/datacenter/blender_python_files/objectsDatacenter.blend'
        #self.blenderObjectsRoute = '/home/sergio/Escritorio/master/TFM/blender_files/objectsDatacenter.blend'

        self.defaultZValue = 2.25 # Valor para la Z inicial del mapa de calor

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

        # Modo inicial. Elegir entre mapa 3D o mapa de calor plano
        self.mode = "heatMap"
        #self.mode = "3DMap"

        # El rango inicial de temperaturas y humedades que se muestra en el mapa de calor 3D
        self.map3DTempRange = [ 33, 34 ]
        self.map3DHumRange = [ 30, 33 ]

        # Measurement inicial el cual se muestra en los mapas de calor
        self.measurement = "temp"
        #self.measurement = "hum"

        # Variable que indica si los colores del mapa de calor se calculan sobre un valor fijo o variable:
        self.fixedColorReference = True
        # Temperaturas máximas y mínimas para la representación de colores del mapa. 
        self.tempColorRange = [0, 50]
        self.humColorRange = [0, 100]