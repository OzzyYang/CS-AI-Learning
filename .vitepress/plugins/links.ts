import type MarkdownIt from 'markdown-it'

const EXTERNAL = /^(?:[a-z][a-z0-9+.-]*:|\/\/|#)/i

/**
 * cleanUrls: false 时，把无扩展名的站内页面链接补成 .html，
 * 保证构建产物在任意静态服务器（含 NAS）上可直接访问。
 */
export function toPageHref(href: string) {
  if (!href || EXTERNAL.test(href)) return href

  const matched = /^([^?#]*)([?#].*)?$/.exec(href)
  if (!matched) return href

  let pathname = matched[1]
  const suffix = matched[2] ?? ''

  if (pathname.endsWith('.md')) {
    pathname = `${pathname.slice(0, -3)}.html`
  } else if (
    pathname.startsWith('/') &&
    !pathname.endsWith('/') &&
    !/\.[a-z0-9]+$/i.test(pathname)
  ) {
    pathname = `${pathname}.html`
  }

  return pathname + suffix
}

export function staticLinks(md: MarkdownIt) {
  const defaultRender = md.renderer.rules.link_open

  md.renderer.rules.link_open = (tokens, idx, options, env, self) => {
    const token = tokens[idx]
    const hrefIndex = token.attrIndex('href')
    if (hrefIndex >= 0 && token.attrs) {
      token.attrs[hrefIndex][1] = toPageHref(token.attrs[hrefIndex][1])
    }
    return defaultRender
      ? defaultRender(tokens, idx, options, env, self)
      : self.renderToken(tokens, idx, options)
  }
}
