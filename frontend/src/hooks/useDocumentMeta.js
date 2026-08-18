import { useEffect } from 'react'

const DEFAULT_TITLE = 'AutoVerse — Car Intelligence Platform'
const DEFAULT_DESCRIPTION = 'Browse, compare and calculate the true ownership cost of 10,000+ cars across 26 brands in India.'

function upsertMeta(attr, key, content) {
  let el = document.querySelector(`meta[${attr}="${key}"]`)
  if (!el) {
    el = document.createElement('meta')
    el.setAttribute(attr, key)
    document.head.appendChild(el)
  }
  el.setAttribute('content', content)
}

function removeMeta(attr, key) {
  document.querySelector(`meta[${attr}="${key}"]`)?.remove()
}

// Sets the tab title + Open Graph/Twitter tags for the current page,
// restoring site-wide defaults on unmount. Only updates the live DOM -
// link-preview crawlers (WhatsApp, Slack) fetch raw server HTML without
// running JS, so they won't see these until the app is server-rendered.
export default function useDocumentMeta({ title, description, image, url } = {}) {
  useEffect(() => {
    const fullTitle = title ? `${title} | AutoVerse` : DEFAULT_TITLE
    const desc = description || DEFAULT_DESCRIPTION

    document.title = fullTitle
    upsertMeta('name', 'description', desc)
    upsertMeta('property', 'og:title', fullTitle)
    upsertMeta('property', 'og:description', desc)
    upsertMeta('property', 'og:type', image ? 'product' : 'website')
    upsertMeta('property', 'og:url', url || window.location.href)
    upsertMeta('name', 'twitter:card', image ? 'summary_large_image' : 'summary')
    upsertMeta('name', 'twitter:title', fullTitle)
    upsertMeta('name', 'twitter:description', desc)
    if (image) {
      upsertMeta('property', 'og:image', image)
      upsertMeta('name', 'twitter:image', image)
    } else {
      removeMeta('property', 'og:image')
      removeMeta('name', 'twitter:image')
    }

    return () => {
      document.title = DEFAULT_TITLE
      upsertMeta('name', 'description', DEFAULT_DESCRIPTION)
      upsertMeta('property', 'og:title', DEFAULT_TITLE)
      upsertMeta('property', 'og:description', DEFAULT_DESCRIPTION)
      upsertMeta('property', 'og:type', 'website')
      upsertMeta('property', 'og:url', window.location.origin)
      upsertMeta('name', 'twitter:card', 'summary')
      upsertMeta('name', 'twitter:title', DEFAULT_TITLE)
      upsertMeta('name', 'twitter:description', DEFAULT_DESCRIPTION)
      removeMeta('property', 'og:image')
      removeMeta('name', 'twitter:image')
    }
  }, [title, description, image, url])
}
