/* global require */

const { extractDomainName } = require('../utils')
const test = require('tap').test

test('Extract domain name works', t => {
  t.equals(extractDomainName('https://www.wiprodigital.com'), 'wiprodigital.com')
  t.end()
})

test('Extract domain can\'t parse out domain name.', t => {
  t.equals(extractDomainName('//s.w.org'), '')
  t.end()
})
