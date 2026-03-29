FROM node:20-slim

WORKDIR /app

COPY package.json yarn.lock ./
RUN yarn install --frozen-lockfile --network-timeout 300000

COPY . .

ARG REACT_APP_BACKEND_URL
ARG REACT_APP_CELEBRATION_IMAGE
ENV REACT_APP_BACKEND_URL=$REACT_APP_BACKEND_URL
ENV REACT_APP_CELEBRATION_IMAGE=$REACT_APP_CELEBRATION_IMAGE
ENV GENERATE_SOURCEMAP=false
ENV NODE_OPTIONS=--max-old-space-size=4096

RUN yarn build

RUN npm install -g serve

EXPOSE 3000

CMD ["serve", "-s", "build", "-l", "3000"]
