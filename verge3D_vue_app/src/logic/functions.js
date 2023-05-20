//import * as v3d from 'verge3d';
const { Requests } = require('@/logic/Requests');

class Functions{

    constructor(){
        this.requests = Requests()
    }

    biblioteca(){
        console.log("hola")
        // Se puede obtener un elemento sabiendo el nombre de la siguiente manera
        var element = app.scene.getObjectByName('Plane.001')
    }
    updateZ(app, zVal, sideYPoints, measurement, colorRange){

        // Se actualiza la posición y el color de los planos

        this.requests.getPlanePoints(zVal, sideYPoints, measurement, colorRange)

        // Es necesario recorrer el objeto que contiene a todos los objetos de la escena y ver los que empiezan con el nombre "Plane"
        app.scene.traverse(function (child) {
        // Verifica si el nombre del elemento comienza por "Plane"
        if (child.name.startsWith('Plane')) {
            // Se modifica la posición
            var currentPosition = child.position
            child.position.set(currentPosition.x, zVal, currentPosition.z)
        }
        });

    }
    createScene(app, zVal, sideYPoints, measurement, colorRange){

        this.requests.getPlanePoints(zVal, sideYPoints, measurement, colorRange)

    }

}

module.exports = {Functions}
//export { Functions };