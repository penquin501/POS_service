# FROM node:10
# WORKDIR /webapp
# COPY src/ .
# RUN npm install
# CMD npm run start
FROM node:10-alpine
WORKDIR /opt/webapp
COPY src/package*.json ./
ENV NODE_ENV=production
RUN npm install
COPY src/ .
CMD npm run start
