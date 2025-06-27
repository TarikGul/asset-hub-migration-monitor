FROM node:20-alpine

WORKDIR /app

RUN corepack enable

COPY package.json ./
COPY yarn.lock ./
COPY .yarnrc.yml ./
COPY .yarn ./

RUN yarn --immutable

COPY tsconfig.json ./
COPY src ./src

ENV NODE_ENV=production

CMD sh -c "yarn build && yarn start" 