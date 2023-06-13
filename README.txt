Se ha creado una cuenta de google para el centro de datos. 
Dicha cuenta es para tener acceso al github del proyecto.

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
