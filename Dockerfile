FROM node:10-alpine
WORKDIR /opt/webapp
COPY src/package*.json ./
ENV NODE_ENV=production
RUN npm install
COPY src/ .
CMD npm run start
