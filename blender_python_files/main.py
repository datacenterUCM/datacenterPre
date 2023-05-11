import sys
sys.path.append('/home/sergio/Escritorio/master/TFM/git/datacenter/blender_python_files/')
import bpy
from objectImporter import ObjectImporter
from blenderUI import UIRegister
from blenderScene import BlenderScene
from dittoRequest import DittoRequest
from configParams import ConfigParams

def update():
    tempResults, humResults, planePoints = twin.getData()
    print("tempResults len", len(tempResults))
    blenderScene.updateScene(tempResults=tempResults, humResults=humResults)
    return 5

configParams = ConfigParams()

twin = DittoRequest(configParams.dittoUrl, (configParams.dittoUser, configParams.dittoPass),
                    configParams.sideXLength, configParams.sideYLength, configParams.sideYPoints)

# Se determina la longitud del lado de cada "cara". Las caras son los pequeños planos cuadrados
# que componen el mapa de calor
faceSideLength = configParams.sideYLength / (configParams.sideYPoints - 1)

tempResults, humResults, planePoints = twin.getData()
print("tempResults len", len(tempResults))

#################################################
# BLENDER PLOT DATA
#################################################
# Borrar todos los elementos de la escena para reiniciar la representación
blenderScene = BlenderScene()
blenderScene.fullCleanScene()

# Importar objetos desde el .blend de repositorio
objectImporter = ObjectImporter(
    filepath=configParams.blenderObjectsRoute, objectsToImport=configParams.objectsToImport)

# Crear el mapa de calor
blenderScene.setTransparency( transparency=False )
blenderScene.setDittoRequestInstance(dittoRequestInstance=twin)
blenderScene.setSides(sideXLength=configParams.sideXLength, sideYLength=configParams.sideYLength, sideYPoints=configParams.sideYPoints)
blenderScene.createScene(planePoints=planePoints)

# Se crea la interfaz de usuario con el slider y el dropdown
uiRegister = UIRegister(blenderSceneInstance=blenderScene)
uiRegister.register()

# Se actualiza el mapa de calor cada 5 segundos
bpy.app.timers.register(update)
