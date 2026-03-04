# 天气 MCP 服务配置

MCP 服务无需登录认证，可直接调用。

## MCP JSON 配置

```json
{
  "mcpServers": {
    "weather": {
      "command": "curl",
      "args": [
        "-X", "POST",
        "-H", "Content-Type: application/json",
        "-d", "{\"method\":\"tools/call\",\"params\":{\"name\":\"get_weather\",\"arguments\":{\"location\":\"${INPUT}\"}}}",
        "http://localhost:3000/api/mcp/weather"
      ]
    }
  }
}
```

## 可用工具

### 1. get_weather
获取指定城市的实时天气信息

**参数：**
- `location`: 城市名称或和风天气位置ID（如"北京"或"101010100"）

**调用示例：**
```bash
curl -X POST http://localhost:3000/api/mcp/weather \
  -H "Content-Type: application/json" \
  -d '{
    "method": "tools/call",
    "params": {
      "name": "get_weather",
      "arguments": {"location": "北京"}
    }
  }'
```

### 2. search_city
搜索城市位置，获取位置ID用于查询天气

**参数：**
- `query`: 城市名称关键词

**调用示例：**
```bash
curl -X POST http://localhost:3000/api/mcp/weather \
  -H "Content-Type: application/json" \
  -d '{
    "method": "tools/call",
    "params": {
      "name": "search_city",
      "arguments": {"query": "上海"}
    }
  }'
```

### 3. get_weather_status
检查天气API是否已配置

**调用示例：**
```bash
curl -X POST http://localhost:3000/api/mcp/weather \
  -H "Content-Type: application/json" \
  -d '{
    "method": "tools/call",
    "params": {
      "name": "get_weather_status",
      "arguments": {}
    }
  }'
```

## Claude Code 配置示例

在 `~/.claude/settings.json` 中添加：

```json
{
  "mcpServers": {
    "weather": {
      "command": "npx",
      "args": ["-y", "mcp-client-cli", "http://localhost:3000/api/mcp/weather"]
    }
  }
}
```

或者使用 HTTP 方式直接调用：

```json
{
  "mcpServers": {
    "weather": {
      "url": "http://localhost:3000/api/mcp/weather"
    }
  }
}
```
