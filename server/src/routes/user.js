'use strict';

const { Router } = require('express');
const { runKuake, extractCookie } = require('../kuake');

const router = Router();

/**
 * GET /api/user
 * 获取当前登录用户信息（昵称、UID、容量等）
 *
 * Headers:
 *   x-quark-cookie: <cookie>  （可选，优先于环境变量 KUAKE_COOKIE）
 */
router.get('/', async (req, res) => {
  try {
    const cookie = extractCookie(req);
    const result = await runKuake(['user'], cookie);
    res.json(result);
  } catch (err) {
    res.status(500).json({ success: false, code: 'INTERNAL_ERROR', message: err.message });
  }
});

module.exports = router;
