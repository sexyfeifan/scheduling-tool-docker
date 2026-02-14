# 罐头场通告排期 - Docker部署指南

## 简介

这是一个简化的单用户共享版本，所有用户看到相同的数据，并且支持实时同步。本指南将帮助您在NAS或其他支持Docker的设备上部署此应用。

## 系统要求

- Docker Engine 18.06.0+
- Docker Compose 1.22.0+
- 至少2GB可用磁盘空间
- 1GB RAM

## 部署方式

### 方式一：使用预构建镜像（推荐）

1. **创建项目目录**
   ```bash
   mkdir scheduling-tool
   cd scheduling-tool
   ```

2. **创建docker-compose.yml文件**
   ```yaml
   version: '3.8'
   
   services:
     scheduling-tool:
       image: node:18-alpine
       container_name: scheduling-tool
       ports:
         - "3000:3000"
       volumes:
         - ./server:/app
         - ./client:/client
         - scheduling-data:/app/data
       working_dir: /app
       command: >
         sh -c "
           apk add --no-cache bash &&
           npm install --only=production &&
           node server.js
         "
       restart: unless-stopped
   
   volumes:
     scheduling-data:
   ```

3. **下载应用代码**
   - 从GitHub或提供的压缩包中提取server和client目录
   - 将它们放在scheduling-tool目录中

4. **启动服务**
   ```bash
   docker-compose up -d
   ```

### 方式二：自己构建Docker镜像

1. **准备文件结构**
   ```
   scheduling-tool/
   ├── Dockerfile
   ├── docker-compose.yml
   ├── .dockerignore
   ├── server/
   │   ├── server.js
   │   ├── package.json
   │   └── package-lock.json
   └── client/
       ├── index.html
       ├── css/
       └── js/
   ```

2. **创建Dockerfile**
   ```dockerfile
   FROM node:18-alpine
   
   # 安装bash
   RUN apk add --no-cache bash
   
   # 设置工作目录
   WORKDIR /app
   
   # 复制package.json和package-lock.json（如果存在）
   COPY server/package*.json ./
   
   # 安装依赖
   RUN npm ci --only=production
   
   # 复制应用代码
   COPY server/ ./
   
   # 复制前端静态文件
   COPY client/ /client/
   
   # 创建数据目录
   RUN mkdir -p data
   
   # 暴露端口
   EXPOSE 3000
   
   # 启动应用
   CMD ["node", "server.js"]
   ```

3. **创建docker-compose.yml**
   ```yaml
   version: '3.8'
   
   services:
     scheduling-tool:
       build: .
       ports:
         - "3000:3000"
       volumes:
         - scheduling-data:/app/data
       restart: unless-stopped
   
   volumes:
     scheduling-data:
   ```

4. **构建并启动**
   ```bash
   docker-compose up -d --build
   ```

## NAS设备特定部署指南

### Synology NAS

1. **通过Docker GUI部署**
   - 打开 DSM > Docker
   - 点击"注册表"，搜索并下载`node:18-alpine`
   - 进入"映像"，启动容器向导
   - 设置容器名称：`scheduling-tool`
   - 设置端口映射：本地端口3000 → 容器端口3000
   - 设置卷映射：
     - 添加文件夹：选择项目文件夹 → 挂载路径`/app`
     - 添加卷：`scheduling-data` → 挂载路径`/app/data`
   - 设置环境变量（可选）：
     - `PORT=3000`
   - 完成设置并启动容器

2. **通过命令行部署**
   ```bash
   # SSH登录到Synology NAS
   ssh admin@your-nas-ip
   
   # 创建项目目录
   mkdir -p /volume1/docker/scheduling-tool/{server,client}
   
   # 将项目文件上传到对应目录
   # 然后执行以下命令：
   docker run -d \
     --name scheduling-tool \
     -p 3000:3000 \
     -v /volume1/docker/scheduling-tool/server:/app \
     -v /volume1/docker/scheduling-tool/client:/client \
     -v scheduling-data:/app/data \
     --restart unless-stopped \
     node:18-alpine \
     sh -c "cd /app && npm install --only=production && node server.js"
   ```

### QNAP NAS

