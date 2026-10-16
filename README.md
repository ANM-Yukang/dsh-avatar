# dsh-avatar — DSH 聊天头像插件

**中文** | [English](#english)

给 DeepSeek Harness 的聊天界面加上**自定义头像**：你的消息右侧显示你的头像，Agent 的每次发言左侧显示 Agent 头像，就像微信 / QQ 一样。

- **圆角矩形头像**，上传图片后可拖动、缩放裁剪，右侧**实时预览最终效果**
- **用户头像**在消息**右侧**，**Agent 头像**在发言**左侧**，随行滚动**不漂移**
- **每次 Agent 发言只显示一次头像**；工具调用**不会**重复出现头像
- 用户与 Agent 都支持「**全局**」与「**本会话**」，**本会话优先于全局**
- 新会话默认使用 **DSH 官方黑色鲸鱼**图标
- **点击头像即可设置**，界面上没有多余的常驻按钮
- 支持 **GIF / APNG / 动态 WebP 动图**（保留动画）
- **不替换官方界面**：官方气泡、Markdown、附件、操作按钮全部原样保留

---

## 安装方法

### 方式 0：让 Agent 帮你装（最简单）

把下面这段话连同仓库地址一起发给你的 DSH Agent：

```text
请帮我安装这个 DSH 插件：<仓库地址>
用 plugin_manager 的 install_bundle，target 指向本地仓库目录的绝对路径。
安装后确认 application 是 applied，并告诉我需要刷新页面。
```

Agent 会自己完成克隆与安装。装完**按 `Ctrl+R` 刷新页面**即可。

### 方式 1：插件管理器

1. 把仓库克隆或下载到任意位置（**不要**放进 `$DSH_HOME` 里面）。
2. Harness → **设置 → 插件** → 安装本地插件，选择**仓库根目录**（含 `package.json` 那一层）的绝对路径。
3. 看到 `application: applied` 即成功，然后**刷新页面**。

### 方式 2：手动链接（进阶）

```bash
# Windows（管理员或开启开发者模式）
mklink /D "%USERPROFILE%\.dsh\profiles\desktop\node_modules\dsh-avatar" "C:\path\to\repo"
# macOS / Linux
ln -s /path/to/repo ~/.dsh/profiles/desktop/node_modules/dsh-avatar
```

再把 `"dsh-avatar"` 加入 `~/.dsh/profiles/desktop/package.json` 的 `dsh.profile.bundles`，重启 Harness。

> 推荐用方式 0 或 1，它们会自动处理清单与链接。

---

## 使用方法

| 想做什么 | 怎么做 |
| --- | --- |
| 设置**自己的头像** | 点击**自己消息右侧**的头像 |
| 设置 **Agent 头像** | 点击 **Agent 发言左侧**的头像 |
| 设为**全局** | 弹窗里选「全局」 |
| 设为**仅本会话** | 弹窗里选「本会话」 |
| 新会话开局就设置 | 会话还没有消息时，输入框上方会出现入口 |
| 恢复默认 | 弹窗里点「清除此范围」 |

裁剪时**拖动**移动、**滚轮或滑块**缩放，右侧实时显示最终效果。

**优先级**：本会话设置 → 全局设置 → 默认图（Agent 为官方鲸鱼）。

**格式**：PNG / JPEG / WebP / GIF / BMP / AVIF / SVG；动图保留动画。

---

## 数据位置

全部存在浏览器 `localStorage`，**不写入会话日志**：

```
dsh-avatar:v2:user:g          你的头像（全局）
dsh-avatar:v2:user:s:<会话ID>  你的头像（本会话）
dsh-avatar:v2:agent:g         Agent 头像（全局）
dsh-avatar:v2:agent:s:<会话ID> Agent 头像（本会话）
```

静态图压缩到 256×256（≤192 KB）；动图保留原图以维持动画（≤1.2 MB）。

---

## 卸载

设置 → 插件 → 禁用或移除 `dsh-avatar`。

> 不要手动编辑 profile 的 `package.json` 或 `cordis.yml`。

---

## 开发

```bash
node test/marks.test.js   # 20 passed —— 头像显示判定 / 作用域优先级 / 动图识别
node test/css.test.js     # 28 passed —— 生成样式与源码断言
```

测试直接从 `client.js` 提取被测纯函数执行，测的就是实际发布的实现。

### 实现要点

- 头像作为聊天行**自身的伪元素**绝对定位，用 `padding` 预留空间，不改动宿主行的子元素布局 → 随行滚动不漂移。
- 「每次发言只显示一次」由纯函数 `computeAvatarMarks` 按 `data-chat-turn` 分组计算，每回合每侧只标注第一行。
- **不注册** `conversation.chat.node` 的任何键，因此**不替换官方渲染器**。
- 官方鲸鱼路径内嵌为常量，不 `require` 任何 `@deepseek-ai/dsh-client-*` 包。

---

## 许可

MIT

---

# English

## dsh-avatar — Custom Chat Avatars for DeepSeek Harness

Adds **custom avatars** to the DeepSeek Harness chat: your avatar on the right of your messages, the agent's avatar on the left of every agent reply — just like WeChat or QQ.

- **Rounded-rectangle avatars**; upload an image, then drag and zoom to crop with a **live preview** of the final result
- **Your avatar** sits to the **right** of your messages; the **agent avatar** to the **left** of its replies
- Avatars **scroll with their own message row** — they never drift
- **One avatar per agent reply**; tool calls **never** add extra avatars
- Both your avatar and the agent avatar support **Global** and **This session**, with the session scope taking priority
- New sessions default to the **official DSH black whale** icon
- **Click an avatar to change it** — no extra persistent buttons in the UI
- Supports **GIF / APNG / animated WebP** (animation preserved)
- **Does not replace the official UI**: bubbles, Markdown, attachments and action buttons are untouched

---

## Installation

### Option 0: let an agent install it (easiest)

Send this to your DSH agent, together with the repository URL:

```text
Please install this DSH plugin: <repo URL>
Use plugin_manager install_bundle with target set to the absolute path of the local repo directory.
Afterwards confirm application is "applied" and tell me to reload the page.
```

The agent handles cloning and installation. Then press **Ctrl+R** to reload.

### Option 1: Plugin manager

1. Clone or download the repo anywhere (**not** inside `$DSH_HOME`).
2. Harness → **Settings → Plugins** → install a local plugin, and pick the **repository root** (the folder containing `package.json`).
3. Wait for `application: applied`, then **reload the page**.

### Option 2: Manual symlink (advanced)

```bash
# Windows (administrator or developer mode)
mklink /D "%USERPROFILE%\.dsh\profiles\desktop\node_modules\dsh-avatar" "C:\path\to\repo"
# macOS / Linux
ln -s /path/to/repo ~/.dsh/profiles/desktop/node_modules/dsh-avatar
```

Then add `"dsh-avatar"` to `dsh.profile.bundles` in `~/.dsh/profiles/desktop/package.json` and restart Harness.

> Options 0 and 1 handle the manifest and linking for you.

---

## Usage

| Goal | How |
| --- | --- |
| Set **your avatar** | Click the avatar on the **right of your own message** |
| Set the **agent avatar** | Click the avatar on the **left of an agent reply** |
| Make it **global** | Choose "Global" in the dialog |
| Make it **session-only** | Choose "This session" in the dialog |
| Set both at the start | With no messages yet, an entry appears above the composer |
| Restore the default | Click "Clear this scope" in the dialog |

While cropping, **drag** to move and use the **wheel or slider** to zoom; the final result is previewed live on the right.

**Priority**: session setting → global setting → default image (the official whale for the agent).

**Formats**: PNG / JPEG / WebP / GIF / BMP / AVIF / SVG; animations keep playing.

---

## Where data is stored

Everything lives in browser `localStorage` and is **never written to the session log**:

```
dsh-avatar:v2:user:g          your avatar (global)
dsh-avatar:v2:user:s:<id>     your avatar (this session)
dsh-avatar:v2:agent:g         agent avatar (global)
dsh-avatar:v2:agent:s:<id>    agent avatar (this session)
```

Static images are downscaled to 256×256 (≤192 KB); animated images keep their original bytes to preserve animation (≤1.2 MB).

---

## Uninstall

Settings → Plugins → disable or remove `dsh-avatar`.

> Do not hand-edit the profile's `package.json` or `cordis.yml`.

---

## Development

```bash
node test/marks.test.js   # 20 passed — avatar marking / scope priority / animation detection
node test/css.test.js     # 28 passed — generated stylesheet and source assertions
```

Tests extract the pure functions straight out of `client.js`, so they exercise exactly what ships.

### Implementation notes

- Avatars are absolutely-positioned **pseudo-elements of the chat row itself**, with `padding` reserving their space, so the host row's child layout is untouched → they scroll with the row and never drift.
- "One avatar per reply" is computed by the pure function `computeAvatarMarks`, which groups by `data-chat-turn` and marks only the first row per side per turn.
- The plugin registers **no** `conversation.chat.node` key, so it **never replaces a shipped renderer**.
- The official whale path is embedded as a constant; no `@deepseek-ai/dsh-client-*` package is required.

---

## License

MIT
