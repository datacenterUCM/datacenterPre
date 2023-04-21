import bpy

class ObjectImporter:
    def __init__(self, filepath, objectsToImport):
        self.filepath = filepath
        self.objectsToImport = objectsToImport
        self.importedObjects = []

        self.importObjects()

    # Esta función se usa para importar los objetos que componen la escena (no son el mapa de calor)
    # y que representan la sala
    def importObjects(self):
        with bpy.data.libraries.load(self.filepath) as (data_from, data_to):
            data_to.objects = data_from.objects

        for obj in data_to.objects:
            
            for i in self.objectsToImport:
                
                if i in obj.name:
                    imported_obj = obj
                    self.importedObjects.append( obj )
                    # Se agrega el objeto a la escena
                    bpy.context.scene.collection.objects.link(imported_obj)



