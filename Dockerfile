FROM node:22-alpine

COPY . .

RUN yarn

RUN yarn build

EXPOSE 3000

ENTRYPOINT ["yarn", "start:prod"]