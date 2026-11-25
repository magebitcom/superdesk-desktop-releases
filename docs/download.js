// Puts the visitor's own system first. Without this script both downloads
// look the same and keep their order.
;(() => {
  const platform = (
    navigator.userAgentData?.platform ||
    navigator.platform ||
    navigator.userAgent
  ).toLowerCase()

  let os = 'other'
  if (platform.includes('win')) os = 'windows'
  else if (platform.includes('mac')) os = 'mac'
  else if (platform.includes('linux') && !/android/.test(navigator.userAgent.toLowerCase()))
    os = 'linux'

  document.documentElement.dataset.os = os
  if (os !== 'windows' && os !== 'linux') return

  const downloads = document.querySelector('.downloads')
  for (const link of downloads.querySelectorAll('.download')) {
    if (link.dataset.os === os) {
      link.classList.add('download--primary')
      downloads.prepend(link)
    }
  }

  const steps = document.querySelector('.steps')
  for (const details of steps.querySelectorAll('details')) {
    if (details.dataset.os === os) steps.querySelector('h2').after(details)
  }
})()
