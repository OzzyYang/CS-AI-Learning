# AGENTS.md｜CS-AI-Learning 维护规范

本文件面向未来维护本项目的 AI Agent 与人类协作者。目标只有一个：**让 Markdown 始终是唯一知识源，网站可以长期、低成本地积累与演进。**

## 1. 项目定位

- Markdown-first 的个人计算机科学与人工智能学习平台。
- VitePress 负责把 Markdown 构建为静态网站。
- 不使用数据库、后端服务或账号系统。
- 不维护两套内容：Markdown 是源文件，`dist/` 是构建产物，不手动修改。

## 2. 技术栈与目录

| 能力 | 方案 |
| --- | --- |
| 静态站点 | VitePress 1.6 |
| 页面样式 | 原生 CSS（`.vitepress/theme/styles/`） |
| 交互组件 | Vue 3 单文件组件 |
| 流程图 | Mermaid（构建时保留源码，客户端渲染） |
| 数学公式 | KaTeX（`$...$` 与 `$$...$$`） |
| 搜索 | VitePress 本地搜索 + 中文二元分词 |
| 版本管理 | Git（未初始化时按需 `git init`） |
| 部署 | 任意静态 Web 服务 / NAS |

```text
CS-AI-Learning/
├─ 00-培养方案/            四年培养总纲、课程表与模板
├─ 01-大一/                S1/S2 课程目录、年度考核、总览页
├─ 02-大二/ ~ 04-大四/     学年规划（逐年细化）
├─ 知识专题/               跨课程知识单元
├─ 交互实验/               交互式学习页面
├─ 公开课/                 MIT OCW 课程镜像（脚本生成，勿手改）
├─ public/                 静态资源（logo、favicon、独立 SVG 图、ocw/ 镜像素材）
├─ scripts/                链接检查、OCW 抓取等维护脚本
├─ .github/workflows/       GitHub Pages 自动部署工作流
├─ .vitepress/
│  ├─ config.mts           站点配置、导航、搜索、插件
│  ├─ data/content.ts      构建期扫描 Markdown，生成课程/专题数据
│  ├─ plugins/mermaid.ts   Mermaid 代码块渲染规则
│  ├─ plugins/links.ts     静态站内链接规范化（补 .html）
│  └─ theme/               主题、布局、组件与样式
├─ index.md                首页（自定义 layout）
└─ AGENTS.md
```

## 3. 内容维护十条

1. 所有正式知识内容优先以 Markdown 保存，不写进 Vue 组件或 HTML。
2. 一篇知识笔记对应一个 Markdown 文件；课程目录使用 `README.md` 作为课程主页。
3. 复杂图表优先使用 Mermaid；需要精细排版时可使用独立 SVG，放在 `public/` 并以绝对路径引用。
4. 复杂交互功能使用独立 Vue 组件，放在 `.vitepress/theme/components/labs/`，并在 `theme/index.ts` 注册。
5. 所有页面共用统一主题；不要在 Markdown 中写内联样式覆盖全局排版。
6. 新增知识前先搜索现有专题与课程，避免重复内容；重复时优先补充或链接，而不是复制。
7. 修改知识时保留原有有效内容，不因重写而丢失学习记录、链接与考核要求。
8. 新增文件后检查导航、侧边栏与页面内链接；构建会校验死链。
9. 不允许手动修改 `dist/` 中 VitePress 生成的 HTML。
10. 修改全局样式（`.vitepress/theme/styles/`）前，检查首页、课程页、专题页与实验页是否同时受影响。

## 4. 页面类型与 frontmatter

### 课程目录

```text
0X-学年/SX-学期/NN-课程名/README.md
```

- 课程标题、`- 状态：`、`- 学时预算：` 会被构建期扫描，用于首页进度、侧边栏与关联知识。
- 更新状态后重启 `npm run dev` 或重新构建，首页数据才会刷新。
- 不要随意移动课程目录：URL 与培养方案中的顺序直接对应。

### 知识专题

`知识专题/<专题名>.md`：

```yaml
---
title: 计算机网络
description: 一句话说明专题范围。
tag: 网络
level: 核心
order: 1
relatedCourses:
  - 计算机网络
  - 综合实验与复习
---
```

- `relatedCourses` 使用课程标题（去掉 `NN｜` 前缀）或规划课程名称。
- 专题会自动出现在 `/知识专题/`、首页与侧边栏；无需手动登记。
- `order` 控制展示顺序。

### 交互实验

`交互实验/<实验名>.md`：

```yaml
---
title: TCP 三次握手
description: 一句话说明实验目标。
tag: 网络
order: 4
difficulty: 入门
minutes: 10
relatedTopics:
  - 计算机网络
---
```

正文使用已注册的组件标签，例如 `<TcpHandshake />`。组件必须是确定性的（SSR 安全），不要在校验阶段访问 `window` 或生成随机初始值。

## 5. 链接与导航

- 内部链接使用**无扩展名绝对路径**：`[数据结构 I](/01-大一/S1-第一学期/04-数据结构-I/)`。
- 目录索引页（`README.md` / `index.md`）的链接以 `/` 结尾。
- 不要链接不存在的页面；`npm run build` 默认会把死链视为构建失败。
- 侧边栏、导航、首页数据均由 `.vitepress/data/content.ts` 自动生成，不要手工维护第二套目录。
- 规划中的课程只在侧边栏以纯文本出现，不生成链接。

