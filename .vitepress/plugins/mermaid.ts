import type MarkdownIt from 'markdown-it'

/**
 * 将 ```mermaid 代码块渲染为可被客户端脚本处理的容器。
 * SSR 时保留源码作为无 JavaScript 回退；客户端渲染成功后隐藏源码。
 */
export function mermaidFence(md: MarkdownIt) {
  const defaultFence = md.renderer.rules.fence!

  md.renderer.rules.fence = (tokens, idx, options, env, self) => {
    const token = tokens[idx]
    const language = token.info.trim().split(/\s+/)[0]

    if (language !== 'mermaid') {
      return defaultFence(tokens, idx, options, env, self)
    }

    const code = md.utils.escapeHtml(token.content)
    return [
      '<div class="mermaid-diagram" data-mermaid>',
      `<pre class="mermaid-source"><code>${code}</code></pre>`,
      '<div class="mermaid-canvas" role="img" aria-label="Mermaid 图表"></div>',
      '</div>\n'
    ].join('')
  }
}
