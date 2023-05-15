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
        layout.operator("wm.range_selection_operator")
        layout.operator("wm.mode_selection_operator")
        layout.operator("wm.interpolator_selection_operator")
        layout.operator("wm.range_color_selection_operator")
        
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
        interpolator = Interpolator()

        # Sólo se actualiza la escena si se ha modificado el dropdown
        if BlenderScene.measurement != self.preset_dropdown:
            # Se actualiza la medida a mostrar por pantalla
            blenderScene.setMeasurement( measurement=self.preset_dropdown )
            interpolator.setMeasurement( measurement=self.preset_dropdown )

            if( Interpolator.mode == "heatMap"):
                # Es necesario volver a crear los materiales
                blenderScene.requestAndUpdateScene()
            elif(Interpolator.mode == "3DMap"):
                # Es necesario recrear la escena
                blenderScene.deleteScene()
                blenderScene.reCreateScene()

        return {'FINISHED'}    
    
# Clase para modificar el modo (mapa 3D o mapa plano)
class ADDONAME_OT_ModeSelection(bpy.types.Operator):
    bl_label = "Select mode"
    bl_idname = "wm.mode_selection_operator"
    
    preset_dropdown : bpy.props.EnumProperty(
        name="Mode",
        description="Select an option",
        items=[
            ('heatMap', "Mapa de calor plano", "Un mapa de calor plano en X,Y con valor Z Variable"),
            ('3DMap', "Mapa de calor 3D", "Un mapa de calor 3D en el cual se puede seleccionar el rango de medidas a mostrar"),            
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
        if Interpolator.mode != self.preset_dropdown:

            Interpolator.mode = self.preset_dropdown
            # Es necesario recrear la escena
            blenderScene.deleteScene()
            blenderScene.reCreateScene()

        return {'FINISHED'}   
    
# Clase para modificar el método con el que se calculan los valores intermedios de temperatura y humedad
class ADDONAME_OT_InterpolatorSelection(bpy.types.Operator):
    bl_label = "Select Interpolator to use"
    bl_idname = "wm.interpolator_selection_operator"
    
    preset_dropdown : bpy.props.EnumProperty(
        name="Interpolator",
        description="Select an option",
        items=[
            ('LinearNDInterpolator', "LinearNDInterpolator", "Interpolador lineal"),
            ('LinearRegression', "LinearRegression", "Regresión lineal"),  
            ('PolynomialFeatures', "PolynomialFeatures", "Regresión lineal polinómica"), 
            ('Rbf', "Rbf", "Interpolador cúbico")
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
        if Interpolator.interpolator != self.preset_dropdown:

            Interpolator.interpolator = self.preset_dropdown
            # Es necesario recrear la escena
            blenderScene.deleteScene()
            blenderScene.reCreateScene()

        return {'FINISHED'}    
    
# Para elegir el rango de medidas del modo del mapa 3D
class ADDONAME_OT_RangeSelection(bpy.types.Operator):
    bl_label = "Select a range for temperature or hummidity"
    bl_idname = "wm.range_selection_operator"
    
    preset_sliderTempFrom : bpy.props.FloatProperty(
        name="Temperature from",
        description="Select a value",
        default=20,
        min=00,
        max=100,
        step=1,
    )

    preset_sliderTempTo : bpy.props.FloatProperty(
        name="Temperature to",
        description="Select a value",
        default=22,
        min=00,
        max=100,
        step=1,
    )

    preset_sliderHumFrom : bpy.props.FloatProperty(
        name="Hummidity from",
        description="Select a value",
        default=30,
        min=00,
        max=100,
        step=1,
    )

    preset_sliderHumTo : bpy.props.FloatProperty(
        name="Hummidity to",
        description="Select a value",
        default=33,
        min=00,
        max=100,
        step=1,
    )
    
    def invoke(self, context, event):
        wm = context.window_manager
        return wm.invoke_props_dialog(self)
    
    def draw(self, context):
        layout = self.layout
        layout.prop(self, "preset_sliderTempFrom")
        layout.prop(self, "preset_sliderTempTo")
        layout.prop(self, "preset_sliderHumFrom")
        layout.prop(self, "preset_sliderHumTo")
        
    def execute(self, context):

        # Sólo se ejecuta el siguiente código si se han modificado las medidas
        if Interpolator.map3DTempRange[0] != self.preset_sliderTempFrom or Interpolator.map3DTempRange[1] != self.preset_sliderTempTo or Interpolator.map3DHumRange[0] != self.preset_sliderHumFrom or Interpolator.map3DHumRange[1] != self.preset_sliderHumTo:

            # Primero se comprueban que los valores introducidos sean razonables: un valor FROM no puede ser mayor que un valor TO
            if self.preset_sliderTempFrom > self.preset_sliderTempTo or self.preset_sliderHumFrom > self.preset_sliderHumTo:
                print("ERROR. UN VALOR FROM NO PUEDE SER MAYOR QUE UN VALOR TO")
            else:
                Interpolator.map3DTempRange = [self.preset_sliderTempFrom, self.preset_sliderTempTo]
                Interpolator.map3DHumRange = [self.preset_sliderHumFrom, self.preset_sliderHumTo]
                if(Interpolator.mode == "3DMap"):
                    # Esta instancia que se crea de blenderScene comparte las variables de clase
                    # con el resto de instancias de "BlenderScene".
                    blenderScene = BlenderScene()
                    # Es necesario recrear la escena
                    blenderScene.deleteScene()
                    blenderScene.reCreateScene()


        return {'FINISHED'}   

# Para elegir los maximos y minimos para los colores del mapa 3D
class ADDONAME_OT_RangeColorSelection(bpy.types.Operator):
    bl_label = "Select a fixed color range"
    bl_idname = "wm.range_color_selection_operator"
    
    preset_sliderTempMin : bpy.props.FloatProperty(
        name="Temperature min",
        description="Select a value",
        default=0,
        min=00,
        max=100,
        step=1,
    )

    preset_sliderTempMax : bpy.props.FloatProperty(
        name="Temperature max",
        description="Select a value",
        default=100,
        min=00,
        max=100,
        step=1,
    )

    preset_sliderHumMin : bpy.props.FloatProperty(
        name="Hummidity min",
        description="Select a value",
        default=0,
        min=00,
        max=100,
        step=1,
    )

    preset_sliderHumMax : bpy.props.FloatProperty(
        name="Hummidity max",
        description="Select a value",
        default=100,
        min=00,
        max=100,
        step=1,
    )
    
    def invoke(self, context, event):
        wm = context.window_manager
        return wm.invoke_props_dialog(self)
    
    def draw(self, context):
        layout = self.layout
        layout.prop(self, "preset_sliderTempMin")
        layout.prop(self, "preset_sliderTempMax")
        layout.prop(self, "preset_sliderHumMin")
        layout.prop(self, "preset_sliderHumMax")
        
    def execute(self, context):

        # Sólo se ejecuta el siguiente código si se han modificado las medidas
        if BlenderScene.tempColorRange[0] != self.preset_sliderTempMin or BlenderScene.tempColorRange[1] != self.preset_sliderTempMax or BlenderScene.humColorRange[0] != self.preset_sliderHumMin or BlenderScene.humColorRange[1] != self.preset_sliderHumMax:

            # Primero se comprueban que los valores introducidos sean razonables: un valor MIN no puede ser mayor que un valor MAX
            if self.preset_sliderTempMin > self.preset_sliderTempMax or self.preset_sliderHumMin > self.preset_sliderHumMax:
                print("ERROR. UN VALOR MINIMO NO PUEDE SER MAYOR QUE UN VALOR MAXIMO")
            else:
                BlenderScene.tempColorRange = [self.preset_sliderTempMin, self.preset_sliderTempMax]
                BlenderScene.humColorRange = [self.preset_sliderHumMin, self.preset_sliderHumMax]
                blenderScene = BlenderScene()
                blenderScene.requestAndUpdateScene()

        return {'FINISHED'}   

classes = [ADDONNAME_PT_OptionPanel, ADDONAME_OT_ResolutionOperator, ADDONAME_OT_ZValueOperator, ADDONAME_OT_TransparencyOperator, ADDONAME_OT_MeasurementSelection, ADDONAME_OT_RangeSelection, ADDONAME_OT_ModeSelection, ADDONAME_OT_InterpolatorSelection, ADDONAME_OT_RangeColorSelection]

