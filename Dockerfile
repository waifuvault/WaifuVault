FROM node:lts as base

WORKDIR /home/node/app

COPY package*.json ./

RUN npm i

COPY . .

FROM base as production

ENV NODE_PATH=./dist

RUN npm run build

EXPOSE 8081
ENV PORT 8081
ENV NODE_ENV production

CMD [ "npm", "run" ,"start:prod" ]
