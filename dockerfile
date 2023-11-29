# Utilizamos la imagen base de Node.js con la versión 16.17.0
FROM node:18.17.0

# Establecemos el directorio de trabajo dentro del contenedor
WORKDIR /app

# Copiamos los archivos de la aplicación a la imagen de Docker
COPY . .

# Instalamos las dependencias de la aplicación
RUN yarn install
#
# Exponemos el puerto en el que se ejecutará la aplicación
EXPOSE 3000

# Ejecutamos el comando para iniciar la aplicación
CMD [ "yarn", "start:dev" ]
