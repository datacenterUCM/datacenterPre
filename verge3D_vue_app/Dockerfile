# Utiliza una imagen base de Nginx para servir los archivos estáticos
FROM nginx:1.13.12-alpine

# Elimina la configuración predeterminada de Nginx
RUN rm -rf /etc/nginx/conf.d/*

# Copia los archivos de la carpeta "dist" generados por "npm run build" al contenedor
COPY dist /usr/share/nginx/html

# Copia tu propia configuración personalizada de Nginx al contenedor
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Expone el puerto en el que Nginx escucha (generalmente el puerto 80)
EXPOSE 8083

# Inicia Nginx cuando se ejecute el contenedor
CMD ["nginx", "-g", "daemon off;"]

