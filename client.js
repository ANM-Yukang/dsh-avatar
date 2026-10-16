/**
 * dsh-avatar — 聊天头像插件（客户端半）
 *
 * 交互：不在输入框上方渲染常驻控件。直接点击会话里的头像即可设置：
 *   · 点击「自己消息右侧」的头像 → 设置我的头像
 *   · 点击「Agent 发言左侧」的头像 → 设置 Agent 头像
 * 两者都支持「全局」与「本会话」两个作用域，本会话优先于全局。
 * 新会话（尚无消息）时，在输入框上方显示一个轻量入口，便于开局就设置双方头像。
 *
 * 需求映射：
 *  R1 圆角矩形头像 + 上传裁剪实时预览（裁剪视口/预览/实际头像三处圆角比例一致）
 *  R2 用户右侧 / Agent 左侧、随行不漂移、每次发言一次、工具调用不产生头像
 *  R3 新会话默认官方黑色鲸鱼；点击头像设置；按会话隔离；本会话优先于全局
 *
 * 约束：不 require 任何 @deepseek-ai/dsh-client-*；不向 body 追加节点；不追加新的会话事件类型；
 *      chrome 仅用 --dsw-alias-* 令牌（字面色仅用于头像 artwork）；资源均注册后返回清理函数。
 * 运行时：仅使用 React.createElement / useState / useEffect（客户端 Builtin 白名单）。
 */
