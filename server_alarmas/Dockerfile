FROM node:14

WORKDIR /app

ENV IP_BROKER 192.168.4.1

COPY package*.json ./
RUN npm install

COPY . .

CMD ["node", "index.js"]
