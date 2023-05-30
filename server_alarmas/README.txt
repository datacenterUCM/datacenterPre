El bot envía al grupo de telegram mensajes de alerta cuando algún sensor supera un umbral establecido.
Es posible escribir mensajes al bor (no al grupo) para consultar el estado de los sensores. Para
ello se pueden usar los siguientes comandos:
    - /report -> reporta el estado de todos los nodos conectados al broker
    - /reportX -> reporta el estado un nodo en específico conectado al broker, donde X es el id del nodo
    - /raspitemp -> reporta la temperatura actual de la raspberry