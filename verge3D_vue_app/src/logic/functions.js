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
        this.map3DTempRange = this.configParams.map3DTempRange
        this.map3DHumRange = this.configParams.map3DHumRange
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
            console.log(result)

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
    //Función que peticiona los datos al back y CREA los resultados
    createScene(zVal, sideYPoints, measurement, colorRange, searchRange){

        if(this.mode == "heatMap"){
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
        else if (this.mode == "3DMap"){
            // Se hace un fetch para obtener los datos
            this.requests.get3DPoints(this.sideYPoints, this.measurement, colorRange, searchRange).then(result => {
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

    }
    //Función para cambiar el modo de mapa de calor plano a mapa 3D y vicebersa
    changeMode(){

        this.deleteScene()

        var colorRange = null
        var searchRange = null
        if(this.measurement == "temp"){
            colorRange = this.tempColorRange
            searchRange = this.map3DTempRange
        }
        else{
            colorRange = this.humColorRange
            searchRange = this.map3DHumRange
        }

        if(this.mode == "3DMap"){
            this.mode = "heatMap"
            this.createScene(this.zValue, this.sideYPoints, this.measurement, colorRange, null)
        }
        else if (this.mode == "heatMap"){
            this.mode = "3DMap"
            this.createScene(null, this.sideYPoints, this.measurement, colorRange, searchRange)
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

    //Función para pintar un plano por pantalla
    createPlane(planeData, index){
        const geometry = new v3d.PlaneGeometry( planeData.width, planeData.height );
        const material = new v3d.MeshBasicMaterial( {color: planeData.color, side: v3d.DoubleSide} );
        const plane = new v3d.Mesh( geometry, material );
        plane.rotateX(3.14/2)

        plane.position.set(planeData.position.x, planeData.position.z, planeData.position.y);
        plane.name = `Plane.${index}`

        this.app.scene.add( plane );
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

    // Función para ACTUALIZAR los valores de color del mapa, ya sea el mapa plano o 3D
    updateValues(){
        if(this.mode == "heatMap"){

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

            var colorRange = null
            var searchRange = null
            if(this.measurement == "temp"){
                colorRange = this.tempColorRange
                searchRange = this.map3DTempRange
            }
            else{
                colorRange = this.humColorRange
                searchRange = this.map3DHumRange
            }

            this.deleteScene()
            this.createScene(null, this.sideYPoints, this.measurement, colorRange, searchRange)

        }
    }

    // Funcion para cambiar la resolución
    changeResolution(){

        var colorRange = null
        var searchRange = null
        if(this.measurement == "temp"){
            colorRange = this.tempColorRange
            searchRange = this.map3DTempRange
        }
        else{
            colorRange = this.humColorRange
            searchRange = this.map3DHumRange
        }

        this.createScene(this.zValue, this.sideYPoints, this.measurement, colorRange, searchRange)

    }

    //Función que peticiona datos al back, CREA los elementos que faltan, BORRA los que no coinciden y ACTUALIZA los que si coinciden
    updateScene(app){
        console.log("sape")
        if(this.mode == "3DMap"){

            var colorRange = null
            var searchRange = null
            if(this.measurement == "temp"){
                colorRange = this.tempColorRange
                searchRange = this.map3DTempRange
            }
            else{
                colorRange = this.humColorRange
                searchRange = this.map3DHumRange
            }
            // Se hace un fetch para obtener los datos
            this.requests.get3DPoints(this.sideYPoints, this.measurement, colorRange, searchRange).then(result => {
                console.log(result)

                var newPositions = []
                // Primero es necesario modificar la posición de los elementos recibidos
                for (var i=0; i < result.planePoints.length; i++){
                    var position = []
                    position.push( result.planePoints[i][0] + result.faceSideXLength / 2 )
                    position.push( - result.planePoints[i][1] - result.faceSideYLength / 2 )
                    position.push( result.planePoints[i][2] )
                    newPositions.push( position )
                }

                var oldPositions = []

                var objectsToRemove = []
                // Se obtienen los elementos de la escena
                this.app.scene.traverse(function (child) {
                    if (child.name.startsWith('Plane')) {
                        
                        
                        /*console.log(`valores recibidos: x:${x}, y${y}, z${z}`)
                        console.log(`valores actuales: x:${child.position.x}, y:${child.position.z}, z:${child.position.y}`)*/

                        var position = [child.position.x, child.position.z, child.position.y]

                        // ACTUALIZAR ELEMENTOS
                        // Si el plano de la escena está en los datos recibidos, se actualiza el color
                        if (newPositions.some(value => value.every((elem, index) => elem === position[index]))) {
                            oldPositions.push(position)
                          }
                        // ELIMINAR ELEMENTOS
                        // Si el plano de la escena no está en los datos recibidos, se elimina
                        else{
                            objectsToRemove.push(child.name)
                        }
                    }
                });
                // Se eliminan los objetos
                for(var i=0; i<objectsToRemove.length; i++){
                    const object = app.scene.getObjectByName(objectsToRemove[i])
                    app.scene.remove(object)
                }
                // CREAR ELEMENTOS
                // Los nuevos elementos que se encuentran en la respuesta del servidor pero no en los elementos viejos se añaden
                for (var i=0; i<result.planePoints.length; i++){
                    var position = newPositions[i]

                    //createScene
                    // Si algún nuevo elemento NO está en los elementos antiguos, se crea
                    if ( !oldPositions.some(value => value.every((elem, index) => elem === position[index])) ) {
                        
                        // Dar formato RGB al color
                        const color = this.convertColorToHex(result.planeResults[i])

                        // Se le da formato al color de cada punto
                        const planeData={
                            width: result.faceSideXLength,
                            height: result.faceSideYLength,
                            color: color,
                            position: {
                                x: position[0],
                                y: position[1],
                                z: position[2]
                            }
                        }
                        this.createPlane(planeData, i)
                    }
                }
            })
        }
        else{
            this.updateZ(this.zValue)
        }
    }
    // Función que borra la escena y la vuelve a crear
    deleteAndCreate(){
        var colorRange = null
        var searchRange = null
        if(this.measurement == "temp"){
            colorRange = this.tempColorRange
            searchRange = this.map3DTempRange
        }
        else{
            colorRange = this.humColorRange
            searchRange = this.map3DHumRange
        }

        this.functions.deleteScene()
        this.functions.createScene(this.zVal, this.sideYPoints, this.measurement, colorRange, searchRange)
    }

    // Función que se encarga de actualizar los datos 
    initTimer(){

        setTimeout(function(){
            setInterval(this.updateScene(this.app), 10000);
        }, 3000)
        
    }
    

}

module.exports = {Functions}
//export { Functions };