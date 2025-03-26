FROM node:22-alpine

COPY . .

RUN yarn

EXPOSE 3000

ENTRYPOINT ["yarn", "start:prod"]