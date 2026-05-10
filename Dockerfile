FROM node:20-alpine

WORKDIR /app

# Fonts for the image-watermark pipeline (sharp + librsvg need a system font
# to render Latin glyphs — without these, watermark text renders as boxes).
RUN apk add --no-cache fontconfig ttf-dejavu

COPY package*.json ./
RUN npm install --legacy-peer-deps

COPY . .

# 👇 THIS IS THE FIX
RUN npx prisma generate

RUN npm run build

EXPOSE 3000

CMD ["npm", "start"]
