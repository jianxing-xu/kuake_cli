'use strict';

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

const KUAKE_BIN = process.env.KUAKE_BIN || path.resolve(__dirname, '../../dist/kuake');

/**
 * 执行 kuake CLI 命令并返回解析后的 JSON 结果
 * @param {string[]} args - CLI 参数数组
 * @param {string} [cookie] - 可选的 cookie 字符串（优先级高于环境变量）
 * @returns {Promise<object>} - 解析后的 CLIResult 对象
 */
function runKuake(args, cookie) {
  return new Promise((resolve, reject) => {
    const env = { ...process.env };

    const finalArgs = [];

    // cookie 传递方式：通过 -cookies 参数或环境变量
    const effectiveCookie = cookie || env.KUAKE_COOKIE;
    if (effectiveCookie) {
      finalArgs.push('-cookies', effectiveCookie);
    }

    finalArgs.push(...args);

    const proc = spawn(KUAKE_BIN, finalArgs, { env });

    let stdout = '';
    let stderr = '';

    proc.stdout.on('data', (data) => { stdout += data.toString(); });
    proc.stderr.on('data', (data) => { stderr += data.toString(); });

    proc.on('error', (err) => {
      reject(new Error(`Failed to spawn kuake: ${err.message}`));
    });

    proc.on('close', (code) => {
      try {
        // stdout 可能包含多行 JSON（流式模式），这里处理单对象情况
        const trimmed = stdout.trim();
        if (!trimmed) {
          resolve({
            success: false,
            code: 'EMPTY_OUTPUT',
            message: stderr.trim() || 'No output from kuake',
            data: null,
          });
          return;
        }
        const result = JSON.parse(trimmed);
        resolve(result);
      } catch (e) {
        resolve({
          success: false,
          code: 'PARSE_ERROR',
          message: `Failed to parse kuake output: ${e.message}. stdout=${stdout.slice(0, 500)}`,
          data: null,
        });
      }
    });
  });
}

/**
 * 执行 kuake CLI 命令并以流式方式返回多行 JSON 结果
 * @param {string[]} args - CLI 参数数组
 * @param {string} [cookie] - 可选的 cookie 字符串
 * @returns {Promise<object[]>} - 解析后的 CLIResult 对象数组
 */
function runKuakeStream(args, cookie) {
  return new Promise((resolve, reject) => {
    const env = { ...process.env };

    const finalArgs = [];

    const effectiveCookie = cookie || env.KUAKE_COOKIE;
    if (effectiveCookie) {
      finalArgs.push('-cookies', effectiveCookie);
    }

    finalArgs.push(...args);

    const proc = spawn(KUAKE_BIN, finalArgs, { env });

    let stdout = '';
    let stderr = '';

    proc.stdout.on('data', (data) => { stdout += data.toString(); });
    proc.stderr.on('data', (data) => { stderr += data.toString(); });

    proc.on('error', (err) => {
      reject(new Error(`Failed to spawn kuake: ${err.message}`));
    });

    proc.on('close', () => {
      const lines = stdout.trim().split('\n').filter(l => l.trim());
      const results = [];
      for (const line of lines) {
        try {
          results.push(JSON.parse(line));
        } catch (e) {
          // skip malformed lines
        }
      }
      resolve(results);
    });
  });
}

/**
 * 从请求头或请求体中获取 cookie
 * @param {object} req - Express request
 * @returns {string|undefined}
 */
function extractCookie(req) {
  return req.headers['x-quark-cookie'] || req.body?.cookie || undefined;
}

module.exports = { runKuake, runKuakeStream, extractCookie, KUAKE_BIN };
