// 提取并测试 client.js 中的 computeAvatarMarks 纯函数（覆盖评审 F4 的失败场景）。
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const src = fs.readFileSync(path.join(here, '..', 'client.js'), 'utf8');

/** 去掉块注释与整行注释，便于从源码中安全提取函数体求值。 */
function stripComments(text) {
  return text
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .split('\n')
    .filter((l) => !/^\s*(\*|\/\/)/.test(l))
    .join('\n');
}

const m = src.match(/@avatar-marks:start([\s\S]*?)@avatar-marks:end/);
if (!m) throw new Error('computeAvatarMarks marker block not found');

const body = stripComments(m[1]);

// 该函数是纯函数，从源码中提取后直接求值，确保测的就是随包发布的实现。
const computeAvatarMarks = new Function(body + '\nreturn computeAvatarMarks;')();
if (typeof computeAvatarMarks !== 'function') throw new Error('computeAvatarMarks not defined');
console.log('computeAvatarMarks extracted OK');

// 同样提取作用域优先级函数（用户需求 2：本会话优先于全局）。
const sc = src.match(/@avatar-scope:start([\s\S]*?)@avatar-scope:end/);
if (!sc) throw new Error('resolveAvatar marker block not found');
const resolveAvatar = new Function(stripComments(sc[1]) + '\nreturn resolveAvatar;')();
if (typeof resolveAvatar !== 'function') throw new Error('resolveAvatar not defined');
console.log('resolveAvatar extracted OK');

// 提取动图识别所需的数据（isAnimated 依赖 u8/ascii 两个小工具）。
const animMatch = src.match(/function u8\(buf\)[\s\S]*?function isAnimated\(buf, mime\)[\s\S]*?\n    \}/);
if (!animMatch) throw new Error('isAnimated block not found');
const isAnimated = new Function(stripComments(animMatch[0]) + '\nreturn isAnimated;')();
if (typeof isAnimated !== 'function') throw new Error('isAnimated not defined');
console.log('isAnimated extracted OK');

let pass = 0;
let fail = 0;
function t(name, rows, want) {
  const got = JSON.stringify(computeAvatarMarks(rows));
  const w = JSON.stringify(want);
  if (got === w) {
    pass++;
    console.log('PASS  ' + name);
  } else {
    fail++;
    console.log('FAIL  ' + name + '\n        got  ' + got + '\n        want ' + w);
  }
}

// 基础：一次发言 = 一个回合一个 agent 行
t('单次发言', [
  { kind: 'user', turn: 1, visible: true },
  { kind: 'assistant-step', turn: 1, visible: true },
], ['user', 'agent']);

// 工具调用不是 agent 侧，不应占名额
t('工具调用不占名额', [
  { kind: 'assistant-step', turn: 1, visible: true },
  { kind: 'tool-call', turn: 1, visible: true },
  { kind: 'assistant-step', turn: 1, visible: true },
], ['agent', null, null]);

// F4-a：前置 tool-call 被折叠(hidden)，其后可见的答案行必须仍有头像
t('F4-a 隐藏工具行不吞掉头像', [
  { kind: 'tool-call', turn: 1, visible: false },
  { kind: 'assistant-step', turn: 1, visible: true },
], [null, 'agent']);

// F4-b：分组内多个成员 + 后续顶层行，不得出现两个头像
t('F4-b 分组不产生双头像', [
  { kind: 'assistant-step', turn: 1, visible: true },
  { kind: 'assistant-step', turn: 1, visible: true },
  { kind: 'assistant-step', turn: 1, visible: true },
], ['agent', null, null]);

// 多回合 → 每回合各出现一次
t('多回合各出现一次', [
  { kind: 'user', turn: 1, visible: true },
  { kind: 'assistant-step', turn: 1, visible: true },
  { kind: 'user', turn: 2, visible: true },
  { kind: 'assistant-step', turn: 2, visible: true },
], ['user', 'agent', 'user', 'agent']);

// 连续用户消息（同回合同侧）只出现一次
t('连续用户消息只一次', [
  { kind: 'user', turn: 1, visible: true },
  { kind: 'user', turn: 1, visible: true },
], ['user', null]);

// 无 turn 属性时退化为逐行独立，避免互相吞并
t('turn 缺失时互不影响', [
  { kind: 'assistant-step', turn: null, visible: true },
  { kind: 'assistant-step', turn: null, visible: true },
], ['agent', 'agent']);

// steering 与 user 同侧，但各自都应出现一次
t('steering 与 user 各算一次', [
  { kind: 'user', turn: 1, visible: true },
  { kind: 'steering', turn: 1, visible: true },
], ['user', 'steering']);

// 隐藏的用户行不占名额
t('隐藏用户行不占名额', [
  { kind: 'user', turn: 1, visible: false },
  { kind: 'user', turn: 1, visible: true },
], [null, 'user']);

/* ---------------- 作用域优先级：本会话优先于全局（用户需求 2） ---------------- */

function s(name, got, want) {
  const g = JSON.stringify(got);
  const w = JSON.stringify(want);
  if (g === w) {
    pass++;
    console.log('PASS  ' + name);
  } else {
    fail++;
    console.log('FAIL  ' + name + '\n        got  ' + g + '\n        want ' + w);
  }
}

const G = { kind: 'baked', src: 'data:image/png;base64,GLOBAL' };
const S = { kind: 'baked', src: 'data:image/png;base64,SESSION' };

s('只有全局时用全局', resolveAvatar(null, G), G);
s('只有本会话时用本会话', resolveAvatar(S, null), S);
s('两者都有时本会话优先', resolveAvatar(S, G), S);
s('两者都无时为 null（回落默认图）', resolveAvatar(null, null), null);

/* ---------------- 动图识别 ---------------- */

function bytes(...arr) {
  return new Uint8Array(arr).buffer;
}
// GIF：两个图形控制扩展 (0x21 0xF9) 视为多帧
s('GIF 单帧 → 静态', isAnimated(bytes(0x47, 0x49, 0x46, 0x38, 0x39, 0x61, 0x21, 0xf9), 'image/gif'), false);
s('GIF 多帧 → 动图', isAnimated(bytes(0x47, 0x49, 0x46, 0x38, 0x39, 0x61, 0x21, 0xf9, 0x00, 0x21, 0xf9), 'image/gif'), true);
// PNG：acTL 块 = APNG
s('PNG 含 acTL → 动图', isAnimated(bytes(0x89, 0x50, 0x4e, 0x47, 0x61, 0x63, 0x54, 0x4c), 'image/png'), true);
s('PNG 无 acTL → 静态', isAnimated(bytes(0x89, 0x50, 0x4e, 0x47, 0x00, 0x00, 0x00, 0x00), 'image/png'), false);
// WebP：ANIM 块 = 动画
s('WebP 含 ANIM → 动图', isAnimated(bytes(0x52, 0x49, 0x46, 0x46, 0x41, 0x4e, 0x49, 0x4d), 'image/webp'), true);
s('WebP 无 ANIM → 静态', isAnimated(bytes(0x52, 0x49, 0x46, 0x46, 0x56, 0x50, 0x38, 0x20), 'image/webp'), false);
// JPEG 永远静态
s('JPEG → 静态', isAnimated(bytes(0xff, 0xd8, 0xff, 0xe0, 0x41, 0x4e, 0x49, 0x4d), 'image/jpeg'), false);

console.log('---');
console.log(pass + ' passed, ' + fail + ' failed');
process.exit(fail ? 1 : 0);
