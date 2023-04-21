import bpy
 
 
 
class ADDONNAME_PT_TemplatePanel(bpy.types.Panel):
    bl_label = "Name of the Panel"
    bl_idname = "ADDONNAME_PT_TemplatePanel"
    bl_space_type = "VIEW_3D"
    bl_region_type = 'UI'
    bl_category = "Template Tab"
    
    def draw(self, context):
        layout = self.layout
        
        layout.operator("wm.template_operator")
        
class ADDONAME_OT_TemplateOperator(bpy.types.Operator):
    bl_label = "Template Operator"
    bl_idname = "wm.template_operator"
    
    preset_dropdown : bpy.props.EnumProperty(
        name="My dropdown",
        description="Select an option",
        items=[
            ('temp', "Mostrar temperatura", "Se muestra la temperatura"),
            ('hum', "Mostrar la humedad", "Se muestra la humedad"),            
        ]
    )
    
    preset_slider : bpy.props.FloatProperty(
            name="My Slider",
            description="Select a value",
            default=0.5,
            min=0.0,
            max=1.0,
            #update=updatee
        )
    
    def invoke(self, context, event):
        wm = context.window_manager
        return wm.invoke_props_dialog(self)
    
    def draw(self, context):
        layout = self.layout
        layout.prop(self, "preset_dropdown")
        layout.prop(self, "preset_slider")
        
    def execute(self, context):
        
        if self.preset_dropdown == 'temp':
            pass
        else:
            pass
        print("execute function")
        print("valor del slider:", self.preset_slider)
        return {'FINISHED'}    
    


class UIRegister():
    def __init__(self, dittoInstance):
        self.dittoInstance = dittoInstance
    
    def update(self, context):
        self.dittoInstance.zValue = context.scene.custom_props.preset_slider
        print("updating...")
        
    def register(self):
        print("registrando")
        for cls in classes:
            print("iteracion")
            bpy.utils.register_class(cls)
        bpy.types.Scene.custom_props = bpy.props.PointerProperty(type=CustomProps)

    def unregister(self):
        for cls in classes:
            bpy.utils.unregister_class(cls)

class CustomProps(bpy.types.PropertyGroup):
    preset_slider: bpy.props.FloatProperty(update=UIRegister.update)

 
classes = [ADDONNAME_PT_TemplatePanel, ADDONAME_OT_TemplateOperator]
 
