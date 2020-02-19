/* globals process, require */

const { crawl, extractDomainName } = require('./utils')

const defaultUrl = 'http://wiprodigital.com/'

/**
 * Web crawler. Loads the content at a given URL and loads the content of any links to other resources that are
 * in the same internet domain.
 *
 * Usage:
 *
 *   node index.js [url]
 *
 * Where
 *   * url  Is an optional uniform resource locator to begin crawling at. If unspecified the default URL,
 *          'http://wiprodigital.com/', will be used.
 */
let url = defaultUrl
if (process.argv.length > 2) {
  url = process.argv[2]
}
console.info(`Starting crawl at "${url}"`)
const domainName = extractDomainName(url)
console.log(`Limiting crawl to the domain "${domainName}"`);
const visitedLinks = {}
crawl(url, domainName, visitedLinks).then(links => {
  console.log('LINKS')
  if (links) {
    for (let link in links) {
      console.log(` ${link}`)
    }
  }
})