## 6. 样式与组件

- 设计变量集中在 `.vitepress/theme/styles/base.css`；正文排版在 `content.css`；实验外壳在 `lab.css`。
- 优先使用 VitePress 内置容器：`::: tip`、`::: info`、`::: warning`、`::: danger`、`::: details`。
- 重点结论使用 `<div class="key-point">…</div>`，其中可正常写 Markdown 段落。
- 交互组件使用 `.lab` 外壳与 `.lab-btn`、`.lab-field` 等公共类，保持各实验视觉一致。
- 新增全局 CSS 前先确认选择器不会影响首页、侧边栏或暗色模式。

## 7. 常用命令与验收

```bash
npm install          # 安装依赖
npm run dev          # 本地开发，默认 http://localhost:5173/
npm run build        # 构建静态站点到 dist/
npm run preview      # 预览构建产物
npm run check:links  # 检查 dist/ 中的内部链接与锚点
npm run ocw:add -- <MIT OCW 课程链接>   # 新增/更新一门公开课镜像
```

提交前至少完成：

1. `npm run build` 无错误。
2. `npm run check:links` 无死链。
3. 首页、至少一门课程、一个专题、一个实验、搜索与暗色模式可正常访问。
4. `git status` 只包含预期修改。

## 8. 禁止事项

- 不删除、覆盖已有学习笔记与学习记录。
- 不批量替换 Markdown 语法（包括 Obsidian 双链、Callout、嵌入）而不先评估兼容性。
- 不引入数据库、后端服务、账号系统或重型前端框架。
- 不手动编辑 `dist/`、不把构建产物提交到 Git。
- 不在未确认的情况下 `git commit` 或 `git push`。

## 9. 搜索与中文

- 本地搜索使用二元分词（bigram）处理中文，索引在构建时生成。
- 如果搜索结果异常，先检查 `config.mts` 中的 `cjkTokenize` 是否被修改。
- 标题与正文中尽量使用完整术语，提高命中率；搜索会索引标题、各级标题与正文。

## 10. 兼容性说明

- 现有笔记未使用 Obsidian 专有语法；如未来引入，优先转换为标准 Markdown（普通链接、代码块、VitePress 容器）。
- 中文路径与文件名已完整支持；URL 会由浏览器自动编码。
- 默认 `cleanUrls: false`，生成的链接带 `.html`，可被任意静态服务器直接访问。
- 部署到子路径（如 NAS 的 `/cs-ai-learning/`）时，用 `DOCS_BASE=/cs-ai-learning/ npm run build`，或在 `config.mts` 中设置 `base`，并重新构建。

## 11. 公开课镜像（MIT OCW）

`公开课/` 下的页面由 `scripts/ocw/add-course.mjs` 生成，**不要手改**；需要更新时重跑脚本。

```bash
npm run ocw:add -- https://ocw.mit.edu/courses/<slug>/   # 首次抓取（下载官方打包 zip）
npm run ocw:add -- <slug> --from-manifest                # 用已下载清单重建 Markdown，不联网
npm run ocw:add -- <slug> --force                        # 重新下载并清理多余文件
```

- 产出：`公开课/<课程目录>/README.md`（课程主页）、`lecture-NN.md`（讲次页）与 `公开课/README.md`（索引）；
  资源文件落在 `public/ocw/<short-id>/`，清单在 `scripts/ocw/data/<short-id>.json`。
- 视频不落地：由 `OcwVideo` 组件嵌入官方 YouTube（点击后才加载 iframe），同时保留原站 MP4 与原始页面链接。
  组件提供三种站内增强：**网页全屏**（铺满浏览器视口，Esc 或点黑边退出）、**悬浮字幕**
  （读本地 `lecNN-captions.vtt`，经 YouTube IFrame API 取播放时码同步，并自动关闭 YouTube 内置字幕避免叠加）、
  **逐句字幕面板**（默认折叠，展开后当前句高亮并自动滚到面板中央，点任一句可跳转播放）。
  字幕文件随课程包一起下载，脚本会把 `<OcwVideo captions="…">` 自动写进讲次页。
- 许可证：MIT OCW 内容为 CC BY-NC-SA 4.0。每门课页面底部自动生成署名与许可，**不要删除**；
  本站只能用于非商业个人学习，转载需保留署名并以相同方式共享。
- 导航、侧边栏与搜索由 `.vitepress/data/content.ts` 自动发现 `公开课/*/README.md`；frontmatter 的
  `order` 控制索引顺序，`title` 同时用于侧边栏。
- `.py`、`.ipynb` 等源码扩展名不在 VitePress 的资源白名单内，`config.mts` 通过
  `VITE_EXTRA_EXTENSIONS` 扩展；`/ocw/` 前缀的链接由 `npm run check:links` 在构建产物中逐个校验。
  这两处配置不要删除，否则构建会误报死链或给源码链接补上 `.html`。
- 单个课程包通常 50–100 MB。仓库只提交文字与资源文件，`.tmp/ocw/` 里的原始 zip 已在 `.gitignore` 中忽略。
