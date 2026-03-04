# 天气 MCP 服务配置

MCP (Model Context Protocol) 服务，提供天气查询功能，支持 Claude Code、Cursor 等 AI 工具集成。

## 功能特性

- **天气查询**：获取指定城市的实时天气信息
- **城市搜索**：通过城市名称搜索获取位置 ID
- **状态检查**：检查天气 API 是否已配置
- **调用限制**：每天 150 次（与前端天气组件共享配额）

## 环境配置

### 必要配置

在 `.env` 文件中配置：

```bash
# 和风天气 API Key（必需）
# 注册地址：https://dev.qweather.com/
QWEATHER_API_KEY=your-qweather-api-key
QWEATHER_API_HOST=api.qweather.com  # 可选，默认 api.qweather.com
```

### 可选配置

```bash
# MCP 服务认证（可选）
# 设置后，所有 MCP 调用必须携带此 Key
# 如果不设置，则无需认证（仅限内网使用）
MCP_API_KEY=your-mcp-secret-key

# MCP 服务每日调用限制（可选）
# 默认 150 次，与天气组件共享配额
MCP_DAILY_LIMIT=150
```

## 安全配置

### IP 限制（推荐）

MCP 服务默认仅允许内网 IP 访问。配置位于 `docker/nginx-single.conf`：

```nginx
location /api/mcp/ {
    # 允许的内网 IP 范围
    allow 10.0.0.0/8;
    allow 172.16.0.0/12;
    allow 192.168.0.0/16;
    allow 127.0.0.1;
    deny all;

    proxy_pass http://127.0.0.1:3000;
    # ... 其他代理配置
}
```

### API Key 认证（可选）

如果需要从外部网络访问，建议设置 `MCP_API_KEY`：

1. 在 `.env` 中设置 `MCP_API_KEY`
2. 调用时携带认证信息

## 服务部署

### Docker 部署

```bash
# 构建并运行
docker-compose up -d

# 查看日志
docker-compose logs -f app

# 服务地址
# 本地访问：http://my.liveppp.com:13131
# 内网访问：http://<内网IP>:3131
```

### 端口说明

- `3131`: HTTP 服务端口

## Claude Code 配置

### 方式一：HTTP 方式（推荐，支持认证）

在 `~/.claude/settings.json` 中添加：

```json
{
  "mcpServers": {
    "weather": {
      "url": "http://my.liveppp.com:13131/api/mcp/weather"
    }
  }
}
```

**带认证的配置**：

```json
{
  "mcpServers": {
    "weather": {
      "command": "curl",
      "args": [
        "-X", "POST",
        "-H", "Content-Type: application/json",
        "-H", "X-API-Key: your-mcp-secret-key",
        "-d", "{\"method\":\"tools/call\",\"params\":{\"name\":\"get_weather\",\"arguments\":{\"location\":\"${INPUT}\"}}}",
        "http://my.liveppp.com:13131/api/mcp/weather"
      ]
    }
  }
}
```

### 方式二：npx 方式

```json
{
  "mcpServers": {
    "weather": {
      "command": "npx",
      "args": ["-y", "mcp-client-cli", "http://my.liveppp.com:13131/api/mcp/weather"]
    }
  }
}
```

## API 调用

### 直接 HTTP 调用

**基础调用**：

```bash
curl -X POST http://my.liveppp.com:13131/api/mcp/weather \
  -H "Content-Type: application/json" \
  -d '{
    "method": "tools/call",
    "params": {
      "name": "get_weather",
      "arguments": {"location": "北京"}
    }
  }'
```

**带认证调用**：

```bash
# Header 方式
curl -X POST http://my.liveppp.com:13131/api/mcp/weather \
  -H "Content-Type: application/json" \
  -H "X-API-Key: your-mcp-secret-key" \
  -d '{
    "method": "tools/call",
    "params": {
      "name": "get_weather",
      "arguments": {"location": "北京"}
    }
  }'

# URL 参数方式
curl -X POST "http://my.liveppp.com:13131/api/mcp/weather?api_key=your-mcp-secret-key" \
  -H "Content-Type: application/json" \
  -d '{
    "method": "tools/call",
    "params": {
      "name": "get_weather",
      "arguments": {"location": "北京"}
    }
  }'
```

## 可用工具

### 1. get_weather

获取指定城市的实时天气信息。

**参数**：
| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| location | string | 是 | 城市名称或和风天气位置 ID（如"北京"或"101010100"） |

**返回**：
```json
{
  "success": true,
  "temp": "25",
  "text": "晴",
  "icon": "☀️",
  "location": "北京市",
  "feelsLike": "27",
  "humidity": "45",
  "windDir": "北风",
  "windScale": "3"
}
```

### 2. search_city

搜索城市位置，获取位置 ID 用于查询天气。

**参数**：
| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| query | string | 是 | 城市名称关键词（如"北京"、"Shanghai"） |

**返回**：
```json
{
  "success": true,
  "locations": [
    {"name": "北京", "id": "101010100", "country": "CN", "adm": "北京市"},
    {"name": "北京首都国际机场", "id": "101010300", "country": "CN", "adm": "北京市"}
  ]
}
```

### 3. get_weather_status

检查天气 API 是否已配置。

**参数**：无

**返回**：
```json
{
  "configured": true
}
```

## 错误处理

| 状态码 | 说明 |
|--------|------|
| 200 | 请求成功 |
| 400 | 请求格式错误 |
| 401 | API Key 无效或缺失 |
| 429 | 今日调用次数已达上限（150次） |
| 500 | 服务器内部错误 |

## 常见问题

### Q: 如何查看今日已使用次数？

A: 查看 `data/qweather-rate.json` 文件，内容格式：
```json
{"date":"2024-01-01","count":45}
```

### Q: MCP 调用返回 401 错误？

A: 检查是否设置了 `MCP_API_KEY` 环境变量，确保调用时携带正确的 API Key。

### Q: 如何增加每日调用次数？

A: 修改 `MCP_DAILY_LIMIT` 环境变量（或与天气组件共用默认的 150 次）。

### Q: 内网无法访问 MCP 服务？

A: 检查 nginx 配置中的 IP 限制规则，确保客户端 IP 在允许范围内。
