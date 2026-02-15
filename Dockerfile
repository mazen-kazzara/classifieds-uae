FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

# 👇 THIS IS THE FIX
RUN npx prisma generate

RUN npm run build

EXPOSE 3000

CMD ["npm", "start"]
