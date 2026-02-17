FROM node:lts as base

WORKDIR /home/node/app

COPY package*.json ./

RUN npm i

COPY . .

FROM base as production

RUN apt-get update && apt-get install -y --no-install-recommends clamdscan && rm -rf /var/lib/apt/lists/*
COPY docker/clamdscan.conf /etc/clamav/clamd.conf

ENV NODE_PATH=./dist

RUN npm run build

EXPOSE 8081
ENV PORT 8081
ENV NODE_ENV production

CMD [ "sh", "-c", "npm run runmigration && npm run start:prod" ]
