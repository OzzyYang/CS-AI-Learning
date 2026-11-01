import { defineConfig } from 'vitepress'
import { katex } from '@mdit/plugin-katex'
import { buildContent } from './data/content'
import { mermaidFence } from './plugins/mermaid'
import { staticLinks } from './plugins/links'

const content = buildContent()

/**
 * VitePress 内置一份「静态资源扩展名」白名单，命中才会原样输出链接，
 * 否则会被当成页面链接补上 .html。公开课镜像包含 .py / .ipynb 等源码文件，
 * 这里通过官方 Environment Variable 扩展白名单。
 */
process.env.VITE_EXTRA_EXTENSIONS ||= 'py,ipynb,c,cpp,h,hpp,java,jsx,tsx,m,r,pl,sh,rs,go,gitignore'

/**
 * 支持子路径部署，例如：
 * PowerShell: $env:DOCS_BASE='/cs-ai-learning/'; npm run build
 */
const siteBase = process.env.DOCS_BASE || '/'
const basePath = siteBase.endsWith('/') ? siteBase : `${siteBase}/`
const publicAsset = (file: string) => `${basePath}${file.replace(/^\//, '')}`

/**
 * 中文检索分词：把连续汉字切成二元组（bigram），英文/数字按词切分。
 * VitePress 会把 themeConfig 中的函数序列化到客户端，因此这里不能引用外部变量。
 */
function cjkTokenize(text: string): string[] {
  const segments =
    text.toLowerCase().match(/[\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff]+|[a-z0-9_]+/g) || []
  const tokens: string[] = []
  for (const segment of segments) {
    if (/^[\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff]+$/.test(segment)) {
      if (segment.length === 1) tokens.push(segment)
      else for (let i = 0; i < segment.length - 1; i += 1) tokens.push(segment.slice(i, i + 2))
    } else {
      tokens.push(segment)
    }
  }
  return tokens
}

const planDocs = [
  ['四年培养总纲', '/00-培养方案/四年培养总纲'],
  ['大一课程表', '/00-培养方案/大一课程表'],
  ['课程模板', '/00-培养方案/课程模板'],
  ['学习记录模板', '/00-培养方案/学习记录模板'],
  ['课程资源核验清单', '/00-培养方案/课程资源核验清单']
] as const

function yearSidebar(year: (typeof content.years)[number]) {
  const groups: any[] = [
    {
      text: '学年导航',
      items: [
        { text: '四年培养总纲', link: '/00-培养方案/四年培养总纲' },
        ...(year.name === '大一'
          ? [{ text: '大一课程表 · 320 学时', link: '/00-培养方案/大一课程表' }]
          : []),
        { text: `${year.name}总览`, link: year.route },
        ...year.extras.map((extra) => ({ text: extra.label, link: extra.link }))
      ]
    }
  ]

  for (const semester of year.semesters) {
    groups.push({
      text: `${semester.title} · ${semester.hours} 学时`,
      collapsed: false,
      items: semester.courses.map((course) => ({
        text: course.label,
        link: course.route
      }))
    })
  }

  if (year.plannedCourses.length) {
    groups.push({
      text: '规划课程',
      collapsed: false,
      items: year.plannedCourses.map((name) => ({ text: name }))
    })
  }

  groups.push({
    text: '其他学年',
    items: content.years
      .filter((item) => item.id !== year.id)
      .map((item) => ({ text: `${item.name}总览`, link: item.route }))
  })

  return groups
}

const sidebar: Record<string, any> = {
  '/00-培养方案/': [
    {
      text: '培养方案',
      items: planDocs.map(([label, link]) => ({ text: label, link }))
    }
  ],
  '/知识专题/': [
    {
      text: '知识专题',
      items: [
        { text: '专题索引', link: '/知识专题/' },
        ...content.topics.map((topic) => ({ text: topic.title, link: topic.href }))
      ]
    },
    {
      text: '交互实验',
      items: [
        { text: '实验索引', link: '/交互实验/' },
        ...content.labs.map((lab) => ({ text: lab.title, link: lab.href }))
      ]
    }
  ],
  '/交互实验/': [
    {
      text: '交互实验',
      items: [
        { text: '实验索引', link: '/交互实验/' },
        ...content.labs.map((lab) => ({ text: lab.title, link: lab.href }))
      ]
    },
    {
      text: '知识专题',
      items: [
        { text: '专题索引', link: '/知识专题/' },
        ...content.topics.map((topic) => ({ text: topic.title, link: topic.href }))
      ]
    }
  ],
  '/公开课/': [
    {
      text: '公开课镜像',
      items: [
        { text: '镜像索引', link: '/公开课/' },
        ...content.ocw.map((course) => ({ text: course.title, link: course.route }))
      ]
    }
  ]
}

