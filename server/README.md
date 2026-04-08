# Kuake Server

将夸克网盘（Quark Cloud Drive）CLI 功能封装为 **Node.js HTTP REST API** 服务。

## 架构说明

```
HTTP Client
    │
    ▼
Node.js Express Server  (server/)
    │  调用子进程
    ▼
kuake CLI (dist/kuake)   ← Go 二进制
    │  HTTP 请求
    ▼
夸克网盘 API (pan.quark.cn)
```

## 快速开始

### 1. 编译 Go CLI 二进制

在仓库根目录执行：

```bash
go build -o dist/kuake ./cmd/main.go
```

### 2. 安装 Node.js 依赖

```bash
cd server
npm install
```

### 3. 启动服务

```bash
# 方式一：通过环境变量传入 Cookie（推荐）
KUAKE_COOKIE="your_quark_cookie" npm start

# 方式二：指定端口
PORT=8080 KUAKE_COOKIE="your_quark_cookie" npm start

# 方式三：不设置全局 Cookie，每次请求时通过 Header 传入
npm start
```

默认监听端口：`3000`

## 认证方式

Cookie 来源优先级（从高到低）：

1. 请求 Header：`x-quark-cookie: <cookie_value>`
2. 环境变量：`KUAKE_COOKIE=<cookie_value>`

Cookie 值可以只传 `__pus=` 后面的部分，也可以传完整 Cookie 字符串。

## 环境变量

| 变量 | 说明 | 默认值 |
|------|------|--------|
| `PORT` | 监听端口 | `3000` |
| `KUAKE_COOKIE` | 全局夸克 Cookie | - |
| `KUAKE_BIN` | kuake 二进制路径 | `../dist/kuake` |

## API 接口文档

所有接口返回统一格式：

```json
{
  "success": true,
  "code": "OK",
  "message": "...",
  "data": { ... }
}
```

---

### 健康检查

#### `GET /health`

```bash
curl http://localhost:3000/health
```

---

### 用户信息

#### `GET /api/user`

获取当前登录用户信息，包括昵称、UID、存储容量、会员状态等。

```bash
curl -H "x-quark-cookie: YOUR_COOKIE" http://localhost:3000/api/user
```

**响应示例：**

```json
{
  "success": true,
  "code": "OK",
  "data": {
    "nickname": "张三",
    "account_id": "123456",
    "use_capacity": 1073741824,
    "total_capacity": 107374182400
  }
}
```

---

### 文件管理

#### `GET /api/files/list`

列出目录内容。

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `path` | query | 否 | 目录路径，默认 `"/"` |

```bash
curl "http://localhost:3000/api/files/list?path=/"
curl "http://localhost:3000/api/files/list?path=/我的文件夹"
```

**响应示例：**

```json
{
  "success": true,
  "data": {
    "list": [
      {
        "fid": "abc123",
        "file_name": "文档",
        "path": "/文档",
        "size": 0,
        "dir": true,
        "ctime": 1700000000,
        "mtime": 1700000000
      }
    ]
  }
}
```

---

#### `GET /api/files/info`

获取文件或目录的详细信息。

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `path` | query | 是 | 文件/目录路径 |

```bash
curl "http://localhost:3000/api/files/info?path=/文档/report.pdf"
```

---

#### `GET /api/files/download-url`

获取文件的临时下载链接。

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `path` | query | 是 | 文件路径 |

```bash
curl "http://localhost:3000/api/files/download-url?path=/文档/report.pdf"
```

**响应示例：**

```json
{
  "success": true,
  "data": {
    "fid": "abc123",
    "path": "/文档/report.pdf",
    "download_url": "https://..."
  }
}
```

---

#### `POST /api/files/upload`

上传本地文件到夸克网盘（支持大文件分片、秒传、断点续传）。

**请求格式：** `multipart/form-data`

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `file` | File | 是 | 要上传的文件 |
| `dest` | string | 是 | 目标路径，如 `/folder/file.txt` 或 `/folder/`（自动使用原始文件名） |
| `policy` | string | 否 | 重复策略：`skip`（默认）/ `overwrite` / `rsync` |

```bash
curl -X POST http://localhost:3000/api/files/upload \
  -H "x-quark-cookie: YOUR_COOKIE" \
  -F "file=@/local/path/report.pdf" \
  -F "dest=/文档/report.pdf"

# 上传到目录（自动使用文件名）
curl -X POST http://localhost:3000/api/files/upload \
  -F "file=@/local/path/report.pdf" \
  -F "dest=/文档/"
```

---

#### `POST /api/files/create-folder`

创建文件夹。

