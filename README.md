# CS-AI-Learning｜个人计算机科学与人工智能四年学习计划

> 版本：V1.0\
> 规划周期：2026-11 至 2030-10\
> 学习预算：每年 320 小时，四年合计 1,280 小时\
> 当前状态：大一课程计划已建立；大二至大四保留规划框架，待后续逐年细化。

## 项目目标

以 Stanford 计算机科学课程体系为 CS 主干，以 MIT 6-4 和 CMU BSAI 为 AI
培养参考，并用清华大学、西安交通大学相关培养方案进行国内对照，建立一套适合在职长期学习的
CS + AI 知识体系。

本计划是经过筛选的自学课程路线，不等同于完成任何大学的本科课程或取得学位。

## 时间约束

- 工作日五天合计：3 小时，可在五天内灵活分配。
- 周末两天合计：4 小时，可在两天内灵活分配。
- 每周理论上限：7 小时。
- 年度目标：320 小时。
- 节假日、旅游及休息日不安排学习，不要求事后补课。
- 年度 320
  小时是计划预算，不是强制打卡指标；如遇工作繁忙，可顺延课程。

## 目录导航

- `00-培养方案/`：四年培养总纲、年度课程表、课程模板和学习记录模板。
- `01-大一/`：已细化的大一 320 小时课程计划。
- `02-大二/`：系统与传统 AI 的规划框架。
- `03-大三/`：机器学习与深度学习的规划框架。
- `04-大四/`：大模型、智能体与 AI 工程的规划框架。

## 使用方法

1. 先阅读 `00-培养方案/四年培养总纲.md`。
2. 按 `00-培养方案/大一课程表.md` 执行，不需要提前展开大二至大四。
3. 每门课程使用统一模板记录笔记、习题、实验和考核。
4. 完成课程后更新课程状态、实际耗时和薄弱知识点。
5. 每学期结束做一次复盘；不因旅游或工作繁忙而机械补课。

## 课程资源说明

课程链接优先指向大学官方课程主页、官方开放课程平台或出版社/开放教材页面。部分课程页面可能对应往年开课版本，使用时应核对当前课程内容、作业与教材版本。不要将课程页面的存在等同于课程仍在当学期开设。

## 静态知识网站

项目已升级为 **Markdown-first + VitePress** 的静态学习网站：知识仍然只保存在各目录的 Markdown 中，VitePress 在构建时自动生成导航、侧边栏、本地搜索索引与静态页面，不维护第二套 HTML。

- 首页：`index.md`
- 知识专题：`知识专题/`
- 交互实验：`交互实验/`
- 站点配置：`.vitepress/config.mts`
- 内容扫描与关联数据：`.vitepress/data/content.ts`
- 统一主题与组件：`.vitepress/theme/`
- 构建产物：`dist/`（已在 `.gitignore` 中忽略，不提交）

### 在线站点

- GitHub Pages：<https://ozzyyang.github.io/CS-AI-Learning/>
- 推送到 `master` 后，由 `.github/workflows/deploy.yml` 自动构建并部署，构建时 base 为 `/CS-AI-Learning/`。
- 也可以手动触发 `Deploy VitePress site to Pages` 工作流。

### 本地开发

环境：Node.js 20+（本项目在 Node 24 下验证）。

```bash
npm install
npm run dev        # 本地开发，默认 http://localhost:5173/
npm run build      # 构建静态站点到 dist/
npm run preview    # 预览构建产物
npm run check:links
```

### 内容维护

完整约定见 [AGENTS.md](./AGENTS.md)。核心原则：

1. 一篇笔记对应一个 Markdown 文件，课程目录使用 `README.md` 作为课程主页。
2. 知识专题与交互实验通过 frontmatter 的 `relatedCourses` / `relatedTopics` 建立关联。
3. 新增专题或实验后，首页、侧边栏与关联知识自动更新；不要手工维护第二套导航。
4. 不修改 `dist/` 中生成的 HTML，所有改动回到 Markdown 或主题源码。

### 部署到 NAS 或静态服务器

1. 在本地执行 `npm run build`。
2. 将 `dist/` 内的全部文件上传到 NAS Web Station、Nginx 或其他静态服务器的站点目录。
3. 默认 `cleanUrls: false`，页面链接带 `.html`；目录页使用 `/.../` 并由服务器返回 `index.html`，不需要 URL 重写。
4. 如果部署在子路径（例如 `http://nas.local/cs-ai-learning/`），用环境变量指定 base 后重新构建：

   ```powershell
   # PowerShell
   $env:DOCS_BASE='/cs-ai-learning/'; npm run build
   ```

   ```bash
   # Bash
   DOCS_BASE=/cs-ai-learning/ npm run build
   ```

   也可以直接在 `.vitepress/config.mts` 中把 `base` 写成 `/cs-ai-learning/`。

5. 站点不依赖数据库、后端服务或账号系统，构建产物可直接托管。
6. 如果 NAS 的静态服务器未正确返回 SVG 的 MIME 类型，请在服务器配置中补充 `.svg → image/svg+xml`，否则部分浏览器可能拒绝显示独立 SVG 图。

参考 Nginx 配置：

```nginx
server {
    listen 80;
    server_name nas.local;
    root /volume1/web/cs-ai-learning;
    index index.html;

    location / {
        try_files $uri $uri/ =404;
    }
}
```

### 当前验证状态

- 原有 19 个 Markdown 学习文件全部保留，课程目录与培养方案未重组。
- `npm run build` 构建成功，产物为 33 个 HTML 页面（含 404 页）。
- `npm run check:links` 检查 1,292 个内部链接与资源，无死链。
- 已用普通静态服务器、无头 Chrome 验证首页、课程页、专题页、实验页、KaTeX、Mermaid 与中文本地搜索。