for (const course of content.ocw) {
  sidebar[course.route] = [
    {
      text: '课程导航',
      items: [
        { text: '课程主页', link: course.route },
        { text: '公开课索引', link: '/公开课/' }
      ]
    },
    {
      text: `讲次 · ${course.lectureCount}`,
      collapsed: false,
      items: course.lectures.map((lecture) => ({ text: lecture.label, link: lecture.link }))
    }
  ]
}

for (const year of content.years) {
  sidebar[`/${year.id}/`] = yearSidebar(year)
}

export default defineConfig({
  lang: 'zh-CN',
  title: 'CS-AI-Learning',
  titleTemplate: ':title · CS-AI-Learning',
  description:
    'Markdown-first 的个人计算机科学与人工智能四年学习平台：课程、知识专题与交互实验。',
  base: basePath,
  cleanUrls: false,
  outDir: 'dist',
  cacheDir: '.vitepress/cache',
  srcExclude: ['README.md', 'AGENTS.md', 'scripts/**'],
  /**
   * 公开课镜像里的 .py / .zip 等原始素材不是站点路由，VitePress 的路由级死链检查无法识别。
   * 这些链接由 `npm run check:links` 在构建产物中逐个校验真实文件是否存在，覆盖更完整。
   */
  ignoreDeadLinks: [/^\/ocw\//],
  rewrites: (id) => (id.endsWith('/README.md') ? id.replace(/README\.md$/, 'index.md') : id),
  markdown: {
    image: { lazyLoading: true },
    theme: { light: 'github-light', dark: 'github-dark' },
    config(md) {
      md.use(katex, { delimiters: 'dollars' })
      md.use(mermaidFence)
      md.use(staticLinks)
    }
  },
  vite: {
    server: {
      watch: {
        ignored: [
          '**/.tmp/**',
          '**/.npm-cache/**',
          '**/dist/**',
          '**/.vitepress/cache/**',
          '**/.*.tmpdir/**',
          '**/*.tmp'
        ]
      }
    }
  },
  head: [
    ['link', { rel: 'icon', type: 'image/svg+xml', href: publicAsset('favicon.svg') }],
    ['meta', { name: 'theme-color', content: '#0f766e' }],
    [
      'meta',
      {
        name: 'description',
        content:
          'CS-AI-Learning：Markdown 单一来源、由 VitePress 构建的计算机科学与人工智能四年学习平台。'
      }
    ]
  ],
  themeConfig: {
    logo: '/logo.svg',
    siteTitle: 'CS-AI-Learning',
    nav: [
      {
        text: '培养方案',
        items: planDocs.map(([label, link]) => ({ text: label, link }))
      },
      {
        text: '课程',
        items: content.years.map((year) => ({
          text: year.name,
          link: year.route
        }))
      },
      { text: '公开课', link: '/公开课/' },
      { text: '知识专题', link: '/知识专题/' },
      { text: '交互实验', link: '/交互实验/' }
    ],
    sidebar,
    outline: { level: [2, 3], label: '本页目录' },
    search: {
      provider: 'local',
      options: {
        detailedView: true,
        translations: {
          button: { buttonText: '搜索知识库', buttonAriaLabel: '搜索知识库' },
          modal: {
            displayDetails: '显示详细列表',
            resetButtonTitle: '重置搜索',
            backButtonTitle: '关闭搜索',
            noResultsText: '没有找到相关内容',
            footer: {
              selectText: '选择',
              navigateText: '切换',
              closeText: '关闭'
            }
          }
        },
        miniSearch: {
          options: { tokenize: cjkTokenize },
          searchOptions: {
            fuzzy: 0.1,
            prefix: true,
            boost: { title: 6, titles: 3, text: 1 }
          }
        }
      }
    },
    docFooter: { prev: '上一篇', next: '下一篇' },
    darkModeSwitchLabel: '深色模式',
    sidebarMenuLabel: '菜单',
    returnToTopLabel: '回到顶部',
    skipToContentLabel: '跳到主要内容',
    notFound: {
      title: '页面不存在',
      quote: '这个链接可能已经移动，或者对应内容尚未建立。',
      linkLabel: '返回首页',
      linkText: '回到首页'
    },
    langMenuLabel: '语言',
    externalLinkIcon: true,
    footer: {
      message: 'Markdown-first · 所有知识内容以 Markdown 单一来源维护',
      copyright: '© 2026 CS-AI-Learning · VitePress 静态站点'
    },
    curriculum: content
  }
})



