Se ha creado una cuenta de google para el centro de datos. 
Dicha cuenta es para tener acceso al github del proyecto.

CUENTA DE GOOGLE:
Correo: datacenterUCM@gmail.com
Contraseña: IoTwins1999

CUENTA DE GITHUB:
Nombre de usuario: datacenterUCM
Contraseña: digitaltwin23

DITTO:
Nombre: datacenter
Contraseña: esp32twin

GRAFANA
Nombre: datacenter
Contraseña: IoTchart1999

RASPI:
IP: 147.96.81.123
Usuario: datacenter
Contraseña: 3x3=nueve

MAQUINA VIRTUAL:
IP: 147.96.85.89
Usuario: timeuser
Contraseña: T3m2D1t1$

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
