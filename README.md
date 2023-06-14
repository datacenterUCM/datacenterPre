Repositorio del proyecto

El repositorio contiene los siguientes directorios:
	- archivos_ditto: Archivos para eclipse ditto. Se trata principalmente de things que se han ido creando y reglas de conexiones MQTT.
	- blender_python_files: Archivos con escenas de blender (.blend) y ficheros python de scripting para blender (no utilizado en producción)
	- codigo_nodos_ota_rollback: Código referente a los nodos. Contiene un proyecto de ESP-IDF sin la carpeta build.
	- influx_module: Módulo de Influxdb
	- ota_images: Carpeta que contiene el servidor https para las actualizaciones OTA y la imagen a cargar en formato .bin
	- python_server_blender: Módulo de representación de datos - servidor de python.
	- server_alarmas: Módulo de alarmas. Contiene el bot de telegram
	- verge3D_vue_app: Módulo de representación de datos - servidor front-end hecho con verge3D, vue.js y blender.




Para clonar el repositorio de github es necesario usar el siguiente comando:
git clone git@github.com:datacenterUCM/datacenter.git

Para hacer un push a github es necesario hacer lo siguiente:
	"git add ." Para añadir todos los archivos a subir. También se pueden especificar los archivos individualmente.
	"git commit -m "Descripción de la modificación""
	"git push"

Para crear y usar una clave ssh para windows:
	- ssh-keygen -t rsa -b 4096 -C "email_de_github@ejemplo.com"
	- Copiar el contenido de la clave generada abriendolo con un notepad
	- Añadir clave a github
Para crear y usar una clave ssh para github en linux:
	- ssh-keygen -t rsa -b 4096 -C "email_de_github@ejemplo.com"
	- ssh-add ~/.ssh/id_rsa
	- cat ~/.ssh/id_rsa.pub  y copiar el contenido
	- Añadir clave a github

	
Si ditto no funciona al conectarse se debe cambiar el "envirorment"
Name: local_ditto
API URI: http://cripta.fdi.ucm.es:8080
