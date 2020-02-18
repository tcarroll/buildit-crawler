/* globals process, require, URL */

const http = require('http')
const https = require('https')

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
 * Handles an HTTP redirect (HTTP code 301) to fetch content at the redirect's location.
 * @param {string} location  URL to redirect to.
 * @param {Function} fetch   Function to retrieve content at given url.
 * @returns {Promise<*>}
 */
const handleRedirect = (location, fetch) => {
  console.log('handleRedirect')
  return new Promise((resolve, reject) => {
    if (location && (typeof fetch === 'function')) {
      resolve(fetchUrl(location))
    } else {
      reject()
    }
  }).catch(exception => {
  })
}

const fetchUrl = (url) => {
  console.log(`fetchUrl: url="${url}"`)
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
  })
}

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

const crawl = (url, domain, visitedLinks) => {
  console.log(`crawl: url="${url}"`)
  return new Promise((resolve, reject) => {
    fetchUrl(url).then(page => {
      if (page) {
        const links = findLinks(page)
        links.forEach(link => {
          if (!visitedLinks[link]) {
            visitedLinks[link] = true
            if (extractDomainName(link) === domainName) {
              resolve(crawl(link, domain, visitedLinks))
            }
          }
        })
      }
    })
  }).catch (exception => {
  })
}

let url = 'http://wiprodigital.com/'
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