1. **通过Container Station部署**
   - 打开 Container Station
   - 点击"创建" > "从映像创建"
   - 搜索并选择`node:18-alpine`
   - 设置容器名称：`scheduling-tool`
   - 设置网络：桥接模式，端口转发 3000:3000
   - 设置共享文件夹映射
   - 设置数据卷
   - 完成创建并向容器中添加启动命令

2. **通过命令行部署**
   ```bash
   # SSH登录到QNAP NAS
   ssh admin@your-nas-ip
   
   # 创建项目目录
   mkdir -p /share/Container/scheduling-tool/{server,client}
   
   # 上传项目文件后执行：
   docker run -d \
     --name scheduling-tool \
     -p 3000:3000 \
     -v /share/Container/scheduling-tool/server:/app \
     -v /share/Container/scheduling-tool/client:/client \
     -v scheduling-data:/app/data \
     --restart unless-stopped \
     node:18-alpine \
     sh -c "cd /app && npm install --only=production && node server.js"
   ```

## 数据管理

### 数据备份

```bash
# 备份到本地文件
docker run --rm \
  -v scheduling-data:/data \
  -v $(pwd):/backup \
  alpine tar czf /backup/scheduling-data-backup.tar.gz -C /data .
```

### 数据恢复

```bash
# 从备份文件恢复
docker run --rm \
  -v scheduling-data:/data \
  -v $(pwd):/backup \
  alpine tar xzf /backup/scheduling-data-backup.tar.gz -C /data
```

### 手动数据访问

数据存储在Docker卷`scheduling-data`中，可以通过以下方式访问：

```bash
# 创建一个临时容器来访问数据
docker run -it --rm -v scheduling-data:/data alpine sh
```

## 日常维护

### 查看日志

```bash
docker-compose logs -f
```

或

```bash
docker logs -f scheduling-tool
```

### 重启服务

```bash
docker-compose restart
```

或

```bash
docker restart scheduling-tool
```

### 停止服务

```bash
docker-compose down
```

或

```bash
docker stop scheduling-tool
```

### 删除服务和数据

```bash
# 停止并删除容器
docker-compose down -v

# 或者分别执行
docker stop scheduling-tool
docker rm scheduling-tool
docker volume rm scheduling-data
```

## 故障排除

### 常见问题

1. **端口冲突**
   - 错误信息：`port is already allocated`
   - 解决方案：更改端口映射，例如`3001:3000`

2. **权限问题**
   - 错误信息：`permission denied`
   - 解决方案：确保Docker有访问项目目录的权限

3. **数据卷问题**
   - 错误信息：`no such file or directory`
   - 解决方案：检查文件路径是否正确

### 日志分析

```bash
# 查看最近的日志
docker-compose logs --tail 50

# 查看特定服务的日志
docker logs scheduling-tool --tail 50

# 实时跟踪日志
docker-compose logs -f
```

## 性能优化

### 资源限制

在docker-compose.yml中添加资源限制：

```yaml
services:
  scheduling-tool:
    # ... 其他配置
    deploy:
      resources:
        limits:
          memory: 512M
          cpus: '0.5'
```

### 自动重启策略

```yaml
services:
  scheduling-tool:
    # ... 其他配置
    restart: unless-stopped  # 默认已设置
```

## 安全建议

1. **定期更新**
   - 定期重建镜像以获取最新的安全补丁
   ```bash
   docker-compose build --no-cache
   docker-compose up -d
   ```

2. **网络安全**
   - 考虑使用反向代理（如nginx）添加SSL支持
   - 限制对3000端口的访问

3. **数据保护**
   - 定期备份数据卷
   - 使用强密码保护NAS访问

## 访问应用

部署完成后，在浏览器中访问：
- `http://your-server-ip:3000` （从网络中任何地方访问）
- `http://localhost:3000` （如果在同一设备上访问）

## 技术支持

如遇到问题，请检查：
1. Docker服务是否正在运行
2. 端口是否被其他应用占用
3. 文件权限是否正确
4. 磁盘空间是否充足

对于更复杂的问题，请提供：
- 错误日志
- 系统环境信息
- 部署步骤