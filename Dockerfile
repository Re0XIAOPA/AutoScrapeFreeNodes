FROM node:18-alpine

WORKDIR /app

# 先复制依赖清单并安装，利用 Docker 层缓存（node_modules 已被 .dockerignore 排除）
COPY package*.json ./
RUN npm install --production && npm cache clean --force

# 复制源码（node_modules / data / .git 等已被 .dockerignore 排除）
COPY . .

# 确保数据目录存在（运行时由 ./data 卷挂载覆盖）
RUN mkdir -p data

EXPOSE 3000

ENV PORT=3000
ENV NODE_ENV=production
ENV TZ=Asia/Shanghai

# 健康检查：探测首页是否可访问（容器启动后会先跑一次全量抓取，给足 start-period）
HEALTHCHECK --interval=30s --timeout=5s --start-period=40s --retries=3 \
  CMD wget -qO- http://localhost:${PORT:-3000}/ >/dev/null 2>&1 || exit 1

CMD ["npm", "start"]
