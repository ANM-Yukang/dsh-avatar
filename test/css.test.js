// 校验生成的 CSS 文本：括号/引号平衡、圆角一致、无残留圆形规则。
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const src = fs.readFileSync(path.join(here, '..', 'client.js'), 'utf8');

// 抓取 `const CSS = [ ... ].join('\n');` 整段
const start = src.indexOf('const CSS = [');
if (start < 0) throw new Error('CSS array not found');
const joinAt = src.indexOf(".join('\\n');", start);
if (joinAt < 0) throw new Error('CSS join not found');
const seg = src.slice(start, joinAt + ".join('\\n')".length);

const fn = new Function(
  'ROW', 'AV', 'TOP', 'RADIUS', 'VIEW', 'PREV', 'WHALE', 'PERSON',
  seg.replace('const CSS =', 'return') + ';'
);
const css = fn(
  32, 40, 2, 25, 240, 96,
  'data:image/svg+xml;charset=utf-8,WHALE',
  'data:image/svg+xml;charset=utf-8,PERSON'
);

let fail = 0;
function check(name, ok, extra) {
  console.log((ok ? 'PASS  ' : 'FAIL  ') + name + (extra ? '  ' + extra : ''));
  if (!ok) fail++;
}

check('CSS 非空', css.length > 500, css.length + ' bytes');

const dq = (css.match(/"/g) || []).length;
check('双引号成对', dq % 2 === 0, String(dq));
const op = (css.match(/\(/g) || []).length;
const cl = (css.match(/\)/g) || []).length;
check('圆括号成对', op === cl, op + '/' + cl);
const ob = (css.match(/{/g) || []).length;
const cb = (css.match(/}/g) || []).length;
check('花括号成对', ob === cb, ob + '/' + cb);

// 改动 1：不应再有圆形头像规则
check('无残留 border-radius:50%', !css.includes('border-radius:50%'));
check('圆角矩形 25% 出现', css.includes('border-radius:25%'));

// 三个位置（视口 / 取景环 / 预览框 / 实际头像 / 开局缩略图）比例一致
const r25 = (css.match(/border-radius:25%/g) || []).length;
check('25% 圆角至少覆盖 5 处', r25 >= 5, String(r25));

// 改动 6：悬停高亮必须绑定 data-dsh-avatar-hover，而不是 :hover
check('悬停绑定 data-dsh-avatar-hover', css.includes('[data-dsh-avatar-hover]::before'));
check('无整行 :hover 高亮规则', !/\[data-dsh-avatar="[a-z]+"\]:hover/.test(css));

// 改动 2：开局入口样式存在
check('开局入口样式存在', css.includes('.dsh-avatar-open-btn'));
check('宿主展开态样式存在', css.includes('.dsh-avatar-host-open'));

// 改动 5：不得再出现会抛异常的 ctx.locale 读取
check('源码不再先读 ctx.locale', !/ctx\.locale\s*\|\|/.test(src));
check('源码改用守卫式 ctx.get', /ctx\.get\s*\?\s*ctx\.get\('locale'\)/.test(src));

// 改动 2：作用域键与优先级
check('作用域键含 global/session', /NS \+ who \+ ':' \+ \(scope === 'global'/.test(src));
check('本会话优先于全局', src.includes('resolveAvatar(userSession, userGlobal)'));

// 改动 3：动图保留 + 多格式接受
check('接受多种图片格式', src.includes('image/avif') && src.includes('image/svg+xml') && src.includes('image/bmp'));
check('动图以 live 形式保留动画', src.includes("kind: 'live'"));
check('烘焙为圆角矩形且不填白', src.includes('roundRect(ctx, 0, 0, OUT, OUT'));

// 动图的裁切参数必须能覆盖共享规则的 background-size/position（同权重下后者胜出）
const lines = css.split('\n');
const iShared = lines.findIndex((l) => l.includes('background-size:cover !important'));
const iAgent = lines.findIndex((l) => l.includes('--dsh-avatar-agent-bg'));
const iUser = lines.findIndex((l) => l.includes('--dsh-avatar-user-bg'));
check('共享头像规则存在', iShared >= 0, 'line ' + iShared);
check('Agent 分侧 background 在其后（live 裁切生效）', iAgent > iShared, 'line ' + iAgent);
check('用户分侧 background 在其后（live 裁切生效）', iUser > iShared, 'line ' + iUser);

// 开局入口必须在「已扫描」之后才可能出现，避免在已有会话里闪现
check('开局入口受 scanned 门控', /scanned\s*&&\s*!hasRows\s*&&\s*sessionId/.test(src));
check('扫描完成后置 scanned', src.includes('setScanned(true)'));

/* ---- 对比度：主按钮不得用 brand-primary 配白字（深色主题下为近白 → 白底白字）---- */
const iPrimary = lines.findIndex((l) => l.includes('.dsh-avatar-primary{'));
check('主按钮规则存在', iPrimary >= 0, 'line ' + iPrimary);
const primaryRule = iPrimary >= 0 ? lines[iPrimary] : '';
check(
  '主按钮用 button-info-fill（官方主按钮取色）',
  primaryRule.includes('--dsw-alias-button-info-fill')
);
check(
  '主按钮不再用 brand-primary 作底色',
  !primaryRule.includes('--dsw-alias-brand-primary')
);
check('主按钮白字有蓝色底（可读）', primaryRule.includes('color:#fff'));
// 源码中不得再有「brand-primary 作背景 + 白字」的组合
check(
  '无其它 brand-primary 白字按钮',
  !/background:\s*var\(--dsw-alias-brand-primary[^)]*\)[^;]*;\s*color:#fff/.test(css)
);

console.log('---');
console.log(fail === 0 ? 'ALL CSS/源码断言通过' : fail + ' 项失败');
process.exit(fail ? 1 : 0);
