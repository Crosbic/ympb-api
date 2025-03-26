FROM node:22-alpine

WORKDIR /app

COPY . .

RUN npm install

RUN npm run build

EXPOSE 8600

ENTRYPOINT ["npm", "run", "start:prod"]