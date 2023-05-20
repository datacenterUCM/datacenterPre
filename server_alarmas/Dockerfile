FROM node:14

WORKDIR /app

ENV IP_BROKER 10.42.0.1

COPY package*.json ./
RUN npm install

COPY . .

CMD ["node", "index.js"]