window.__ModuleLoader__.load({
  id: 'dsh-avatar',
  factory(require) {
    const React = require('react');
    const h = React.createElement;
    const useState = React.useState;
    const useEffect = React.useEffect;

    /** 稳定可变容器（替代 useRef，后者不在客户端 Builtin 白名单）。 */
    function useBox(init) {
      return useState(function () {
        return { current: init };
      })[0];
    }

    /* ---------------------------------- artwork --------------------------------- */

    // 官方鲸鱼路径（内嵌常量，从安装包逐字节提取；禁止 require 官方 primitives 包）
    const FISH_LOGO_PATH =
      'M22.9168 1.43018C22.6713 1.31018 22.5658 1.53918 22.4223 1.65519C22.3733 1.69269 22.3318 1.74169 22.2903 1.78669C21.9317 2.1697 21.5127 2.42121 20.9657 2.39121C20.1657 2.34621 19.4827 2.59771 18.8787 3.20973C18.7502 2.45521 18.3236 2.0047 17.6746 1.71569C17.3351 1.56568 16.9916 1.41518 16.7536 1.08867C16.5876 0.856163 16.5421 0.597155 16.4591 0.341647C16.4061 0.187643 16.3536 0.0301382 16.1761 0.00363739C15.9836 -0.0263635 15.9081 0.135141 15.8326 0.270145C15.5306 0.822162 15.4136 1.43018 15.4251 2.0462C15.4516 3.43174 16.0366 4.53527 17.1991 5.3203C17.3311 5.4103 17.3651 5.5003 17.3236 5.63181C17.2441 5.90231 17.1501 6.16482 17.0671 6.43533C17.0141 6.60784 16.9351 6.64584 16.7501 6.57033C16.1121 6.30383 15.5611 5.90931 15.074 5.4328C14.2475 4.63328 13.5 3.75075 12.568 3.05973C12.349 2.89822 12.13 2.74822 11.9034 2.60522C10.9524 1.68169 12.028 0.923165 12.277 0.833162C12.5375 0.739159 12.3675 0.41615 11.5259 0.42015C10.6844 0.42365 9.91439 0.705658 8.93286 1.08117C8.78935 1.13767 8.63835 1.17867 8.48384 1.21267C7.59332 1.04367 6.66829 1.00617 5.70226 1.11517C3.88321 1.31768 2.43016 2.1777 1.36213 3.64575C0.0790928 5.4103 -0.222916 7.41536 0.146595 9.50642C0.535106 11.7105 1.66014 13.535 3.38869 14.9616C5.18125 16.4406 7.24581 17.1657 9.60138 17.0266C11.0319 16.9441 12.6245 16.7526 14.421 15.2321C14.874 15.4576 15.3496 15.5476 16.1381 15.6151C16.7456 15.6716 17.3306 15.5851 17.7836 15.4911C18.4931 15.3411 18.4441 14.6841 18.1876 14.5636C16.1081 13.595 16.5646 13.9891 16.1496 13.67C17.2061 12.42 18.8202 10.1979 19.3182 7.17235C19.3672 6.83834 19.4297 6.36783 19.4222 6.09732C19.4182 5.93231 19.4562 5.86831 19.6447 5.84931C20.1657 5.78931 20.6712 5.64681 21.1357 5.3913C22.4833 4.65528 23.0268 3.44624 23.1548 1.9972C23.1738 1.77569 23.1508 1.54668 22.9168 1.43018ZM11.1749 14.4736C9.15936 12.889 8.18184 12.3675 7.77832 12.39C7.40081 12.4125 7.46881 12.8445 7.55182 13.126C7.63882 13.404 7.75182 13.5955 7.91033 13.8396C8.01983 14.0011 8.09533 14.2411 7.80083 14.4216C7.15181 14.8231 6.02327 14.2866 5.97027 14.2601C4.65673 13.4865 3.5587 12.4655 2.78467 11.069C2.03715 9.72493 1.60314 8.28289 1.53164 6.74384C1.51264 6.37233 1.62214 6.24082 1.99215 6.17332C2.47916 6.08332 2.98118 6.06432 3.46769 6.13582C5.52476 6.43633 7.27581 7.35586 8.74385 8.8129C9.58188 9.64243 10.2159 10.634 10.8689 11.6025C11.5634 12.631 12.3105 13.611 13.262 14.4146C13.598 14.6961 13.866 14.9101 14.1225 15.0681C13.349 15.1546 12.058 15.1731 11.1749 14.4746L11.1749 14.4736ZM12.141 8.25988C12.141 8.09488 12.273 7.96338 12.439 7.96338C12.4765 7.96338 12.5105 7.97088 12.541 7.98188C12.5825 7.99688 12.6205 8.01938 12.6505 8.05338C12.7035 8.10588 12.7335 8.18088 12.7335 8.25988C12.7335 8.42489 12.6015 8.55639 12.4355 8.55639C12.2695 8.55639 12.141 8.42489 12.141 8.25988ZM15.1415 9.79893C14.949 9.87793 14.7565 9.94544 14.5715 9.95294C14.2845 9.96794 13.9715 9.85143 13.8015 9.70893C13.5375 9.48742 13.3485 9.36342 13.2695 8.97691C13.2355 8.8119 13.2545 8.55639 13.2845 8.40989C13.3525 8.09438 13.277 7.89187 13.0545 7.70787C12.8735 7.55786 12.643 7.51636 12.39 7.51636C12.2955 7.51636 12.209 7.47486 12.1445 7.44136C12.039 7.38886 11.9519 7.25735 12.035 7.09585C12.0615 7.04335 12.19 6.91584 12.22 6.89334C12.5635 6.69784 12.9595 6.76184 13.326 6.90834C13.6655 7.04735 13.9225 7.30236 14.292 7.66287C14.6695 8.09838 14.7375 8.21838 14.9525 8.54539C15.1225 8.8009 15.277 9.06341 15.3831 9.36392C15.4471 9.55142 15.3641 9.70493 15.1415 9.79893Z';

    const svgUrl = function (s) {
      return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(s);
    };

    // 默认 Agent 头像：官方黑色鲸鱼 + 白色底片（深浅主题均可辨识）
    const WHALE = svgUrl(
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32">' +
        '<rect width="32" height="32" fill="#ffffff"/>' +
        '<g transform="translate(4.42 7.48)"><path d="' +
        FISH_LOGO_PATH +
        '" fill="#000000"/></g></svg>'
    );

    // 默认用户头像：中性人像
    const PERSON = svgUrl(
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32">' +
        '<rect width="32" height="32" fill="#e8eaed"/>' +
        '<circle cx="16" cy="12" r="5" fill="#9aa0a6"/>' +
        '<path d="M6 27c0-5.5 4.5-9 10-9s10 3.5 10 9z" fill="#9aa0a6"/></svg>'
    );

    /* ---------------------------------- 常量 ----------------------------------- */

    const NS = 'dsh-avatar:v2:';
    const ROW = 32; // 头像边长（与 CSS 一致）
    const AV = 40; // 头像占位宽（32px 头像 + 8px 间距）
    const TOP = 2; // 头像距行顶
    const PAD = 4; // 命中容差
    const VIEW = 240; // 裁切视口
    const OUT = 256; // 烘焙输出尺寸
    const PREV = 96; // 预览框尺寸
    const RADIUS = 25; // 圆角比例（%）——视口/预览/实际头像三处一致
    const MAX_BAKED = 192 * 1024; // 烘焙结果上限
    const MAX_SRC = 1200 * 1024; // 动图/原图直存上限

    const ACCEPT = 'image/png,image/jpeg,image/jpg,image/webp,image/gif,image/bmp,image/avif,image/svg+xml';
    const MIME_OK = /^image\/(png|jpeg|jpg|webp|gif|bmp|avif|svg\+xml)$/;

    /* --------------------------------- 文案 ----------------------------------- */

    const DICT = {
      userTitle: '设置我的头像',
      agentTitle: '设置 Agent 头像',
      scopeGlobal: '全局',
      scopeSession: '本会话',
      hintGlobalUser: '全局：所有会话共用这一张',
      hintSessionUser: '本会话：仅当前对话，优先于全局',
      hintGlobalAgent: '全局：所有会话的 Agent 默认用这一张',
      hintSessionAgent: '本会话：仅当前对话的 Agent，优先于全局',
      overrideOn: '本会话已单独设置，优先于全局',
      cropHint: '拖动移动，滚轮或滑块缩放；右侧为最终效果预览',
      preview: '最终效果',
      pick: '选择图片',
      cancel: '取消',
      confirm: '确定',
      clear: '清除此范围',
      zoom: '缩放',
      emptyTitle: '设置头像',
      errType: '请选择 PNG / JPEG / WebP / GIF / BMP / AVIF / SVG 图片',
      errRead: '图片读取失败，请重试',
      errLarge: '图片过大，请换一张或缩小后重试',
      errSave: '保存失败（存储空间不足），本次设置仅在刷新前有效',
      errAnim: '动图过大，已超过存储上限；请换更小的动图',
      noSession: '未识别到会话，无法设置本会话头像',
      animNote: '已识别为动图，将保留动画（不做静态化）',
    };

    /* --------------------------------- 存储层 ---------------------------------- */

    const memory = Object.create(null); // localStorage 不可用时的降级

    function readStore(key) {
      try {
        const v = window.localStorage.getItem(key);
        if (v !== null) return v;
      } catch (e) {
        /* 降级到内存 */
      }
      return memory[key] || '';
    }

    function writeStore(key, value) {
      memory[key] = value;
      try {
        window.localStorage.setItem(key, value);
        return true;
      } catch (e) {
        return false; // 由调用方提示用户
      }
    }

    function removeStore(key) {
      delete memory[key];
      try {
        window.localStorage.removeItem(key);
      } catch (e) {
        /* 忽略：内存已清理 */
      }
    }

    function keyOf(who, scope, sid) {
      return NS + who + ':' + (scope === 'global' ? 'g' : 's:' + sid);
    }

    /** 解析存储条目；兼容 v1 的纯 data URL。 */
    function parseEntry(raw) {
      if (!raw) return null;
      if (raw.charAt(0) === '{') {
        try {
          const o = JSON.parse(raw);
          if (o && (o.kind === 'baked' || o.kind === 'live')) return o;
        } catch (e) {
          return null;
        }
      }
      if (raw.indexOf('data:image/') === 0) return { kind: 'baked', src: raw };
      return null;
    }

    /** 读取指定范围的条目，含 v1 兼容。 */
    function readEntry(who, scope, sid) {
      const direct = parseEntry(readStore(keyOf(who, scope, sid)));
      if (direct) return direct;
      // v1 兼容：user 曾为全局、agent 曾为按会话
      if (who === 'user' && scope === 'global') return parseEntry(readStore('dsh-avatar:v1:user'));
      if (who === 'agent' && scope === 'session' && sid) {
        return parseEntry(readStore('dsh-avatar:v1:agent:' + sid));
      }
      return null;
    }

    /** 组装可用的 CSS background 值。 */
    function bgOf(entry, fallbackUrl) {
      if (entry && entry.kind === 'live' && entry.bg) return entry.bg;
      if (entry && entry.src) return 'url("' + entry.src + '") center/cover no-repeat';
      return 'url("' + fallbackUrl + '") center/cover no-repeat';
    }

    /* --------------------------------- 动图识别 -------------------------------- */

    function u8(buf) {
      return new Uint8Array(buf);
    }
    function ascii(bytes, at, str) {
      for (let i = 0; i < str.length; i++) if (bytes[at + i] !== str.charCodeAt(i)) return false;
      return true;
    }

    /** 判断是否为动图（GIF 多帧 / APNG / 动画 WebP）。 */
    function isAnimated(buf, mime) {
      const b = u8(buf);
      if (mime === 'image/gif') {
        let frames = 0;
        for (let i = 0; i + 1 < b.length; i++) {
          if (b[i] === 0x21 && b[i + 1] === 0xf9) {
            frames++;
            if (frames > 1) return true;
          }
        }
        return false;
      }
      if (mime === 'image/png') {
        // APNG: acTL 块
        for (let i = 0; i + 4 <= b.length; i++) if (ascii(b, i, 'acTL')) return true;
        return false;
      }
      if (mime === 'image/webp') {
        for (let i = 0; i + 4 <= Math.min(b.length, 64); i++) if (ascii(b, i, 'ANIM')) return true;
        return false;
      }
      return false;
    }

    /* --------------------------------- 样式表 ---------------------------------- */

    // 仅依赖语义属性 data-chat-flow-kind / data-chat-turn（非构建期哈希类名）。
    // 头像作为聊天行自身的伪元素、绝对定位 + padding 预留空间，完全不改动宿主行的子元素布局；
    // 伪元素属行自身且行在滚动容器内 → 随行滚动，不会相对行漂移。
    // 显示与否由 JS 标注的 data-dsh-avatar 决定（见 computeAvatarMarks）。
    // 圆角矩形：视口/预览/实际头像统一 25% 圆角，比例一致。
    const CSS = [
      /* 只在被标注的行上预留头像位，避免留白 */
      '[data-dsh-avatar="user"],[data-dsh-avatar="steering"]{position:relative !important;padding-right:' +
        AV +
        'px !important}',
      '[data-dsh-avatar="agent"]{position:relative !important;padding-left:' +
        AV +
        'px !important}',

      /* 圆角矩形头像：分侧声明 content，避免在错误一侧生成空框 */
      '[data-dsh-avatar="agent"]::before,[data-dsh-avatar="user"]::after,[data-dsh-avatar="steering"]::after{content:"" !important;position:absolute !important;top:' +
        TOP +
        'px !important;width:' +
        ROW +
        'px !important;height:' +
        ROW +
        'px !important;border-radius:' +
        RADIUS +
        '% !important;overflow:hidden !important;background-color:#fff !important;background-repeat:no-repeat !important;background-size:cover !important;background-position:center !important;box-shadow:0 0 0 .5px var(--dsw-alias-border-l1,rgba(0,0,0,.1)) !important;cursor:pointer !important}',
      '[data-dsh-avatar="agent"]::before{left:0 !important;background:var(--dsh-avatar-agent-bg,url("' +
        WHALE +
        '") center/cover no-repeat) !important}',
      '[data-dsh-avatar="user"]::after,[data-dsh-avatar="steering"]::after{right:0 !important;background:var(--dsh-avatar-user-bg,url("' +
        PERSON +
        '") center/cover no-repeat) !important}',

      /* 仅当指针真正落在头像上时才高亮（由 JS 标注 data-dsh-avatar-hover） */
      '[data-dsh-avatar-hover]::before,[data-dsh-avatar-hover]::after{box-shadow:0 0 0 2px var(--dsw-alias-brand-primary,rgba(0,0,0,.3)) !important}',

      /* 每次发言只出现一次：本行前一行若仍是 Agent 输出（下一步骤）或工具调用，
         则不重复显示头像 → 一次发言只出现一次，工具调用不产生额外头像。 */
      '[data-dsh-avatar="agent"]+[data-dsh-avatar="agent"]::before{content:none !important}',
      '[data-dsh-avatar="user"]+[data-dsh-avatar="user"]::after{content:none !important}',
      '[data-dsh-avatar="steering"]+[data-dsh-avatar="steering"]::after{content:none !important}',

      /* 宿主容器：不显示时零尺寸；显示开局入口时恢复常规布局 */
      '.dsh-avatar-host{position:absolute !important;width:0 !important;height:0 !important;overflow:visible !important;pointer-events:none !important}',
      '.dsh-avatar-host-open{position:static !important;width:auto !important;height:auto !important;overflow:visible !important;pointer-events:auto !important}',

      /* 开局入口（仅在尚无消息时出现） */
      '.dsh-avatar-open{display:flex;align-items:center;gap:10px;justify-content:center;padding:2px 0 6px;flex-wrap:wrap}',
      '.dsh-avatar-open-label{font-size:12px;color:var(--dsw-alias-label-tertiary,rgba(0,0,0,.45))}',
      '.dsh-avatar-open-btn{display:inline-flex;align-items:center;gap:6px;font:inherit;font-size:12px;padding:4px 10px 4px 4px;border-radius:10px;cursor:pointer;border:1px solid var(--dsw-alias-border-l1,rgba(0,0,0,.1));background:var(--dsw-alias-bg-layer-1,transparent);color:var(--dsw-alias-label-secondary,rgba(0,0,0,.6))}',
      '.dsh-avatar-open-btn:hover{background:var(--dsw-alias-interactive-bg-hover,rgba(0,0,0,.04));color:var(--dsw-alias-label-primary,inherit)}',
      '.dsh-avatar-open-thumb{width:22px;height:22px;border-radius:' +
        RADIUS +
        '%;background-color:#fff;background-repeat:no-repeat;background-size:cover;background-position:center;flex:0 0 auto}',

      /* ---- 裁剪对话框（仅 --dsw-alias-* 令牌） ---- */
      '.dsh-avatar-mask{position:fixed;inset:0;z-index:9999;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,.45);pointer-events:auto;visibility:visible !important}',
      '.dsh-avatar-panel{width:min(560px,92vw);max-height:92vh;overflow:auto;background:var(--dsw-alias-bg-overlay,#fff);color:var(--dsw-alias-label-primary,#111);border-radius:12px;border:1px solid var(--dsw-alias-border-l1,rgba(0,0,0,.1));padding:16px;box-shadow:0 12px 40px rgba(0,0,0,.3)}',
      '.dsh-avatar-h{font-size:14px;font-weight:600;margin:0 0 10px}',
      '.dsh-avatar-seg{display:inline-flex;gap:4px;padding:2px;border-radius:9px;background:var(--dsw-alias-interactive-bg-hover,rgba(0,0,0,.05));margin-bottom:8px}',
      '.dsh-avatar-segbtn{font:inherit;font-size:12px;padding:4px 12px;border-radius:7px;border:none;cursor:pointer;background:transparent;color:var(--dsw-alias-label-secondary,rgba(0,0,0,.6))}',
      '.dsh-avatar-segbtn-on{background:var(--dsw-alias-bg-overlay,#fff);color:var(--dsw-alias-label-primary,#111);box-shadow:0 1px 3px rgba(0,0,0,.12)}',
      '.dsh-avatar-sub{font-size:12px;color:var(--dsw-alias-label-secondary,rgba(0,0,0,.6));margin:0 0 12px}',
      '.dsh-avatar-note{font-size:12px;color:var(--dsw-alias-state-success-primary,#1a7f37);margin-top:8px}',
      '.dsh-avatar-row{display:flex;gap:16px;align-items:flex-start;flex-wrap:wrap}',
      '.dsh-avatar-view{position:relative;width:' +
        VIEW +
        'px;height:' +
        VIEW +
        'px;overflow:hidden;border-radius:' +
        RADIUS +
        '%;background:#000;cursor:grab;touch-action:none;flex:0 0 auto}',
      '.dsh-avatar-view:active{cursor:grabbing}',
      '.dsh-avatar-viewimg{position:absolute;left:50%;top:50%;transform-origin:50% 50%;will-change:transform;user-select:none;-webkit-user-drag:none}',
      '.dsh-avatar-ring{position:absolute;left:0;right:0;top:0;bottom:0;border-radius:' +
        RADIUS +
        '%;pointer-events:none;box-shadow:0 0 0 9999px rgba(0,0,0,.35);border:1px solid rgba(255,255,255,.85)}',
      '.dsh-avatar-prev{display:flex;flex-direction:column;align-items:center;gap:10px}',
      '.dsh-avatar-prevbox{position:relative;width:' +
        PREV +
        'px;height:' +
        PREV +
        'px;border-radius:' +
        RADIUS +
        '%;overflow:hidden;background:#fff;box-shadow:0 0 0 1px var(--dsw-alias-border-l2,rgba(0,0,0,.12))}',
      '.dsh-avatar-previmg{position:absolute;left:50%;top:50%;transform-origin:50% 50%;user-select:none;-webkit-user-drag:none}',
      '.dsh-avatar-cap{font-size:12px;color:var(--dsw-alias-label-secondary,rgba(0,0,0,.6));text-align:center}',
      '.dsh-avatar-slider{width:100%;margin:10px 0}',
      '.dsh-avatar-actions{display:flex;gap:8px;justify-content:flex-end;margin-top:14px;align-items:center}',
      '.dsh-avatar-spacer{flex:1 1 auto}',
      '.dsh-avatar-abtn{font:inherit;font-size:13px;padding:6px 14px;border-radius:8px;cursor:pointer;border:1px solid var(--dsw-alias-border-l2,rgba(0,0,0,.12));background:var(--dsw-alias-bg-layer-1,transparent);color:inherit}',
      /* 主按钮：必须用 button-info-fill（深色主题下为 #4176e6 蓝），
         不能用 brand-primary —— 它在深色主题解析为 #f9fafb（近白），
         配白字会变成白底白字看不见。取色与官方主按钮一致。 */
      '.dsh-avatar-primary{background:var(--dsw-alias-button-info-fill,#4176e6);border-color:transparent;color:#fff}',
      '.dsh-avatar-primary:hover:not(:disabled){background:var(--dsw-alias-button-info-hover,#3462c4)}',
      '.dsh-avatar-primary:disabled{opacity:.45;cursor:default}',
      '.dsh-avatar-err{font-size:12px;color:var(--dsw-alias-state-error-primary,#c0392b);margin-top:8px}',
    ].join('\n');

    /* -------------------------------- 工具函数 --------------------------------- */

    /**
     * 定位本会话的滚动容器：用于按会话写入 CSS 变量，避免多会话同时挂载时串扰。
     * 本组件由会话作用域槽位渲染，因此「自身的祖先」必定属于本会话。
     */
    function findSessionRoot(el) {
      if (!el) return null;
      if (el.closest) {
        const own = el.closest('[data-conversation-scroll]');
        if (own) return own;
      }
      let n = el.parentElement;
      while (n && n.tagName !== 'BODY' && n.tagName !== 'HTML') {
        if (n.querySelector && n.querySelector('[data-chat-flow-kind]')) return n;
        n = n.parentElement;
      }
      return null;
    }

    /** 圆角矩形路径。 */
    function roundRect(ctx, x, y, w, h, r) {
      ctx.beginPath();
      ctx.moveTo(x + r, y);
      ctx.arcTo(x + w, y, x + w, y + h, r);
      ctx.arcTo(x + w, y + h, x, y + h, r);
      ctx.arcTo(x, y + h, x, y, r);
      ctx.arcTo(x, y, x + w, y, r);
      ctx.closePath();
    }

    /**
     * 烘焙静态头像：圆角矩形裁剪，**不做白色填充**（透明背景）。
     * 旧实现先填白再按圆形裁剪，导致 PNG 四角为白 —— 这正是「头像旁白边」的根因。
     */
    function bake(img, ox, oy, k) {
      const s = OUT / VIEW;
      const c = document.createElement('canvas');
      c.width = OUT;
      c.height = OUT;
      const ctx = c.getContext('2d');
      ctx.save();
      roundRect(ctx, 0, 0, OUT, OUT, (OUT * RADIUS) / 100);
      ctx.clip();
      ctx.translate(OUT / 2 + ox * s, OUT / 2 + oy * s);
      ctx.scale(k * s, k * s);
      ctx.drawImage(img, -img.width / 2, -img.height / 2);
      ctx.restore();
      let url = c.toDataURL('image/png');
      if (url.length > MAX_BAKED) {
        // JPEG 无透明通道，此时才需要白底（圆角裁剪保持与 CSS 一致）
        const c2 = document.createElement('canvas');
        c2.width = OUT;
        c2.height = OUT;
        const x2 = c2.getContext('2d');
        x2.fillStyle = '#ffffff';
        x2.fillRect(0, 0, OUT, OUT);
        x2.save();
        roundRect(x2, 0, 0, OUT, OUT, (OUT * RADIUS) / 100);
        x2.clip();
        x2.translate(OUT / 2 + ox * s, OUT / 2 + oy * s);
        x2.scale(k * s, k * s);
        x2.drawImage(img, -img.width / 2, -img.height / 2);
        x2.restore();
        url = c2.toDataURL('image/jpeg', 0.85);
      }
      return url;
    }

    /**
     * 为「动图直存」计算 32px 聊天头像所需的 background 值。
     * 用 CSS 背景承载原图 + 裁切参数，从而保留动画（烘焙会丢帧）。
     */
    function liveBg(src, imgW, imgH, ox, oy, k) {
      const s = ROW / VIEW;
      const w = imgW * k * s;
      const hgt = imgH * k * s;
      const x = ROW / 2 + ox * s - w / 2;
      const y = ROW / 2 + oy * s - hgt / 2;
      return (
        'url("' + src + '") ' + x.toFixed(2) + 'px ' + y.toFixed(2) + 'px / ' +
        w.toFixed(2) + 'px ' + hgt.toFixed(2) + 'px no-repeat'
      );
    }

    /* --------------------------- 头像标注（可单测） --------------------------- */

    /**
     * 计算「哪些行应该显示头像」的纯函数（可被测试脚本直接提取执行）。
     *
     * 为什么需要它：CSS 无法表达「某回合的第一个可见同类行」——
     *   · 相邻兄弟选择器 (+) 只看紧邻的兄弟，遇到 hidden 行或分组嵌套就会误判；
     *   · CSS 没有「前一个兄弟」选择器，也没有跨元素比较属性值的能力。
     * 所以改用显式计算：按 data-chat-turn 分组，每个回合、每一侧只标注第一行。
     *
     * 输入 rows: [{ kind, turn, visible }]
     * 输出：与 rows 等长的数组，元素为 'agent' | 'user' | 'steering' | null
     */
    // @avatar-marks:start
    function computeAvatarMarks(rows) {
      const AGENT = { 'assistant-step': true };
      const USER = { user: true, steering: true };
      const seen = Object.create(null);
      const out = [];
      for (let i = 0; i < rows.length; i++) {
        const r = rows[i];
        if (!r || !r.visible) {
          out.push(null);
          continue;
        }
        const side = AGENT[r.kind] ? 'agent' : USER[r.kind] ? r.kind : null;
        if (!side) {
          out.push(null);
          continue;
        }
        // 同一回合 + 同一侧，只保留第一行；turn 缺失时退化为「按自身独立成组」
        const key = side + '|' + (r.turn === null || r.turn === undefined ? '#' + i : String(r.turn));
        if (seen[key]) {
          out.push(null);
          continue;
        }
        seen[key] = true;
        out.push(side);
      }
      return out;
    }
    // @avatar-marks:end

    // @avatar-scope:start
    /**
     * 作用域优先级：本会话设置优先于全局设置（用户需求 2）。
     * 传入两个条目（可为 null），返回最终生效的条目。
     */
    function resolveAvatar(sessionEntry, globalEntry) {
      if (sessionEntry) return sessionEntry;
      if (globalEntry) return globalEntry;
      return null;
    }
    // @avatar-scope:end

    /* -------------------------------- 裁剪对话框 -------------------------------- */

    function CropDialog(props) {
      const who = props.who;
      const sessionId = props.sessionId;
      const scope = props.scope;
      const onScope = props.onScope;
      const hasOverride = props.hasOverride;
      const onCancel = props.onCancel;
      const onConfirm = props.onConfirm;
      const onClear = props.onClear;

      const [src, setSrc] = useState('');
      const [mime, setMime] = useState('');
      const [animated, setAnimated] = useState(false);
      const [img, setImg] = useState(null);
      const [zoom, setZoom] = useState(1);
      const [off, setOff] = useState(function () {
        return { x: 0, y: 0 };
      });
      const [err, setErr] = useState('');
      const drag = useBox(null);
      const viewEl = useBox(null);

      const base = img ? Math.max(VIEW / img.width, VIEW / img.height) : 1;
      const k = base * zoom;
      const ps = PREV / VIEW;

      useEffect(
        function () {
          if (!src) return undefined;
          const image = new Image();
          image.onload = function () {
            setImg(image);
            setOff({ x: 0, y: 0 });
            setZoom(1);
          };
          image.onerror = function () {
            setErr(DICT.errRead);
          };
          image.src = src;
          return undefined;
        },
        [src]
      );

      // 滚轮缩放（非被动监听以便 preventDefault）
      useEffect(
        function () {
          const el = viewEl.current;
          if (!el) return undefined;
          const onWheel = function (e) {
            if (!img) return;
            e.preventDefault();
            setZoom(function (z) {
              return Math.min(4, Math.max(1, z - e.deltaY * 0.0015));
            });
          };
          el.addEventListener('wheel', onWheel, { passive: false });
          return function () {
            el.removeEventListener('wheel', onWheel);
          };
        },
        [img]
      );

      const onPick = function (e) {
        const file = e.target.files && e.target.files[0];
        if (!file) return;
        const type = (file.type || '').toLowerCase();
        if (!MIME_OK.test(type)) {
          setErr(DICT.errType);
          return;
        }
        setErr('');
        const reader = new FileReader();
        reader.onerror = function () {
          setErr(DICT.errRead);
        };
        reader.onload = function () {
          const buf = reader.result;
          if (!buf) {
            setErr(DICT.errRead);
            return;
          }
          const anim = isAnimated(buf, type);
          if (anim && buf.byteLength > MAX_SRC) {
            setErr(DICT.errAnim);
            return;
          }
          if (!anim && buf.byteLength > MAX_SRC * 4) {
            setErr(DICT.errLarge);
            return;
          }
          // 转 data URL
          const b = new Uint8Array(buf);
          let bin = '';
          const CH = 0x8000;
          for (let i = 0; i < b.length; i += CH) {
            bin += String.fromCharCode.apply(null, b.subarray(i, i + CH));
          }
          const url = 'data:' + type + ';base64,' + window.btoa(bin);
          setMime(type);
          setAnimated(anim);
          setSrc(url);
        };
        reader.readAsArrayBuffer(file);
      };

      const onPointerDown = function (e) {
        if (!img) return;
        drag.current = { x: e.clientX, y: e.clientY, ox: off.x, oy: off.y };
        if (e.currentTarget.setPointerCapture) e.currentTarget.setPointerCapture(e.pointerId);
      };
      const onPointerMove = function (e) {
        const d = drag.current;
        if (!d) return;
        setOff({ x: d.ox + (e.clientX - d.x), y: d.oy + (e.clientY - d.y) });
      };
      const onPointerUp = function () {
        drag.current = null;
      };

      const transform =
        'translate(calc(-50% + ' + off.x + 'px), calc(-50% + ' + off.y + 'px)) scale(' + k + ')';
      const prevTransform =
        'translate(calc(-50% + ' + off.x * ps + 'px), calc(-50% + ' + off.y * ps + 'px)) scale(' + k * ps + ')';

      const doConfirm = function () {
        if (!img) return;
        try {
          if (animated) {
            // 动图：保留原图与裁切参数，用 CSS 背景播放，避免被静态化
            onConfirm({
              kind: 'live',
              src: src,
              bg: liveBg(src, img.width, img.height, off.x, off.y, k),
            });
          } else {
            onConfirm({ kind: 'baked', src: bake(img, off.x, off.y, k) });
          }
        } catch (e) {
          // canvas 被污染或格式不支持：退回直存原图
          try {
            onConfirm({
              kind: 'live',
              src: src,
              bg: liveBg(src, img.width, img.height, off.x, off.y, k),
            });
          } catch (e2) {
            setErr(DICT.errRead);
          }
        }
      };

      const scopeHint =
        who === 'user'
          ? scope === 'global'
            ? DICT.hintGlobalUser
            : DICT.hintSessionUser
          : scope === 'global'
          ? DICT.hintGlobalAgent
          : DICT.hintSessionAgent;

      return h(
        'div',
        {
          className: 'dsh-avatar-mask',
          onMouseDown: function (e) {
            if (e.target === e.currentTarget) onCancel();
          },
        },
        h(
          'div',
          { className: 'dsh-avatar-panel' },
          h('h3', { className: 'dsh-avatar-h' }, who === 'user' ? DICT.userTitle : DICT.agentTitle),

          // 作用域选择：全局 / 本会话
          h(
            'div',
            { className: 'dsh-avatar-seg' },
            h(
              'button',
              {
                className: 'dsh-avatar-segbtn' + (scope === 'global' ? ' dsh-avatar-segbtn-on' : ''),
                onClick: function () {
                  onScope('global');
                },
              },
              DICT.scopeGlobal
            ),
            sessionId &&
              h(
                'button',
                {
                  className: 'dsh-avatar-segbtn' + (scope === 'session' ? ' dsh-avatar-segbtn-on' : ''),
                  onClick: function () {
                    onScope('session');
                  },
                },
                DICT.scopeSession
              )
          ),
          h('div', { className: 'dsh-avatar-sub' }, scopeHint),
          hasOverride && h('div', { className: 'dsh-avatar-sub' }, DICT.overrideOn),

          h('input', {
            type: 'file',
            accept: ACCEPT,
            onChange: onPick,
            style: { display: 'block', marginBottom: 12, fontSize: 12 },
          }),
          h('div', { className: 'dsh-avatar-cap', style: { textAlign: 'left', marginBottom: 10 } }, DICT.cropHint),

          img &&
            h(
              'div',
              { className: 'dsh-avatar-row' },
              h(
                'div',
                {
                  ref: function (el) {
                    viewEl.current = el;
                  },
                  className: 'dsh-avatar-view',
                  onPointerDown: onPointerDown,
                  onPointerMove: onPointerMove,
                  onPointerUp: onPointerUp,
                  onPointerCancel: onPointerUp,
                },
                h('img', {
                  className: 'dsh-avatar-viewimg',
                  src: src,
                  alt: '',
                  style: { transform: transform },
                  draggable: false,
                }),
                h('div', { className: 'dsh-avatar-ring' })
              ),
              h(
                'div',
                { className: 'dsh-avatar-prev', style: { flex: '1 1 140px' } },
                h(
                  'div',
                  { className: 'dsh-avatar-prevbox' },
                  h('img', {
                    className: 'dsh-avatar-previmg',
                    src: src,
                    alt: '',
                    style: { transform: prevTransform },
                    draggable: false,
                  })
                ),
                h('div', { className: 'dsh-avatar-cap' }, DICT.preview),
                h('input', {
                  className: 'dsh-avatar-slider',
                  type: 'range',
                  min: 1,
                  max: 4,
                  step: 0.01,
                  value: zoom,
                  onChange: function (e) {
                    setZoom(Number(e.target.value));
                  },
                  'aria-label': DICT.zoom,
                }),
                animated && h('div', { className: 'dsh-avatar-cap' }, DICT.animNote)
              )
            ),

          err && h('div', { className: 'dsh-avatar-err' }, err),
          h(
            'div',
            { className: 'dsh-avatar-actions' },
            h(
              'button',
              {
                className: 'dsh-avatar-abtn',
                onClick: function () {
                  onClear();
                },
              },
              DICT.clear
            ),
            h('span', { className: 'dsh-avatar-spacer' }),
            h(
              'button',
              {
                className: 'dsh-avatar-abtn',
                onClick: function () {
                  onCancel();
                },
              },
              DICT.cancel
            ),
            h(
              'button',
              {
                className: 'dsh-avatar-abtn dsh-avatar-primary',
                onClick: doConfirm,
                disabled: !img,
              },
              DICT.confirm
            )
          )
        )
      );
    }

    /* -------------------------- 会话宿主（含开局入口） -------------------------- */

    function AvatarHost(props) {
      const sessionId = props.sessionId;

      const [userGlobal, setUserGlobal] = useState(function () {
        return readEntry('user', 'global', null);
      });
      const [userSession, setUserSession] = useState(function () {
        return sessionId ? readEntry('user', 'session', sessionId) : null;
      });
      const [agentGlobal, setAgentGlobal] = useState(function () {
        return readEntry('agent', 'global', null);
      });
      const [agentSession, setAgentSession] = useState(function () {
        return sessionId ? readEntry('agent', 'session', sessionId) : null;
      });

      const [dialog, setDialog] = useState(null); // 'user' | 'agent' | null
      const [scope, setScope] = useState('session');
      const [err, setErr] = useState('');
      const [root, setRoot] = useState(null);
      const [hasRows, setHasRows] = useState(false);
      const [scanned, setScanned] = useState(false);
      const selfEl = useBox(null);
      const openRef = useBox(null);
      const hoverRef = useBox(null);

      // 本会话优先于全局
      const userEff = resolveAvatar(userSession, userGlobal);
      const agentEff = resolveAvatar(agentSession, agentGlobal);

      // 定位会话根（消息行可能晚于本组件渲染，做有限次重试）
      useEffect(function () {
        let raf = 0;
        let tries = 0;
        const find = function () {
          const el = selfEl.current;
          const found = el ? findSessionRoot(el) : null;
          if (found) {
            setRoot(found);
            return;
          }
          if (tries++ < 30) raf = requestAnimationFrame(find);
        };
        find();
        return function () {
          cancelAnimationFrame(raf);
        };
      }, []);

      // 会话切换时重读本会话设置
      useEffect(
        function () {
          setUserSession(sessionId ? readEntry('user', 'session', sessionId) : null);
          setAgentSession(sessionId ? readEntry('agent', 'session', sessionId) : null);
        },
        [sessionId]
      );

      // 标注应当显示头像的行：每回合、每侧只标第一行（见 computeAvatarMarks）。
      // 之所以用 JS 而不是纯 CSS：CSS 没有「前一个兄弟」选择器，无法表达
      // 「某回合的第一个可见同类行」，遇到 hidden 行或分组嵌套会误判。
      useEffect(
        function () {
          if (!root) return undefined;
          let raf = 0;

          const applyMarks = function () {
            const rows = root.querySelectorAll('[data-chat-flow-kind]');
            const list = [];
            const nodes = [];
            for (let i = 0; i < rows.length; i++) {
              const el = rows[i];
              // 只处理真正的行（含 flow-kind 且不是分组容器自身）
              const kind = el.getAttribute('data-chat-flow-kind');
              if (!kind) continue;
              // 可见性只看 hidden 属性（含祖先），不做布局测量
              let visible = true;
              for (let p = el; p; p = p.parentElement) {
                if (p.hasAttribute && p.hasAttribute('hidden')) {
                  visible = false;
                  break;
                }
                if (p === root) break;
              }
              list.push({ kind: kind, turn: el.getAttribute('data-chat-turn'), visible: visible });
              nodes.push(el);
            }
            const marks = computeAvatarMarks(list);
            for (let i = 0; i < nodes.length; i++) {
              const want = marks[i];
              const el = nodes[i];
              if (want) {
                if (el.getAttribute('data-dsh-avatar') !== want) el.setAttribute('data-dsh-avatar', want);
              } else if (el.hasAttribute('data-dsh-avatar')) {
                el.removeAttribute('data-dsh-avatar');
                el.removeAttribute('data-dsh-avatar-hover');
              }
            }
            // 开局入口仅在「已扫描过且确实没有消息行」时出现，
            // 避免首次扫描完成前在已有会话里闪一下入口。
            setHasRows(nodes.length > 0);
            setScanned(true);
          };

          // 宿主会增量插入/折叠行：用 rAF 合并多次变更，避免频繁重排
          const schedule = function () {
            if (raf) return;
            raf = requestAnimationFrame(function () {
              raf = 0;
              applyMarks();
            });
          };

          applyMarks();

          let mo = null;
          if (typeof MutationObserver !== 'undefined') {
            mo = new MutationObserver(schedule);
            mo.observe(root, {
              childList: true,
              subtree: true,
              attributes: true,
              attributeFilter: ['hidden', 'data-chat-flow-kind', 'data-chat-turn'],
            });
          }

          return function () {
            if (raf) cancelAnimationFrame(raf);
            if (mo) mo.disconnect();
            const marked = root.querySelectorAll('[data-dsh-avatar]');
            for (let i = 0; i < marked.length; i++) {
              marked[i].removeAttribute('data-dsh-avatar');
              marked[i].removeAttribute('data-dsh-avatar-hover');
            }
          };
        },
        [root]
      );

      // 写入 CSS 变量（按会话根隔离）
      useEffect(
        function () {
          if (!root) return undefined;
          root.style.setProperty('--dsh-avatar-user-bg', bgOf(userEff, PERSON));
          root.style.setProperty('--dsh-avatar-agent-bg', bgOf(agentEff, WHALE));
          return function () {
            root.style.removeProperty('--dsh-avatar-user-bg');
            root.style.removeProperty('--dsh-avatar-agent-bg');
          };
        },
        [root, userEff, agentEff]
      );

      const openDialog = function (which, forceScope) {
        if (!sessionId) return;
        setErr('');
        setScope(forceScope || (sessionId ? 'session' : 'global'));
        setDialog(which);
      };
      openRef.current = openDialog;

      /** 头像几何命中：返回指针所在的头像元素（未命中返回 null）。 */
      const hitAvatar = function (target, clientX, clientY) {
        if (!target || !target.closest) return null;
        const row = target.closest('[data-dsh-avatar]');
        if (!row || !root || !root.contains(row)) return null;
        const side = row.getAttribute('data-dsh-avatar');
        const r = row.getBoundingClientRect();
        const y = clientY - r.top;
        if (y < TOP - PAD || y > TOP + ROW + PAD) return null;
        if (side === 'agent') {
          const x = clientX - r.left;
          return x >= -PAD && x <= ROW + PAD ? row : null;
        }
        const xr = clientX - (r.left + r.width);
        return xr <= PAD && xr >= -(ROW + PAD) ? row : null;
      };

      /**
       * 点击会话内的头像即可设置。
       * 伪元素不是独立事件目标，因此用委托 + 几何命中判定。
       */
      useEffect(
        function () {
          if (!root) return undefined;
          const onClick = function (e) {
            const row = hitAvatar(e.target, e.clientX, e.clientY);
            if (!row) return;
            const side = row.getAttribute('data-dsh-avatar');
            if (openRef.current) openRef.current(side === 'agent' ? 'agent' : 'user');
          };
          root.addEventListener('click', onClick);
          return function () {
            root.removeEventListener('click', onClick);
          };
        },
        [root]
      );

      /**
       * 悬停高亮：仅当指针真正落在头像矩形内才加 data-dsh-avatar-hover，
       * 而不是整行悬停都高亮（原实现的 :hover 会整行触发）。
       */
      useEffect(
        function () {
          if (!root) return undefined;
          const clear = function () {
            const prev = hoverRef.current;
            if (prev) {
              prev.removeAttribute('data-dsh-avatar-hover');
              hoverRef.current = null;
            }
          };
          const onMove = function (e) {
            const row = hitAvatar(e.target, e.clientX, e.clientY);
            if (row === hoverRef.current) return;
            clear();
            if (row) {
              row.setAttribute('data-dsh-avatar-hover', '');
              hoverRef.current = row;
            }
          };
          root.addEventListener('pointermove', onMove, { passive: true });
          root.addEventListener('pointerleave', clear);
          // 滚动会使头像位置变化，清掉高亮避免残留
          root.addEventListener('scroll', clear, { passive: true });
          return function () {
            root.removeEventListener('pointermove', onMove);
            root.removeEventListener('pointerleave', clear);
            root.removeEventListener('scroll', clear);
            clear();
          };
        },
        [root]
      );

      const save = function (which, next) {
        const key =
          scope === 'global' ? keyOf(which, 'global', null) : keyOf(which, 'session', sessionId);
        const ok = writeStore(key, JSON.stringify(next));
        if (which === 'user') {
          if (scope === 'global') setUserGlobal(next);
          else setUserSession(next);
        } else {
          if (scope === 'global') setAgentGlobal(next);
          else setAgentSession(next);
        }
        if (!ok) setErr(DICT.errSave);
        return ok;
      };

      const clear = function () {
        const key =
          scope === 'global' ? keyOf(dialog, 'global', null) : keyOf(dialog, 'session', sessionId);
        removeStore(key);
        if (dialog === 'user') {
          if (scope === 'global') setUserGlobal(null);
          else setUserSession(null);
        } else {
          if (scope === 'global') setAgentGlobal(null);
          else setAgentSession(null);
        }
        setDialog(null);
      };

      const hasOverride = !!(dialog === 'user' ? userSession : agentSession);

      return h(
        'div',
        {
          className:
            'dsh-avatar-host' +
            (scanned && !hasRows && sessionId && !dialog ? ' dsh-avatar-host-open' : ''),
          ref: function (el) {
            selfEl.current = el;
          },
        },
        // 开局入口：仅在尚无消息行时出现，让新对话一开始就能设置双方头像
        scanned &&
          !hasRows &&
          sessionId &&
          !dialog &&
          h(
            'div',
            { className: 'dsh-avatar-open' },
            h('span', { className: 'dsh-avatar-open-label' }, DICT.emptyTitle),
            h(
              'button',
              {
                className: 'dsh-avatar-open-btn',
                onClick: function () {
                  openDialog('user', 'session');
                },
              },
              h('span', {
                className: 'dsh-avatar-open-thumb',
                style: { background: bgOf(userEff, PERSON) },
              }),
              DICT.userTitle
            ),
            h(
              'button',
              {
                className: 'dsh-avatar-open-btn',
                onClick: function () {
                  openDialog('agent', 'session');
                },
              },
              h('span', {
                className: 'dsh-avatar-open-thumb',
                style: { background: bgOf(agentEff, WHALE) },
              }),
              DICT.agentTitle
            )
          ),
        dialog &&
          h(CropDialog, {
            who: dialog,
            sessionId: sessionId,
            scope: scope,
            onScope: setScope,
            hasOverride: hasOverride,
            errorText: err,
            onCancel: function () {
              setDialog(null);
            },
            onConfirm: function (entry) {
              save(dialog, entry);
              setDialog(null);
            },
            onClear: clear,
          })
      );
    }

    /* --------------------------------- 装配 ------------------------------------ */

    function apply(ctx) {
      // 样式：随本次 Client run 清理（安全探测：styles 可能未提供）
      let disposeStyles = function () {};
      if (typeof styles !== 'undefined' && styles && typeof styles.insert === 'function') {
        disposeStyles = styles.insert(CSS) || disposeStyles;
      } else if (typeof document !== 'undefined' && document.head) {
        const el = document.createElement('style');
        el.textContent = CSS;
        document.head.appendChild(el);
        disposeStyles = function () {
          if (el.parentNode) el.parentNode.removeChild(el);
        };
      }

      // 文案：注册到宿主 locale（ctx.get 在守卫下返回 undefined 而不是抛异常），
      // 失败则回落内置中文。注意不能先读 ctx.locale —— 未 inject 时它会抛异常。
      let disposeLocale = function () {};
      try {
        const loc = ctx.get ? ctx.get('locale') : undefined;
        if (loc && typeof loc.register === 'function') {
          disposeLocale = loc.register('dsh-avatar', { 'zh-CN': DICT }) || disposeLocale;
        }
      } catch (e) {
        disposeLocale = function () {};
      }

      // 会话作用域宿主：挂载裁剪框、写 CSS 变量、开局入口
      const disposeSlot = ctx.slots.inject('conversation.input.dock', function () {
        return ctx.slots.register(
          {
            name: 'conversation.input.dock',
            id: 'dsh-avatar',
            order: 40,
            label: function () {
              return DICT.agentTitle;
            },
          },
          AvatarHost
        );
      });

      return function () {
        if (disposeSlot) disposeSlot();
        disposeLocale();
        disposeStyles();
      };
    }

    return { inject: ['slots'], apply: apply };
  },
});
