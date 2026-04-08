'use strict';

const express = require('express');
const path = require('path');
const fs = require('fs');
const { KUAKE_BIN } = require('./kuake');

const app = express();
const PORT = process.env.PORT || 3000;

// ── 中间件 ──────────────────────────────────────────────────────────────────
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ── 启动前检查 kuake 二进制 ──────────────────────────────────────────────────
if (!fs.existsSync(KUAKE_BIN)) {
  console.error(`[ERROR] kuake binary not found at: ${KUAKE_BIN}`);
  console.error('Please build it first:  go build -o dist/kuake ./cmd/main.go');
  process.exit(1);
}

// ── 路由 ─────────────────────────────────────────────────────────────────────
const userRouter = require('./routes/user');
const filesRouter = require('./routes/files');
const shareRouter = require('./routes/share');

app.use('/api/user', userRouter);
app.use('/api/files', filesRouter);
app.use('/api/share', shareRouter);

// ── 健康检查 ──────────────────────────────────────────────────────────────────
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', kuake_bin: KUAKE_BIN });
});

// ── API 文档首页 ───────────────────────────────────────────────────────────────
app.get('/', (_req, res) => {
  res.json({
    name: 'Kuake Server',
    description: 'Quark Cloud Drive REST API',
    version: '1.0.0',
    endpoints: {
      'GET  /health': '健康检查',
      'GET  /api/user': '获取用户信息',
      'GET  /api/files/list?path=/': '列出目录',
      'GET  /api/files/info?path=/file.txt': '获取文件详情',
      'GET  /api/files/download-url?path=/file.txt': '获取下载链接',
      'POST /api/files/upload': '上传文件 (multipart/form-data: file, dest, policy?)',
      'POST /api/files/create-folder': '创建目录 { name, parent }',
      'POST /api/files/move': '移动 { src, dest }',
      'POST /api/files/copy': '复制 { src, dest }',
      'POST /api/files/rename': '重命名 { path, new_name }',
      'DELETE /api/files': '删除 { path }',
      'POST /api/share': '创建分享 { path, days, need_passcode }',
      'GET  /api/share/list?page=1&size=50': '我的分享列表',
      'DELETE /api/share': '删除分享 { share_ids?, paths? }',
      'POST /api/share/save': '转存分享 { share_link, passcode?, dest_dir? }',
    },
    auth: 'Set KUAKE_COOKIE env var, or pass x-quark-cookie request header',
  });
});

// ── 404 ────────────────────────────────────────────────────────────────────────
app.use((_req, res) => {
  res.status(404).json({ success: false, code: 'NOT_FOUND', message: 'Route not found' });
});

// ── 全局错误处理 ───────────────────────────────────────────────────────────────
app.use((err, _req, res, _next) => {
  console.error('[Unhandled Error]', err);
  res.status(500).json({ success: false, code: 'INTERNAL_ERROR', message: err.message });
});

// ── 启动 ────────────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`Kuake Server listening on port ${PORT}`);
  console.log(`KUAKE_BIN: ${KUAKE_BIN}`);
  console.log(`KUAKE_COOKIE: ${process.env.KUAKE_COOKIE ? '[SET]' : '[NOT SET]'}`);
});

module.exports = app;
