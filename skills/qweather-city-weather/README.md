# qweather-city-weather

一个可移植的 QWeather 查询 Skill。  
在任意机器上，只要有 Python 3 和和风天气凭据（`QWEATHER_API_HOST`、`QWEATHER_API_KEY`），即可查询城市编码和实时天气。

## 功能

- 根据城市关键词查询候选城市与 `location id`
- 根据 `location id` 查询实时天气
- 一步完成“城市查询 -> 实时天气查询”
- 命令行 JSON 输出，适合 AI agent 调用和自动化脚本集成

## 目录结构

```text
qweather-city-weather/
├── SKILL.md
├── README.md
├── agents/
│   └── openai.yaml
├── scripts/
│   └── qweather_query.py
└── references/
    └── qweather-http-contract.md
```

## 依赖要求

- Python 3.10+
- 必需环境变量：
  - `QWEATHER_API_HOST`
  - `QWEATHER_API_KEY`

> 不要在仓库中提交 `.env` 或任何真实密钥。

## 快速开始

### 1) 配置环境变量

```bash
export QWEATHER_API_HOST="<your_qweather_host>"
export QWEATHER_API_KEY="<your_qweather_key>"
```

### 2) 查询城市编码

```bash
python3 scripts/qweather_query.py search-city --query "北京"
```

### 3) 查询实时天气

```bash
python3 scripts/qweather_query.py get-weather --location "101010100"
```

### 4) 一步查询城市 + 天气

```bash
python3 scripts/qweather_query.py city-weather --query "北京"
```

## 命令说明

### `search-city`

- 必填：`--query`
- 可选：`--number`（默认 `10`）

示例：

```bash
python3 scripts/qweather_query.py search-city --query "Hangzhou" --number 5
```

### `get-weather`

- 必填：`--location`

示例：

```bash
python3 scripts/qweather_query.py get-weather --location "101210101"
```

### `city-weather`

- 必填：`--query`
- 可选：`--number`、`--preferred-name`

示例：

```bash
python3 scripts/qweather_query.py city-weather --query "广州" --preferred-name "广州"
```

### 全局参数

- `--api-host`（可覆盖 `QWEATHER_API_HOST`）
- `--api-key`（可覆盖 `QWEATHER_API_KEY`）
- `--timeout`（默认 `5.0` 秒）

## 返回格式

- 成功：

```json
{
  "success": true
}
```

- 失败：

```json
{
  "success": false,
  "error": "error message"
}
```

## 常见问题

- **没有输出或输出乱码**
  - 可能是接口返回 gzip 压缩。脚本已内置解压逻辑，建议使用最新版本脚本。

- **报错 `Missing API host` / `Missing API key`**
  - 检查 `QWEATHER_API_HOST`、`QWEATHER_API_KEY` 是否已设置，或通过 `--api-host`、`--api-key` 显式传入。

- **报错 `QWeather API returned code=...`**
  - 检查 host、key、城市关键词是否正确，以及账号权限/配额状态。

## 安全建议

- 永远不要在 README、脚本、提交记录中写入真实密钥
- 只使用环境变量或密钥管理服务注入凭据
- 对外分享前，检查命令历史与日志是否包含敏感值
