from blenderScene import BlenderScene

class Singleton:
    __instance = None
    
    def __new__(cls):
        if cls.__instance is None:
            cls.__instance = super().__new__(cls)
        return cls.__instance

class Prueba( Singleton ):
    # Variable de clase. Esta variable es COMÚN a todas las INSTANCIAS de la clase "Prueba".
    # Todas las instancias pueden modificar y leer su valor. Si una instancia modifica su valor
    # este valor cambia en el resto de instancias
    planeObjects = []
    def __init__(self):
        Prueba.planeObjects = []

    def setPlaneObjects(self, planeObjects):
        Prueba.planeObjects = planeObjects

    def printPlaneObjects(self):
        print( Prueba.planeObjects )

a = Prueba()

a.setPlaneObjects( [1,2,3,4,5] )

print( a.planeObjects )

b = Prueba()

b.printPlaneObjects()



