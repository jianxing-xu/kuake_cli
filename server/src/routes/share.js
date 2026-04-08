'use strict';

const { Router } = require('express');
const { runKuake, extractCookie } = require('../kuake');

const router = Router();

/**
 * POST /api/share
 * 创建分享链接
 *
 * Body (JSON):
 *   path         - 要分享的文件/目录路径（必填）
 *   days         - 有效天数：0=永久, 1/7/30（必填）
 *   need_passcode - 是否设置提取码：true/false（必填）
 */
router.post('/', async (req, res) => {
  try {
    const cookie = extractCookie(req);
    const { path: filePath, days, need_passcode } = req.body;

    if (!filePath || days === undefined || need_passcode === undefined) {
      return res.status(400).json({
        success: false,
        code: 'MISSING_PARAM',
        message: '"path", "days", and "need_passcode" are required',
      });
    }

    const passcodeStr = need_passcode ? 'true' : 'false';
    const result = await runKuake(['share', filePath, String(days), passcodeStr], cookie);
    res.json(result);
  } catch (err) {
    res.status(500).json({ success: false, code: 'INTERNAL_ERROR', message: err.message });
  }
});

/**
 * GET /api/share/list
 * 获取我的分享列表
 *
 * Query:
 *   page         - 页码（可选，默认 1）
 *   size         - 每页数量（可选，默认 50）
 *   order_field  - 排序字段（可选，默认 "created_at"）
 *   order_type   - 排序方向：asc/desc（可选，默认 "desc"）
 */
router.get('/list', async (req, res) => {
  try {
    const cookie = extractCookie(req);
    const page = req.query.page || '1';
    const size = req.query.size || '50';
    const orderField = req.query.order_field || 'created_at';
    const orderType = req.query.order_type || 'desc';

    const result = await runKuake(['share-list', page, size, orderField, orderType], cookie);
    res.json(result);
  } catch (err) {
    res.status(500).json({ success: false, code: 'INTERNAL_ERROR', message: err.message });
  }
});

/**
 * DELETE /api/share
 * 删除分享
 *
 * Body (JSON):
 *   share_ids  - 分享 ID 数组（与 paths 至少提供其一）
 *   paths      - 文件路径数组（与 share_ids 至少提供其一）
 *
 * 示例：
 *   { "share_ids": ["abc123"] }
 *   { "paths": ["/file.txt"] }
 */
router.delete('/', async (req, res) => {
  try {
    const cookie = extractCookie(req);
    const { share_ids: shareIds, paths } = req.body;

    const targets = [];
    if (Array.isArray(shareIds)) targets.push(...shareIds);
    if (Array.isArray(paths)) targets.push(...paths);

    if (targets.length === 0) {
      return res.status(400).json({
        success: false,
        code: 'MISSING_PARAM',
        message: 'at least one of "share_ids" or "paths" is required',
      });
    }

    const result = await runKuake(['share-delete', ...targets], cookie);
    res.json(result);
  } catch (err) {
    res.status(500).json({ success: false, code: 'INTERNAL_ERROR', message: err.message });
  }
});

/**
 * POST /api/share/save
 * 转存他人的分享到自己的网盘
 *
 * Body (JSON):
 *   share_link  - 分享链接，如 "https://pan.quark.cn/s/xxx"（必填）
 *   passcode    - 提取码（可选）
 *   dest_dir    - 目标目录路径，如 "/folder"（可选，默认 "/"）
 */
router.post('/save', async (req, res) => {
  try {
    const cookie = extractCookie(req);
    const { share_link: shareLink, passcode, dest_dir: destDir } = req.body;

    if (!shareLink) {
      return res.status(400).json({ success: false, code: 'MISSING_PARAM', message: '"share_link" is required' });
    }

    const args = ['share-save', shareLink];
    if (passcode) args.push(passcode);
    if (destDir) args.push(destDir);

    const result = await runKuake(args, cookie);
    res.json(result);
  } catch (err) {
    res.status(500).json({ success: false, code: 'INTERNAL_ERROR', message: err.message });
  }
});

module.exports = router;
