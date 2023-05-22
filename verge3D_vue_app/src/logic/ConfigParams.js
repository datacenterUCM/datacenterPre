class ConfigParams{

    constructor(){

        // Url del servidor de python
        //this.serverUrl = 'http://192.168.1.44:8085'
        this.serverUrl = 'http://localhost:8085'

        // Paths del servidor
        this.getPlanePointsPath = '/getPlanePoints'
        this.get3DPointsPath = '/get3DPoints'

        // Longitud de los lados de la sala
        this.sideXLength = 3 * 7.26
        this.sideYLength = 3 * 2.74
        this.sideZLength = 3 * 4.5

        // Número de puntos del lado Y. Los de X se sacan a partir de estos.
        this.sideYPoints = 15

        //Lista de objetos que se importarán del archivo que contiene la escena
        this.objectsToImport = ["SimpleChair", "maquinaDeFrio", "estanteriaPeque1", "estanteriaPeque2", "estanteriaGrande", "suelo", "pared1", "pared2", "pared3", "Point"]

        this.blenderObjectsRoute = '/home/sergio/Escritorio/master/TFM/git/datacenter/blender_python_files/objectsDatacenter.blend'
        //this.blenderObjectsRoute = '/home/sergio/Escritorio/master/TFM/blender_files/objectsDatacenter.blend'

        this.defaultZValue = 2.25 * 3 // Valor para la Z inicial del mapa de calor
        this.zValue = 2.25 * 3 // Variable donde se almacena el valor de z actual

        this.twinXLength = 7.26
        this.twinYLength = 2.74
        this.twinZLength = 4.5

        // Valor máximo de Z la localización de los nodos. Los puntos por encima de este valor de Z no son a priori calculables
        // por lo que se usa el interpolador de manera distinta. Se puede ver en la función "interpolatePlane"
        this.maxZValue = 6.26

        // Tipo de interpolador a utilizar
        //this.interpolator = "LinearNDInterpolator"
        //this.interpolator = "LinearRegression"
        //this.interpolator = "PolynomialFeatures"
        //this.interpolator = "griddata"
        this.interpolator = "Rbf"

        // Grado del interpolador polinómico
        this.polynomicDegree = 4

        // Modo inicial. Elegir entre mapa 3D o mapa de calor plano
        this.mode = "heatMap"
        //this.mode = "3DMap"

        // El rango inicial de temperaturas y humedades que se muestra en el mapa de calor 3D
        this.map3DTempRange = [ 33, 34 ]
        this.map3DHumRange = [ 30, 33 ]

        // Measurement inicial el cual se muestra en los mapas de calor
        this.measurement = "temp"
        //this.measurement = "hum"

        // Variable que indica si los colores del mapa de calor se calculan sobre un valor fijo o variable:
        this.fixedColorReference = true
        // Temperaturas máximas y mínimas para la representación de colores del mapa. 
        this.tempColorRange = [23, 33]
        this.humColorRange = [15, 40]

    }

}

module.exports = {ConfigParams} 