FROM node:22-alpine

WORKDIR /frontend

COPY package.json ./
RUN npm install

COPY src ./src
COPY public ./public
COPY index.html ./
COPY vite.config.js ./

CMD ["npm", "start"]
