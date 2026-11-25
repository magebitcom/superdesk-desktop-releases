// Lists the releases from the GitHub API, so visitors stay on this site and
// only the file downloads come from GitHub. Test releases are left out unless
// the address ends in ?test.
;(() => {
  const REPO = 'magebitcom/superdesk-desktop-releases'
  const API = `https://api.github.com/repos/${REPO}/releases?per_page=100`
  const CACHE_KEY = 'superdesk-versions:v1'
  const CACHE_MS = 10 * 60 * 1000
  const includeTests = new URLSearchParams(location.search).has('test')
  const list = document.getElementById('versions')

  const platforms = [
    { label: 'Windows', kind: 'Installer', match: (name) => name.endsWith('.exe') },
    { label: 'Linux', kind: 'AppImage', match: (name) => name.endsWith('.AppImage') },
  ]

  // Session storage can be blocked, and the page works without it.
  function readCache() {
    try {
      const cached = JSON.parse(sessionStorage.getItem(CACHE_KEY))
      if (cached && Date.now() - cached.at < CACHE_MS) return cached.releases
    } catch {}
    return null
  }

  function writeCache(releases) {
    try {
      sessionStorage.setItem(CACHE_KEY, JSON.stringify({ at: Date.now(), releases }))
    } catch {}
  }

  async function loadReleases() {
    const cached = readCache()
    if (cached) return cached
    const response = await fetch(API, {
      headers: { Accept: 'application/vnd.github.html+json' },
    })
    if (!response.ok) throw new Error(`GitHub answered ${response.status}`)
    const releases = (await response.json())
      .filter((r) => !r.draft)
      .map((r) => ({
        version: r.tag_name.replace(/^v/, ''),
        prerelease: r.prerelease,
        publishedAt: r.published_at,
        notesHtml: r.body_html || '',
        assets: r.assets.map((a) => ({
          name: a.name,
          size: a.size,
          url: a.browser_download_url,
        })),
      }))
    writeCache(releases)
    return releases
  }

  function el(tag, className, text) {
    const node = document.createElement(tag)
    if (className) node.className = className
    if (text !== undefined) node.textContent = text
    return node
  }

  function formatDate(iso) {
    return new Date(iso).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
  }

  function formatSize(bytes) {
    return `${Math.round(bytes / 1024 / 1024)} MB`
  }

  // The workflow's placeholder notes say only the version, so they are left out.
  function hasRealNotes(release) {
    const text = release.notesHtml.replace(/<[^>]*>/g, '').trim()
    return text !== '' && text !== `Superdesk desktop ${release.version}.`
  }

  function renderRelease(release, isLatest) {
    const card = el('section', 'card version')

    const header = el('div', 'version__header')
    header.append(el('h2', 'version__title', `Superdesk ${release.version}`))
    if (isLatest) header.append(el('span', 'badge', 'Latest'))
    if (release.prerelease) header.append(el('span', 'badge badge--muted', 'Test'))
    card.append(header)
    card.append(el('p', 'version__date', formatDate(release.publishedAt)))

    if (hasRealNotes(release)) {
      const notes = el('div', 'version__notes')
      notes.innerHTML = release.notesHtml
      card.append(notes)
    }

    const files = el('div', 'version__files')
    for (const platform of platforms) {
      const asset = release.assets.find(
        (a) => platform.match(a.name) && a.name.includes(release.version),
      )
      if (!asset) continue
      const link = el('a', 'file')
      link.href = asset.url
      const label = el('span', 'file__label')
      const icon = el('span', `os-icon os-icon--${platform.label.toLowerCase()}`)
      icon.setAttribute('aria-hidden', 'true')
      label.append(icon, platform.label)
      link.append(label)
      link.append(el('span', 'file__meta', `${platform.kind} · ${formatSize(asset.size)}`))
      files.append(link)
    }
    card.append(files)
    return card
  }

  function showMessage(text, withFallback) {
    list.replaceChildren()
    const card = el('section', 'card')
    card.append(el('p', 'description', text))
    if (withFallback) {
      const p = el('p', 'links')
      const a = el('a', '', 'See the versions on GitHub instead')
      a.href = `https://github.com/${REPO}/releases`
      p.append(a)
      card.append(p)
    }
    list.append(card)
  }

  list.replaceChildren(el('p', 'status', 'Loading versions…'))

  loadReleases()
    .then((releases) => {
      const shown = releases.filter((r) => includeTests || !r.prerelease)
      if (shown.length === 0) {
        showMessage('No versions have been released yet.', false)
        return
      }
      const latest = shown.find((r) => !r.prerelease)
      list.replaceChildren(...shown.map((r) => renderRelease(r, r === latest)))
    })
    .catch(() => {
      showMessage(
        "The list of versions couldn't be loaded just now. Try again in a minute.",
        true,
      )
    })
})()
