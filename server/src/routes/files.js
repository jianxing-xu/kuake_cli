'use strict';

const { Router } = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const os = require('os');
const { runKuake, runKuakeStream, extractCookie } = require('../kuake');

const router = Router();

// 上传临时目录
const uploadStorage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, os.tmpdir()),
  filename: (_req, file, cb) => {
    const unique = `kuake_upload_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    cb(null, unique + path.extname(file.originalname));
  },
});
const upload = multer({ storage: uploadStorage });

/**
 * GET /api/files/list
 * 列出目录内容
 *
 * Query:
 *   path  - 目录路径，默认 "/"
 */
router.get('/list', async (req, res) => {
  try {
    const cookie = extractCookie(req);
    const dirPath = req.query.path || '/';
    const results = await runKuakeStream(['list', dirPath, '--stream'], cookie);

    // 若无流式结果则回退到普通模式
    if (results.length === 0) {
      const single = await runKuake(['list', dirPath], cookie);
      return res.json(single);
    }

    const files = results
      .filter(r => r.success)
      .map(r => r.data);

    res.json({ success: true, code: 'OK', message: 'OK', data: { list: files } });
  } catch (err) {
    res.status(500).json({ success: false, code: 'INTERNAL_ERROR', message: err.message });
  }
});

/**
 * GET /api/files/info
 * 获取文件/目录详细信息
 *
 * Query:
 *   path  - 文件或目录路径（必填）
 */
router.get('/info', async (req, res) => {
  try {
    const cookie = extractCookie(req);
    const filePath = req.query.path;
    if (!filePath) {
      return res.status(400).json({ success: false, code: 'MISSING_PARAM', message: 'query param "path" is required' });
    }
    const result = await runKuake(['info', filePath], cookie);
    res.json(result);
  } catch (err) {
    res.status(500).json({ success: false, code: 'INTERNAL_ERROR', message: err.message });
  }
});

/**
 * GET /api/files/download-url
 * 获取文件的下载链接（不下载到本地）
 *
 * Query:
 *   path  - 文件路径（必填）
 */
router.get('/download-url', async (req, res) => {
  try {
    const cookie = extractCookie(req);
    const filePath = req.query.path;
    if (!filePath) {
      return res.status(400).json({ success: false, code: 'MISSING_PARAM', message: 'query param "path" is required' });
    }
    const result = await runKuake(['download', filePath], cookie);
    res.json(result);
  } catch (err) {
    res.status(500).json({ success: false, code: 'INTERNAL_ERROR', message: err.message });
  }
});

/**
 * POST /api/files/upload
 * 上传文件到夸克网盘
 *
 * multipart/form-data:
 *   file     - 要上传的文件（必填）
 *   dest     - 目标路径，如 "/folder/file.txt"（必填）
 *   policy   - 重复策略：skip / overwrite / rsync（可选，默认 skip）
 *
 * Headers (可选):
 *   x-quark-cookie: <cookie>
 */
router.post('/upload', upload.single('file'), async (req, res) => {
  let tempFilePath = null;
  try {
    const cookie = extractCookie(req);

    if (!req.file) {
      return res.status(400).json({ success: false, code: 'MISSING_FILE', message: 'multipart field "file" is required' });
    }
    if (!req.body.dest) {
      return res.status(400).json({ success: false, code: 'MISSING_PARAM', message: 'form field "dest" is required' });
    }

    tempFilePath = req.file.path;

    // 如果 dest 是目录（以 / 结尾），则拼接原始文件名
    let destPath = req.body.dest;
    if (destPath.endsWith('/')) {
      destPath = destPath + req.file.originalname;
    }

    const args = ['upload', tempFilePath, destPath];
    if (req.body.policy) {
      args.push('--policy', req.body.policy);
    }

    const result = await runKuake(args, cookie);
    res.json(result);
  } catch (err) {
    res.status(500).json({ success: false, code: 'INTERNAL_ERROR', message: err.message });
  } finally {
    // 清理临时文件
    if (tempFilePath) {
      fs.unlink(tempFilePath, () => {});
    }
  }
});

/**
 * POST /api/files/create-folder
 * 创建文件夹
 *
 * Body (JSON):
 *   name    - 文件夹名称（必填）
 *   parent  - 父目录路径，如 "/" 或 "/subdir"（必填）
 */
router.post('/create-folder', async (req, res) => {
  try {
    const cookie = extractCookie(req);
    const { name, parent } = req.body;
    if (!name || !parent) {
      return res.status(400).json({ success: false, code: 'MISSING_PARAM', message: '"name" and "parent" are required' });
    }
    const result = await runKuake(['create', name, parent], cookie);
    res.json(result);
  } catch (err) {
    res.status(500).json({ success: false, code: 'INTERNAL_ERROR', message: err.message });
  }
});

/**
 * POST /api/files/move
 * 移动文件或目录
 *
 * Body (JSON):
 *   src   - 源路径（必填）
 *   dest  - 目标路径（必填）
 */
router.post('/move', async (req, res) => {
  try {
    const cookie = extractCookie(req);
    const { src, dest } = req.body;
    if (!src || !dest) {
      return res.status(400).json({ success: false, code: 'MISSING_PARAM', message: '"src" and "dest" are required' });
    }
    const result = await runKuake(['move', src, dest], cookie);
    res.json(result);
  } catch (err) {
    res.status(500).json({ success: false, code: 'INTERNAL_ERROR', message: err.message });
  }
});

/**
 * POST /api/files/copy
 * 复制文件或目录
 *
 * Body (JSON):
 *   src   - 源路径（必填）
 *   dest  - 目标路径（必填）
 */
router.post('/copy', async (req, res) => {
  try {
    const cookie = extractCookie(req);
    const { src, dest } = req.body;
    if (!src || !dest) {
      return res.status(400).json({ success: false, code: 'MISSING_PARAM', message: '"src" and "dest" are required' });
    }
    const result = await runKuake(['copy', src, dest], cookie);
    res.json(result);
  } catch (err) {
    res.status(500).json({ success: false, code: 'INTERNAL_ERROR', message: err.message });
  }
});

/**
 * POST /api/files/rename
 * 重命名文件或目录
 *
 * Body (JSON):
 *   path     - 文件/目录路径（必填）
 *   new_name - 新名称（必填）
 */
router.post('/rename', async (req, res) => {
  try {
    const cookie = extractCookie(req);
    const { path: filePath, new_name: newName } = req.body;
    if (!filePath || !newName) {
      return res.status(400).json({ success: false, code: 'MISSING_PARAM', message: '"path" and "new_name" are required' });
    }
    const result = await runKuake(['rename', filePath, newName], cookie);
    res.json(result);
  } catch (err) {
    res.status(500).json({ success: false, code: 'INTERNAL_ERROR', message: err.message });
  }
});

/**
 * DELETE /api/files
 * 删除文件或目录
 *
 * Body (JSON):
 *   path  - 文件/目录路径（必填）
 */
router.delete('/', async (req, res) => {
  try {
    const cookie = extractCookie(req);
    const filePath = req.body.path || req.query.path;
    if (!filePath) {
      return res.status(400).json({ success: false, code: 'MISSING_PARAM', message: '"path" is required' });
    }
    const result = await runKuake(['delete', filePath], cookie);
    res.json(result);
  } catch (err) {
    res.status(500).json({ success: false, code: 'INTERNAL_ERROR', message: err.message });
  }
});

module.exports = router;
