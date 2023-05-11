import bpy
from blenderScene import BlenderScene
from interpolator import Interpolator
 
# Clase para registrar el panel
class UIRegister():
    def __init__(self, blenderSceneInstance):
        self.blenderSceneInstance = blenderSceneInstance
        
    def register(self):
        print("registrando")
        for cls in classes:
            bpy.utils.register_class(cls)

# Clase principal del panel. Añade todos los elementos "operadores" al panel 
class ADDONNAME_PT_OptionPanel(bpy.types.Panel):
    bl_label = "Options Panel"
    bl_idname = "ADDONNAME_PT_OptionsPanel"
    bl_space_type = "VIEW_3D"
    bl_region_type = 'UI'
    bl_category = "Options Tab"
    
    # En esta función se añaden todos los operadores
    def draw(self, context):
        layout = self.layout
        layout.operator("wm.z_value_operator")
        layout.operator("wm.resolution_operator")
        layout.operator("wm.transparency_operator")
        layout.operator("wm.measurement_selection_operator")
        
# La clase operador contiene todos los elementos del UI
class ADDONAME_OT_ZValueOperator(bpy.types.Operator):
    bl_label = "Modify zValue"
    bl_idname = "wm.z_value_operator"
    
    preset_dropdown : bpy.props.EnumProperty(
        name="My dropdown",
        description="Select an option",
        items=[
            ('temp', "Mostrar temperatura", "Se muestra la temperatura"),
            ('hum', "Mostrar la humedad", "Se muestra la humedad"),            
        ]
    )

    def instantUpdate(scene):
        print(scene.value)
        # Esta instancia que se crea de blenderScene comparte las variables de clase
        # con el resto de instancias de "BlenderScene". 
        """blenderScene = BlenderScene()
        blenderScene.updateZ(  )"""

    preset_sliderZ : bpy.props.FloatProperty(
            name="Z value slider",
            description="Select a value",
            default=2.25,
            min=0.0,
            max=4.5,
            #update=instantUpdate
        )
    
    def invoke(self, context, event):
        wm = context.window_manager
        return wm.invoke_props_dialog(self)
    
    def draw(self, context):
        layout = self.layout
        layout.prop(self, "preset_dropdown")
        layout.prop(self, "preset_sliderZ")
        
    def execute(self, context):

        # Esta instancia que se crea de blenderScene comparte las variables de clase
        # con el resto de instancias de "BlenderScene".
        blenderScene = BlenderScene()
        blenderScene.updateZ( self.preset_sliderZ * 3 )

        return {'FINISHED'}    
 
class ADDONAME_OT_ResolutionOperator(bpy.types.Operator):
    bl_label = "Modify resolution"
    bl_idname = "wm.resolution_operator"

    preset_sliderResolution : bpy.props.FloatProperty(
            name="Resolution (points per Y side)",
            description="Select a value",
            default=15,
            min=10,
            max=35,
            step=100,
            #update=instantUpdate
        )
    
    def invoke(self, context, event):
        wm = context.window_manager
        return wm.invoke_props_dialog(self)
    
    def draw(self, context):
        layout = self.layout
        layout.prop(self, "preset_sliderResolution")

    def execute(self, context):

        # Esta instancia que se crea de blenderScene comparte las variables de clase
        # con el resto de instancias de "BlenderScene".
        blenderScene = BlenderScene()

        # Solo se modifica la resolución si se ha variado el slider
        if BlenderScene.sideYPoints != self.preset_sliderResolution:
            #Se borra la escena porque se ha modiicado la resolución
            blenderScene.deleteScene()

            # Es necesario modificar los puntos por lado del interpolador.
            interpolator = Interpolator()
            interpolator.setSidePoints( self.preset_sliderResolution )

            # Se vuelve a crear la escena
            blenderScene.setSidePoints(sideYPoints=self.preset_sliderResolution)
            blenderScene.reCreateScene()

        return {'FINISHED'}  

class ADDONAME_OT_TransparencyOperator(bpy.types.Operator):
    bl_label = "Customize transparency"
    bl_idname = "wm.transparency_operator"

    preset_transparency : bpy.props.BoolProperty(
            name="Use transparency",
            description="Select a value",
            #default=20,
            #update=instantUpdate
        )
    
    preset_sliderAlpha : bpy.props.FloatProperty(
        name="Alpha",
        description="Select a value",
        default=0.2,
        min=00,
        max=1,
        step=1,
        #update=instantUpdate
    )
    
    def invoke(self, context, event):
        wm = context.window_manager
        return wm.invoke_props_dialog(self)
    
    def draw(self, context):
        layout = self.layout
        layout.prop(self, "preset_transparency")
        layout.prop(self, "preset_sliderAlpha")

    def execute(self, context):

        # Esta instancia que se crea de blenderScene comparte las variables de clase
        # con el resto de instancias de "BlenderScene".
        blenderScene = BlenderScene()

        # Si el valor de alpha no se ha modificado no hacemos nada
        if self.preset_sliderAlpha != BlenderScene.alpha and BlenderScene.transparency == True:
            blenderScene.setAlpha( alpha=self.preset_sliderAlpha )
            blenderScene.updateAlpha()

        # Si la transparencia seleccionada es igual a la transferencia que ya había no se hace nada
        if self.preset_transparency != BlenderScene.transparency:
            blenderScene.setTransparency( transparency=self.preset_transparency)

            # Se aplica la transparencia
            blenderScene.addTransparency()

        return {'FINISHED'}

# La clase operador contiene todos los elementos del UI
class ADDONAME_OT_MeasurementSelection(bpy.types.Operator):
    bl_label = "Select measurement"
    bl_idname = "wm.measurement_selection_operator"
    
    preset_dropdown : bpy.props.EnumProperty(
        name="Measurement",
        description="Select an option",
        items=[
            ('temp', "Mostrar temperatura", "Se muestra la temperatura"),
            ('hum', "Mostrar la humedad", "Se muestra la humedad"),            
        ]
    )
    
    def invoke(self, context, event):
        wm = context.window_manager
        return wm.invoke_props_dialog(self)
    
    def draw(self, context):
        layout = self.layout
        layout.prop(self, "preset_dropdown")
        
    def execute(self, context):

        # Esta instancia que se crea de blenderScene comparte las variables de clase
        # con el resto de instancias de "BlenderScene".
        blenderScene = BlenderScene()

        # Sólo se actualiza la escena si se ha modificado el dropdown
        if BlenderScene.measurement != self.preset_dropdown:
            # Se actualiza la medida a mostrar por pantalla
            blenderScene.setMeasurement( measurement=self.preset_dropdown )
            # Es necesario volver a crear los materiales
            blenderScene.requestAndUpdateScene()

        return {'FINISHED'}    

classes = [ADDONNAME_PT_OptionPanel, ADDONAME_OT_ResolutionOperator, ADDONAME_OT_ZValueOperator, ADDONAME_OT_TransparencyOperator, ADDONAME_OT_MeasurementSelection]

