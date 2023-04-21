import bpy

# Esta clase se usa para registrar el nuevo elemento
class MyPanel(bpy.types.Panel):
    bl_idname = "OBJECT_PT_my_panel"
    bl_label = "My Panel"
    bl_space_type = "VIEW_3D"
    bl_region_type = "UI"
    bl_category = "My Addon"

    def draw(self, context):
        layout = self.layout

        row = layout.row()
        row.operator("myaddon.my_operator", text="My Button")

        row = layout.row()
        row.label(text="My Slider")
        row.prop(context.scene, "my_slider", slider=True)

def register():
    bpy.types.Scene.my_slider = bpy.props.FloatProperty(
        name="My Slider",
        default=0.5,
        min=0.0,
        max=1.0
    )

    # Se registra la nueva clase con los elementos
    bpy.utils.register_class(MyPanel)

def unregister():
    # Se borra la clase con los elementos
    bpy.utils.unregister_class(MyPanel)
    del bpy.types.Scene.my_slider

if __name__ == "__main__":
    register()