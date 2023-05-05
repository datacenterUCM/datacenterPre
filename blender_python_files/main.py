import sys
sys.path.append('/home/sergio/Escritorio/master/TFM/python_files')
import bpy
from objectImporter import ObjectImporter
from blenderUI import UIRegister
from blenderScene import BlenderScene
from dittoRequest import DittoRequest

def update():
    tempResults, humResults, planePoints = twin.getData()
    blenderScene.updateScene(tempResults=tempResults, humResults=humResults)
    return 5

# Se determina la longitud del lado de la sala y los puntos por cada lado
sideLength = 3
sidePoints = 20

# Objeto para las peticiones
twin = DittoRequest("http://147.96.81.123:8080/api/2/things/org.eclipse.ditto:datacentertwin",
                    ('datacenter', 'esp32twin'), sideLength, sidePoints)

# Se determina la longitud del lado de cada "cara". Las caras son los pequeños planos cuadrados
# que componen el mapa de calor
faceSideLength = sideLength / (sidePoints - 1)

tempResults, humResults, planePoints = twin.getData()

#################################################
# BLENDER PLOT DATA
#################################################
# Borrar todos los elementos de la escena para reiniciar la representación
blenderScene = BlenderScene()
blenderScene.fullCleanScene()

# Importar objetos desde el .blend de repositorio
objectImporter = ObjectImporter(
    filepath="/home/sergio/Escritorio/master/TFM/blender_files/objects.blend", objectsToImport=["SimpleChair"])

# Crear el mapa de calor
blenderScene.setTransparency( transparency=False )
blenderScene.setDittoRequestInstance(dittoRequestInstance=twin)
blenderScene.setSides(sideLength=sideLength, sidePoints=sidePoints)
blenderScene.createScene(planePoints=planePoints)

# Se crea la interfaz de usuario con el slider y el dropdown
uiRegister = UIRegister(blenderSceneInstance=blenderScene)
uiRegister.register()

# Se actualiza el mapa de calor cada 5 segundos
bpy.app.timers.register(update)
