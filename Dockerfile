FROM node:lts-alpine

COPY . .

RUN yarn

RUN yarn build

EXPOSE 8600

ENTRYPOINT ["yarn", "start:prod"]