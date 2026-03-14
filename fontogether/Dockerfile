FROM node:20-alpine

WORKDIR /app

# 의존성 설치를 위해 package.json 복사
COPY package.json package-lock.json ./
RUN npm ci

# 소스 코드 복사
COPY . .

# Next.js 빌드
RUN npm run build

EXPOSE 3000

# Next.js 서버 실행
CMD ["npm", "start"]
