/* globals exports, require */

const http = require('http')
const https = require('https')

/**
 * Returns a given URL's domain name.
 * @param {string} url  A Uniform Resource Locator (URL)
 * @returns {string} The given resources's domain name or the empty string if the domain name cannot be determined.
 */
const extractDomainName = url => {
  let domainName = ''
  try {
    const { hostname, protocol } = new URL(url)
    if (protocol && hostname) {
      const components = hostname.split('.')
      domainName = components.slice(-2).join('.')
    }
  } catch (exception) {
    console.warn(`Could not determine domain name for the url "${url}"`)
  }
  return domainName
}

/**
 * Asynchronously handles an HTTP redirect (HTTP code 301) to fetch content at the redirect's location.
 * @param {string} location  URL to redirect to.
 * @param {Function} fetch   Function to retrieve content at given url.
 * @returns {Promise<*>}
 */
const handleRedirect = (location, fetch) => {
  return new Promise((resolve, reject) => {
    if (location && (typeof fetch === 'function')) {
      resolve(fetchUrl(location))
    } else {
      reject()
    }
  }).catch(exception => {
    console.debug(exception)
  })
}

/**
 * Asynchronously retrieves the content stored at the given URL.
 * @param {string} url  A Uniform Resource Locator.
 * @returns {Promise<string>} Returns the data stored at the given URL.
 */
const fetchUrl = (url) => {
  return new Promise((resolve, reject) => {
    const protocol = (url.indexOf('https') >= 0) ? https : http
    protocol.get(url, response => {
      const { statusCode, statusMessage } = response
      if (statusCode === 200) {
        let data = ''
        response.on('data', chunk => {
          data += chunk
        })
        response.on('end', () => {
          resolve(data)
        })
      } else if (statusCode === 301) {
        if (response.headers.location) {
          resolve(handleRedirect(response.headers.location, fetchUrl))
        }
      } else {
        reject(`An error occurred. HTTP status code: ${statusCode}. HTTP status message: ${statusMessage}`)
      }
    })
  }).catch (exception => {
    console.warn(`Error occurred while fetching the url ${url}.`)
    console.debug(exception)
  })
}

/**
 * Returns the URLs of the hypertext anchors (href attributes) contained within the given HTML.
 * This function does not entirely parse HTML content to find all hyperlinks. It does the following heuristic
 * algorithm:
 *
 *  1) Search for the text 'href',
 *  2) Search to see if that text is followed by an equals sign (=) somewhere in the next 50 characters,
 *  3) Search for a quote (single or double) that follows the equals sign somewhere in the next 100 characters.
 *  It then assumes that the text within the quotes is the href attribute's value.
 *
 * @param {string} markup  Text in HTML format.
 * @returns {[string]}     URLs referenced in the given HTML content.
 */
const findLinks = markup => {
  let links = []
  let i = markup.indexOf('href')
  let left = 0
  let leftQuote
  let rightQuote
  do {
    if (i === -1) {
      break;
    } else {
      let c
      for (c = 4; c < 50; c++) {
        if (markup.charAt(left + i + c) === '=') {
          i += c
          break
        }
      }
      if (c < 50) {
        let j
        for (j = 0; j < 100; j++) {
          const c = markup.charAt(left + i + j)
          if (c === '\'') {
            leftQuote = left + i + j
            rightQuote = markup.slice(left + j + i + 1).indexOf('\'')
            break
          } else if (c === '\"') {
            leftQuote = left + i + j
            rightQuote = markup.slice(left + j + i + 1).indexOf('\"')
            break
          }
        }
        if (j < 100) {
          const link = markup.slice(leftQuote + 1, leftQuote + 1 + rightQuote)
          links.push(link)
          left += i + rightQuote + 1
        } else {
          left += 1
        }
      } else {
        left += 4
      }
      i = markup.slice(left).indexOf('href')
    }
  } while (left < markup.length)
  return links
}

/**
 * Crawls a web page traversing all links from that page that refer to the same domain as the initial page.
 * @param {string} url  A Uniform Resource Locator to star crawling from.
 * @param {string} domain  The top-level Intenet domain to limit crawling to. This crawler does not follow links
 *                         that are not within this domain.
 * @param {Object} visitedLinks  An object whose properties are the URLs this crawler has visited.
 * @returns {Promise<Object>}  The URLs that this crawler has visited.
 */
const crawl = (url, domain, visitedLinks) => {
  return new Promise((resolve, reject) => {
    fetchUrl(url).then(page => {
      if (page) {
        const links = findLinks(page)
        links.forEach(link => {
          if (!visitedLinks[link]) {
            visitedLinks[link] = true
            if (extractDomainName(link) === domain) {
              crawl(link, domain, visitedLinks).then(() => {
                resolve(visitedLinks)
              })
            }
          }
        })
      }
    })
  }).catch (exception => {
    console.warn(exception)
  })
}

exports.extractDomainName = extractDomainName
exports.handleRedirect = handleRedirect
exports.fetchUrl = fetchUrl
exports.findLinks = findLinks
exports.crawl = crawl
