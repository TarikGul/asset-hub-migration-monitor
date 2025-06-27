FROM node:20-alpine

WORKDIR /app

RUN corepack enable

COPY package.json ./
COPY yarn.lock ./
COPY .yarnrc.yml ./
COPY .yarn ./

RUN yarn --immutable

COPY tsconfig.json ./
COPY drizzle.config.ts ./
COPY src ./src

# Create data directory for database
RUN mkdir -p data

# Build the application
RUN yarn build

# Initialize database schema and data
RUN yarn migrate && yarn push

ENV NODE_ENV=production

CMD ["yarn", "start"] 