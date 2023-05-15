import bpy
from blenderScene import BlenderScene
from interpolator import Interpolator
 

class UIRegister():
    def __init__(self, blenderSceneInstance):
        self.blenderSceneInstance = blenderSceneInstance
        
    def register(self):
        print("registrando")
        for cls in classes:
            bpy.utils.register_class(cls)

#custom_props : bpy.props.PointerProperty(type=CustomProps)
#bpy.types.Scene.custom_props : bpy.props.PointerProperty(type=CustomProps)

class ADDONNAME_PT_OptionPanel(bpy.types.Panel):
    bl_label = "Options Panel"
    bl_idname = "ADDONNAME_PT_OptionsPanel"
    bl_space_type = "VIEW_3D"
    bl_region_type = 'UI'
    bl_category = "Options Tab"
    
    def draw(self, context):
        layout = self.layout
        
        layout.operator("wm.z_value_operator")
        layout.operator("vm.resolution_operator")
        
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
            default=1.5,
            min=0.0,
            max=3.0,
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
        blenderScene.updateZ( self.preset_sliderZ )

        return {'FINISHED'}    
 
class ADDONAME_OT_ResolutionOperator(bpy.types.Operator):
    bl_label = "Modify resolution"
    bl_idname = "vm.resolution_operator"

    preset_sliderResolution : bpy.props.FloatProperty(
            name="Resolution (points per side)",
            description="Select a value",
            default=20,
            min=10,
            max=45,
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

        #Se borra la escena porque se ha modiicado la resolución
        blenderScene.deleteScene()

        # Es necesario modificar los puntos por lado del interpolador.
        interpolator = Interpolator()
        interpolator.setSidePoints( self.preset_sliderResolution )

        # Se vuelve a crear la escena
        blenderScene.reCreateScene( self.preset_sliderResolution )

        return {'FINISHED'}  

classes = [ADDONNAME_PT_OptionPanel, ADDONAME_OT_ResolutionOperator, ADDONAME_OT_ZValueOperator]
 