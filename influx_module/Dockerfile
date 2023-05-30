FROM node:14

WORKDIR /app

#ENV IP_BROKER 10.42.0.1
#ENV IP_BROKER 192.168.1.41

COPY package*.json ./
RUN npm install

COPY . .

CMD ["node", "index.js"]
