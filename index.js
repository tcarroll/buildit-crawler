/* globals process, require, URL */

const http = require('http')
const https = require('https')

const extractDomainName = url => {
  let domainName = ''
  const hostname = new URL(url).hostname
  if (hostname) {
    const components = hostname.split('.')
    domainName = components.slice(-2).join('.')
  }
  return domainName
}

/**
 * Handles an HTTP redirect (HTTP code 301) to fetch content at the redirect's location.
 * @param {string} location  URL to redirect to.
 * @param {Function} fetch   Function to retrieve content at given url.
 * @returns {Promise<*>}
 */
const handleRedirect = async (location, fetch) => {
  console.info(`Redirected to: ${location}`)
  if (location && (typeof fetch === 'function')) {
    return fetch(location)
  }
}

const fetchUrl = async (url) => {
  const protocol = (url.indexOf('https') >= 0) ? https : http
  return new Promise((resolve, reject) => {
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
        throw(`An error occurred. HTTP status code: ${statusCode}. HTTP status message: ${statusMessage}`)
      }
    })
  })
}

const findLinks = markup => {
  let links = []
  console.log('-----------------------------------')
  let i = markup.indexOf('href')
  let left = 0
  let leftQuote
  let rightQuote
  do {
    if (i === -1) {
      break;
    } else {
      while (markup.charAt(left + i++) !== '=')
      for (let j = left + i; j < markup.length; j++) {
        const c = markup.charAt(j)
        if (c === '\'') {
          leftQuote = j
          rightQuote = markup.slice(j + 1).indexOf('\'')
          break
        } else if (c === '\"') {
          leftQuote = j
          rightQuote = markup.slice(j + 1).indexOf('\"')
          break
        }
      }
      console.log(`Found href: "${markup.slice(leftQuote + 1, leftQuote + 1 + rightQuote)}"`)
      left += i + rightQuote + 1
      i = markup.slice(left).indexOf('href')
    }
  } while (left < markup.length)
  console.log('===================================')
  return links
}

const crawl = async (url, domain, visitedLinks) => {
  try {
    const page = await fetchUrl(url)
    const links = findLinks(page)
    links.forEach(link => {
      if (!visitedLinks.hasOwnProperty(link)) {
        console.info(`Found link '${link}'`)
        if (link.indexOf(domainName) !== -1) {
          crawl(link, domain, visitedLinks)
        }
      }
    })
  } catch (exception) {
    console.error(exception)
  }
}

let url = 'http://wiprodigital.com/'
if (process.argv.length > 2) {
  url = process.argv[2]
}
console.info(`Starting crawl at "${url}"`)
const domainName = extractDomainName(url)
console.info(`Limiting crawl to the domain "${domainName}"`)
const visitedLinks = {}
crawl(url, domainName, visitedLinks)
