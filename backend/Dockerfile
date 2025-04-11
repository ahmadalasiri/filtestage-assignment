FROM node:22-alpine

WORKDIR /backend

COPY package.json ./
RUN npm install

COPY src ./src
COPY index.js ./

VOLUME [ "/backend/uploads" ]

CMD ["npm", "start"]
