const v3d = require('verge3d')
const { Requests } = require('@/logic/Requests');
const { ConfigParams } = require('@/logic/ConfigParams');

class Functions{

    constructor(app){
        this.app = app

        this.requests = new Requests()

        this.example = {}

        this.configParams = new ConfigParams()

        this.mode = this.configParams.mode
        this.zValue = this.configParams.zValue
        this.sideYPoints = this.configParams.sideYPoints
        this.measurement = this.configParams.measurement
        this.tempColorRange = this.configParams.tempColorRange
        this.humColorRange = this.configParams.humColorRange
    }

    biblioteca(){
        // Se puede obtener un elemento sabiendo el nombre de la siguiente manera
        var element = app.scene.getObjectByName('Plane.001')
    }
    updateZ(zVal){
        // Se actualiza la posición y el color de los planos
        var colorRange = null
        if (this.measurement == "temp"){
            colorRange = this.tempColorRange
        }
        else{
            colorRange = this.humColorRange
        }
        this.requests.getPlanePoints(zVal, this.sideYPoints, this.measurement, colorRange).then(result =>{

            var contador = 0

            // Es necesario recorrer el objeto que contiene a todos los objetos de la escena y ver los que empiezan con el nombre "Plane"
            this.app.scene.traverse(function (child) {
                // Verifica si el nombre del elemento comienza por "Plane"
                if (child.name.startsWith('Plane')) {

                    // Se actualiza el color del mapa de calor
                    child.material.color.r = result.planeResults[contador][0]
                    child.material.color.g = result.planeResults[contador][1]
                    child.material.color.b = result.planeResults[contador][2]
                    contador = contador + 1

                    // Se modifica la posición
                    const currentPosition = child.position
                    child.position.set(currentPosition.x, zVal, currentPosition.z)

                }
            });

            console.log("contador:" + contador)
        }).catch(error => {
            console.log(error)
        })

    }
    createScene(zVal, sideYPoints, measurement, colorRange){

        console.log("app:")
        console.log(this.app)

        // Se hace un fetch para obtener los datos
        this.requests.getPlanePoints(zVal, sideYPoints, measurement, colorRange).then(result => {
            console.log(result)
            for (var i=0; i<result.planeResults.length; i++){
            
                // Dar formato RGB al color
                const color = this.convertColorToHex(result.planeResults[i])

                // Se le da formato al color de cada punto
                const planeData={
                    width: result.faceSideXLength,
                    height: result.faceSideYLength,
                    color: color,
                    position: {
                        x: result.planePoints[i][0] + result.faceSideXLength / 2,
                        y: - result.planePoints[i][1] - result.faceSideYLength / 2,
                        z: result.planePoints[i][2]
                    }
                }
                this.createPlane(planeData, i)
            }
            

        }).catch(error => {
            console.log(error)
        })

    }
    //Función para cambiar el modo de mapa de calor plano a mapa 3D y vicebersa
    changeMode(){

        this.deleteScene()
        if(this.mode == "3DMap"){
            this.mode = "heatMap"
            this.createScene(this.configParams.zVal, this.configParams.sideYPoints, this.configParams.measurement, )
        }
        else if (this.mode == "heatMap"){
            this.mode = "3DMap"
        }

    }
    //Función para cambiar la medida de temperatura a humedad y vicebersa
    changeMeasurement(){
        if (this.measurement == "temp"){
            this.measurement = "hum"
        }
        else if (this.measurement == "hum"){
            this.measurement = "temp"
        }
        this.updateValues()
    }

    createPlane(planeData, index){
        const geometry = new v3d.PlaneGeometry( planeData.width, planeData.height );
        const material = new v3d.MeshBasicMaterial( {color: planeData.color, side: v3d.DoubleSide} );
        const plane = new v3d.Mesh( geometry, material );
        plane.rotateX(3.14/2)

        plane.position.set(planeData.position.x, planeData.position.z, planeData.position.y);
        plane.name = `Plane.${index}`

        this.app.scene.add( plane );
    }

    pruebas(planeData) {

        // Crear geometría del plano
        var geometry = new v3d.PlaneBufferGeometry(planeData.width, planeData.height);
    
        // Crear material del plano
        var material = new v3d.MeshBasicMaterial({ color: planeData.color });
    
        // Crear objeto de malla del plano
        var plane = new v3d.Mesh(geometry, material);
    
        // Establecer la posición del plano
        plane.position.copy(planeData.position);

        // Establecer el nombre
        plane.name = "tis"
    
        console.log("app.scene:")
        console.log(this.app.scene)

        // Agregar el plano a la escena
        /*console.log("example:")
        console.log(this.example)
        const currentPosition = this.example.position
        this.example.position.set(currentPosition.x, 30, currentPosition.z)*/
        //this.app.scene.add(plane);

        var planeee = new v3d.Plane()
        this.app.scene.add(planeee)

        console.log("plane:")
        console.log(plane)

        // Devolver el objeto plano creado
        return plane;
    }

    // Función para borrar todos los planos de una escena
    deleteScene(){
        var objectsToRemove = []

        this.app.scene.traverse(function (child) {
            // Verifica si el nombre del elemento comienza por "Plane"
            if (child.name.startsWith('Plane')) {
                objectsToRemove.push(child)
            }
        });

        for( var i=0; i<objectsToRemove.length; i++){
            this.app.scene.remove(objectsToRemove[i])
        }

    }

    // Función para convertir el color en un array a un valor RGB hexadecimal
    convertColorToHex(colorArray) {
        const r = Math.round(colorArray[0] * 255);
        const g = Math.round(colorArray[1] * 255);
        const b = Math.round(colorArray[2] * 255);
      
        const hexValue = (r << 16) | (g << 8) | b;
        const result =  `0x${hexValue.toString(16).padStart(6, '0')}`;
        return parseInt(result, 16);
    }

    // Función para actualizar los valores de color del mapa, ya sea el mapa plano o 3D
    updateValues(){
        if(this.mode == "heatMap"){
            console.log("tis")

            var colorRange = null
            if (this.measurement == "temp"){
                colorRange = this.tempColorRange
            }
            else{
                colorRange = this.humColorRange
            }
            this.requests.getPlanePoints(this.zValue, this.sideYPoints, this.measurement, colorRange).then(result =>{

                var contador = 0
                // Es necesario recorrer el objeto que contiene a todos los objetos de la escena y ver los que empiezan con el nombre "Plane"
                this.app.scene.traverse(function (child) {
                    // Verifica si el nombre del elemento comienza por "Plane"
                    if (child.name.startsWith('Plane')) {
                        // Se actualiza el color del mapa de calor
                        child.material.color.r = result.planeResults[contador][0]
                        child.material.color.g = result.planeResults[contador][1]
                        child.material.color.b = result.planeResults[contador][2]
                        contador = contador + 1    
                    }
                });
    
                console.log("contador:" + contador)
            }).catch(error => {
                console.log(error)
            })
        }
        else if (this.mode == "3DMap"){



        }
    }

    // Función que se encarga de actualizar los datos 
    initTimer(){
        setInterval(function() {
            // Código a ejecutar cada 5 segundos
            console.log('Se ha ejecutado el temporizador cada 5 segundos');
          }, 5000);
    }
    

}

module.exports = {Functions}
//export { Functions };