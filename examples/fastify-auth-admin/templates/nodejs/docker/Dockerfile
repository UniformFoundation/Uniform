ARG BASE_IMAGE

FROM $BASE_IMAGE as installer

ARG APP_NAME
ARG PORT
ARG COPY_FROM
ARG USER_ID
ARG GROUP_ID

RUN apk add npm git openjdk8-jre-base bash htop vim mc


RUN addgroup -g $GROUP_ID developer
RUN adduser -u $USER_ID -S -D -H -G developer developer

# Set working directory
WORKDIR /app
COPY . .

# # RUN YARN_CACHE_FOLDER=/root/.yarn yarn --frozen-lockfile
RUN npm i
RUN npm run build

FROM node:16.3.0-alpine AS runner
ARG APP_NAME
ARG PORT

WORKDIR /app

RUN apk add npm
RUN npm install -g chokidar-cli
 
COPY --from=installer /app/node_modules ./node_modules
COPY --from=installer /app/dist ./dist
COPY --from=installer /app/package.json ./package.json

EXPOSE $PORT