import bpy
import matplotlib.pyplot as plt
import matplotlib.cm as cm
import numpy as np
from singleton import Singleton
from configParams import ConfigParams
import math

class BlenderScene(Singleton):
    configParams = ConfigParams()

    # Las siguientes tres variables son variables de clase. Estas variables son COMUNES a todas 
    # las INSTANCIAS de la clase "BlenderInstance".
    # Todas las instancias pueden modificar y leer su valor. Si una instancia modifica su valor
    # este valor cambia en el resto de instancias
    # Listas con los objetos y materiales creados
    materialObjects = []
    planeObjects = []
    dittoRequestInstance = None
    sideXLength = configParams.sideXLength
    sideYLength = configParams.sideYLength
    sideYPoints = configParams.sideYPoints
    sideXPoints = 10
    transparency = False
    alpha = 0.2
    measurement = "temp"
    xLastPoint = ( sideXLength / (int(sideXPoints) + 1) ) * (int(sideXPoints) + 1)
    yLastPoint = ( sideYLength / (int(sideYPoints) + 1) ) * (int(sideYPoints) + 1)

    def __init__(self):
        self.logTag = "[MODULE blenderScene]"

        # Definir una escala de colores que vaya del azul al rojo
        self.cmap = cm.get_cmap('jet')

    # Setter para dittoRequestInstance
    def setDittoRequestInstance(self, dittoRequestInstance):
        # Instancia de la clase dittoRequest que permitirá que el slider del eje z
        # modifique el parámetro de dittoRequestInstance
        BlenderScene.dittoRequestInstance = dittoRequestInstance

    # Setter para las dimensiones y resolución inicial
    def setSides(self, sideXLength, sideYLength, sideYPoints):
        BlenderScene.sideXLength = sideXLength
        BlenderScene.sideYLength = sideYLength
        BlenderScene.sideYPoints = sideYPoints
        BlenderScene.sideXPoints = round( (sideXLength / sideYLength) * sideYPoints )
        BlenderScene.xLastPoint = ( BlenderScene.sideXLength / (int(BlenderScene.sideXPoints) + 1) ) * (int(BlenderScene.sideXPoints) )
        BlenderScene.yLastPoint = ( BlenderScene.sideYLength / (int(BlenderScene.sideYPoints) + 1) ) * (int(BlenderScene.sideYPoints) )

    # Setter para modificar los puntos por lado
    def setSidePoints(self, sideYPoints):
        BlenderScene.sideYPoints = sideYPoints
        BlenderScene.sideXPoints = round( (BlenderScene.sideXLength / BlenderScene.sideYLength) * sideYPoints )
        BlenderScene.xLastPoint = ( BlenderScene.sideXLength / (int(BlenderScene.sideXPoints) + 1) ) * (int(BlenderScene.sideXPoints) )
        BlenderScene.yLastPoint = ( BlenderScene.sideYLength / (int(BlenderScene.sideYPoints) + 1) ) * (int(BlenderScene.sideYPoints) )

    # Función para habilitar/deshabilitar transparencia
    def setTransparency(self, transparency ):
        BlenderScene.transparency = transparency
    
    # Función para modificar el valor de alpha
    def setAlpha(self, alpha):
        BlenderScene.alpha = alpha

    # Función para modificar la medida (temp o hum) que se muestra en el mapa
    def setMeasurement(self, measurement):
        BlenderScene.measurement = measurement

    def createScene(self, planePoints):

        faceSideXLength = BlenderScene.xLastPoint / (BlenderScene.sideXPoints - 1)
        faceSideYLength = BlenderScene.yLastPoint / (BlenderScene.sideYPoints - 1)
        # Obtener la referencia a la escena actual
        scene = bpy.context.scene

        for i, point in enumerate(planePoints):
            # Crear un nuevo objeto plano
            plane = bpy.data.objects.new("Plane", bpy.data.meshes.new("Plane"))
            # Se guardan las referencias de los planos para poder modificarlos luego
            BlenderScene.planeObjects.append( plane )
            # Obtener la malla del plano
            mesh = plane.data

            # Configurar los vértices del plano con las dimensiones deseadas (coordenadas de los vértices)
            verts = [(0, 0, 0), (faceSideXLength, 0, 0), (faceSideXLength, faceSideYLength, 0), (0, faceSideYLength, 0)]
            edges = []
            faces = [(0, 1, 2, 3)]

            # Establecer la malla del plano
            mesh.from_pydata(verts, edges, faces)

            # Actualizar la malla y limpiar la caché de objetos
            mesh.update()

            # Establecer la posición del plano en el mundo
            plane.location = (point[0], point[1], point[2])

            # Crear un nuevo material
            material = bpy.data.materials.new("Material")

            if BlenderScene.transparency == True:
                # Se habilitan los "nodes" que permiten añadir texturas (entre ellas transparencias)
                material.use_nodes = True

                # Se configura el material para aceptar transparencia (tipo de material Christensen-Burley y "blend Mode"="alpha blend")
                material.node_tree.nodes["Principled BSDF"].subsurface_method = 'BURLEY'
                material.blend_method = 'BLEND'

                # Se modifica alpha, que es el parámetro que regula la transparencia 1:opaco, 0: transparente
                material.node_tree.nodes["Principled BSDF"].inputs[21].default_value = BlenderScene.alpha

                # bpy.context.space_data.shading.studio_light = 'basic.sl'

            # Se guardan las referencias de los planos para poder modificarlos luego
            BlenderScene.materialObjects.append( material )
            # Establecer el material en el objeto del plano
            plane.data.materials.append(material) # SE ASOCIA EL MATERIAL CON EL PLANO

            # Agregar el objeto del plano a la escena
            scene.collection.objects.link(plane)

        print("planePoints len:", len(planePoints))
        print("BlenderObjects.planePoints:", len(BlenderScene.planeObjects))
        print("BlenderObjects.materialObjects len:", len(BlenderScene.materialObjects))

    # Función que se ejecuta cuando se cambia la resolución para volver a crear la escena
    def reCreateScene( self ):
        tempResults, humResults, planePoints = BlenderScene.dittoRequestInstance.getData()

        self.createScene( planePoints = planePoints )

        self.updateScene( tempResults=tempResults, humResults=humResults )

    # Función que refresca los valores del mapa con petición a ditto incluida
    def requestAndUpdateScene( self ):
        tempResults, humResults, planePoints = BlenderScene.dittoRequestInstance.getData()
        self.updateScene( tempResults=tempResults, humResults=humResults )

    # Función que se ejecuta para refrescar los valores del mapa
    def updateScene(self, tempResults, humResults):
        # Se eliminan los valores nulos para calcular el maximo y el minimo de temperatura y humedad
        tempSinNan = [x for x in tempResults if not math.isnan(x)]
        humSinNan = [x for x in humResults if not math.isnan(x)]

        # Normalizar los valores de temperatura y humedad para que estén en el rango [0, 1]
        temp_norm = (tempResults - np.min(tempSinNan)) / (np.max(tempSinNan) - np.min(tempSinNan))
        hum_norm = (humResults - np.min(humSinNan)) / (np.max(humSinNan) - np.min(humSinNan))
        print()
        print("max temp:", np.min(tempResults))

        # Mapear los valores normalizados de temperatura y humedad a valores RGB utilizando la escala de colores
        # Dependiendo de qué medida esté seleccionada (temperatura o humedad) se crean los colores para una u otra
        if BlenderScene.measurement == "temp":
            colors = self.cmap(temp_norm)
        else:
            colors = self.cmap(hum_norm)

        print("BlenderObjects.planePoints:", len(BlenderScene.planeObjects))
        print("BlenderObjects.materialObjects len:", len(BlenderScene.materialObjects))
        print("num colores:,", len(colors))
        #print(tempResults)
        print("tempResults len:", len(tempResults))

        #Se modifican los colores de los planos
        if BlenderScene.transparency == True:
            for i, point in enumerate(tempResults):
                BlenderScene.materialObjects[i].node_tree.nodes["Principled BSDF"].inputs[0].default_value = colors[i]
                BlenderScene.materialObjects[i].diffuse_color = colors[i]
        else:
            for i, point in enumerate(tempResults):
                BlenderScene.materialObjects[i].diffuse_color = colors[i]
                #print("color:", colors[i], "difuse color:", BlenderScene.materialObjects[i].diffuse_color)

    def updateZ(self, newZValue):
        # Se actualiza la posición z de la representación gráfica del mapa
        for plane in BlenderScene.planeObjects:
            plane.location = ( plane.location.x, plane.location.y, newZValue )
        # plane.location = (point[0], point[1], point[2])

        # Se actualiza la zValue de dittorRequest para que se interpolen los datos en el nuevo plano
        BlenderScene.dittoRequestInstance.zValue = newZValue

        # Se recopilan los nuevos datos
        tempResults, humResults, planePoints = BlenderScene.dittoRequestInstance.getData()
        self.updateScene( tempResults=tempResults, humResults=humResults )

    # Update alpha function
    def updateAlpha(self):
        for material in BlenderScene.materialObjects:
            material.node_tree.nodes["Principled BSDF"].inputs[21].default_value = BlenderScene.alpha

    # Función para añadir transparencias
    def addTransparency(self):
        for material in BlenderScene.materialObjects:
            # Se habilitan los "nodes" que permiten añadir texturas (entre ellas transparencias)
            material.use_nodes = True

            # Se configura el material para aceptar transparencia (tipo de material Christensen-Burley y "blend Mode"="alpha blend")
            material.node_tree.nodes["Principled BSDF"].subsurface_method = 'BURLEY'
            material.blend_method = 'BLEND'

            # Se modifica alpha, que es el parámetro que regula la transparencia 1:opaco, 0: transparente
            material.node_tree.nodes["Principled BSDF"].inputs[21].default_value = BlenderScene.alpha

            # bpy.context.space_data.shading.studio_light = 'basic.sl'
        
        self.requestAndUpdateScene()

    # Código para borrar la escena (al actualizar la resolución se debe borrar y volver a crear la escena)
    # Sólo borra los elementos del mapa, no los elementos de la sala.
    def deleteScene(self):

        # Se borran los planos y los materiales
        for plane in BlenderScene.planeObjects:
            bpy.data.objects.remove(plane, do_unlink=True)

        for material in BlenderScene.materialObjects:
            #materialObject.delete()
            bpy.data.materials.remove(material, do_unlink=True)

        BlenderScene.planeObjects = []
        BlenderScene.materialObjects = []

    # Borra absolutamente toda la escena
    def fullCleanScene(self):
        # Borra todos los objetos de la escena actual
        bpy.ops.object.select_all(action='SELECT')
        bpy.ops.object.delete()

        # Borra todos los materiales de la escena actual
        for material in bpy.data.materials:
            bpy.data.materials.remove(material)

    # Función que borra los materiales y los vuelve a crear
    def resetMaterials(self):
        for material in BlenderScene.materialObjects:
            bpy.data.materials.remove(material, do_unlink=True)

        for i in range( len( BlenderScene.planeObjects ) ):
            # Crear un nuevo material
            material = bpy.data.materials.new("Material")

            # Se habilitan los "nodes" que permiten añadir texturas (entre ellas transparencias)
            material.use_nodes = True

            # Se configura el material para aceptar transparencia (tipo de material Christensen-Burley y "blend Mode"="alpha blend")
            material.node_tree.nodes["Principled BSDF"].subsurface_method = 'BURLEY'
            material.blend_method = 'BLEND'

            # Se modifica alpha, que es el parámetro que regula la transparencia 1:opaco, 0: transparente
            material.node_tree.nodes["Principled BSDF"].inputs[21].default_value = BlenderScene.alpha

            # bpy.context.space_data.shading.studio_light = 'basic.sl'

            # Se guardan las referencias de los planos para poder modificarlos luego
            BlenderScene.materialObjects.append( material )