**请求体 (JSON)：**

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `name` | string | 是 | 文件夹名称 |
| `parent` | string | 是 | 父目录路径，如 `"/"` 或 `"/文档"` |

```bash
curl -X POST http://localhost:3000/api/files/create-folder \
  -H "Content-Type: application/json" \
  -d '{"name": "新文件夹", "parent": "/"}'
```

---

#### `POST /api/files/move`

移动文件或目录。

**请求体 (JSON)：**

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `src` | string | 是 | 源路径 |
| `dest` | string | 是 | 目标路径 |

```bash
curl -X POST http://localhost:3000/api/files/move \
  -H "Content-Type: application/json" \
  -d '{"src": "/旧位置/file.txt", "dest": "/新位置/file.txt"}'
```

---

#### `POST /api/files/copy`

复制文件或目录。

**请求体 (JSON)：** 同 `move`

```bash
curl -X POST http://localhost:3000/api/files/copy \
  -H "Content-Type: application/json" \
  -d '{"src": "/文档/report.pdf", "dest": "/备份/report.pdf"}'
```

---

#### `POST /api/files/rename`

重命名文件或目录。

**请求体 (JSON)：**

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `path` | string | 是 | 文件/目录路径 |
| `new_name` | string | 是 | 新名称 |

```bash
curl -X POST http://localhost:3000/api/files/rename \
  -H "Content-Type: application/json" \
  -d '{"path": "/旧名.txt", "new_name": "新名.txt"}'
```

---

#### `DELETE /api/files`

删除文件或目录。

**请求体 (JSON)：**

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `path` | string | 是 | 文件/目录路径 |

```bash
curl -X DELETE http://localhost:3000/api/files \
  -H "Content-Type: application/json" \
  -d '{"path": "/要删除的文件.txt"}'
```

---

### 分享管理

#### `POST /api/share`

创建分享链接。

**请求体 (JSON)：**

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `path` | string | 是 | 要分享的文件/目录路径 |
| `days` | number | 是 | 有效天数：`0`=永久，`1`/`7`/`30`=对应天数 |
| `need_passcode` | boolean | 是 | 是否设置随机提取码 |

```bash
curl -X POST http://localhost:3000/api/share \
  -H "Content-Type: application/json" \
  -d '{"path": "/文档/report.pdf", "days": 7, "need_passcode": false}'
```

**响应示例：**

```json
{
  "success": true,
  "data": {
    "share_url": "https://pan.quark.cn/s/abc123",
    "pwd_id": "abc123",
    "passcode": "",
    "expires_at": 1700000000000,
    "expires_at_formatted": "2024-01-01 00:00:00"
  }
}
```

---

#### `GET /api/share/list`

获取我的分享列表。

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `page` | query | 否 | 页码，默认 `1` |
| `size` | query | 否 | 每页数量，默认 `50` |
| `order_field` | query | 否 | 排序字段，默认 `created_at` |
| `order_type` | query | 否 | 排序方向：`asc`/`desc`，默认 `desc` |

```bash
curl "http://localhost:3000/api/share/list?page=1&size=20"
```

---

#### `DELETE /api/share`

删除分享。

**请求体 (JSON)：**

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `share_ids` | string[] | 否 | 分享 ID 数组 |
| `paths` | string[] | 否 | 文件路径数组（自动查找对应分享 ID） |

两者至少提供其一。

```bash
# 通过分享 ID 删除
curl -X DELETE http://localhost:3000/api/share \
  -H "Content-Type: application/json" \
  -d '{"share_ids": ["abc123def456"]}'

# 通过文件路径删除（自动查找分享 ID）
curl -X DELETE http://localhost:3000/api/share \
  -H "Content-Type: application/json" \
  -d '{"paths": ["/文档/report.pdf"]}'
```

---

#### `POST /api/share/save`

将他人的分享内容转存到自己的网盘。

**请求体 (JSON)：**

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `share_link` | string | 是 | 分享链接，如 `https://pan.quark.cn/s/xxx` |
| `passcode` | string | 否 | 提取码（若链接已包含则可不填） |
| `dest_dir` | string | 否 | 目标目录，默认 `"/"` |

```bash
curl -X POST http://localhost:3000/api/share/save \
  -H "Content-Type: application/json" \
  -d '{"share_link": "https://pan.quark.cn/s/abc123", "dest_dir": "/我的收藏"}'
```

---

## 目录结构

```
server/
├── src/
│   ├── index.js          # 主入口，注册路由和中间件
│   ├── kuake.js          # kuake CLI 调用封装
│   └── routes/
│       ├── user.js       # 用户信息相关路由
│       ├── files.js      # 文件操作相关路由
│       └── share.js      # 分享管理相关路由
├── package.json
└── README.md
```
