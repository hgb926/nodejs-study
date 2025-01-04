# 1. FROM - OS 명시
FROM node:20-slim

# 2. WORKDIR - app폴더로 이동하라는 뜻
WORKDIR /app

# 3. COPY - package.json을 가상컴퓨터에 옮기고 npm install 터미널 입력
# package*.json - package.json, package-lock.json
#   로컬 현재 경로 / 가상 컴퓨터 경로
COPY  package*.json .

# 4. RUN
# num cleaninstall
RUN ["npm", "ci"]

ENV NODE_ENV=production

# 5. 소스코드 카피
COPY . .

# 6. EXPOSE - 가상컴퓨터의 포트번호 명시
EXPOSE 8080

# 코드 실행 전 권한 최소화한 유저 생성 -> 실행
# node는 node:20-slim에서 미리 만들어둔 유저 이름
USER node

# 7. CMD - 도커의 마지막 명령어는 CMD
CMD ["node", "server.js"]

# docker build -t forum0102:v1

