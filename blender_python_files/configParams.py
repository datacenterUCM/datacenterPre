class ConfigParams():

    def __init__(self):
        
        self.dittoUrl = 'http://147.96.81.123:8080/api/2/things/org.eclipse.ditto:datacentertwin'
        #self.dittoUrl = 'http://localhost:8080/api/2/things/org.eclipse.ditto:sergio-room-v2'

        self.dittoUser = 'datacenter'
        #self.dittoUser = 'sergio'
        self.dittoPass = 'esp32twin'
        #self.dittoPass = 'sergiotfm'

        # Longitud de los lados de la sala
        self.sideXLength = 3 * 7.26
        self.sideYLength = 3 * 2.74

        # Número de puntos del lado Y. Los de X se sacan a partir de estos.
        self.sideYPoints = 15

        #Lista de objetos que se importarán del archivo que contiene la escena
        self.objectsToImport = ["SimpleChair", "maquinaDeFrio", "estanteriaPeque1", "estanteriaPeque2", "estanteriaGrande", "suelo", "pared1", "pared2", "pared3"]

        self.blenderObjectsRoute = '/home/sergio/Escritorio/master/TFM/git/datacenter/blender_python_files/objectsDatacenter.blend'
        #self.blenderObjectsRoute = '/home/sergio/Escritorio/master/TFM/blender_files/objectsDatacenter.blend'

        self.defaultZValue = 2.25 # Valor para la Z inicial del mapa de calor

        self.twinXLength = 7.26
        self.twinYLength = 2.74
        self.twinXLength = 4.5

