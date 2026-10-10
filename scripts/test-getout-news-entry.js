#!/usr/bin/env node
'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');

const html = fs.readFileSync('web-tv/index.html', 'utf8');
const activeScript = fs.readFileSync('web-tv/app-safari-policy.js', 'utf8');
const worker = fs.readFileSync('worker.js', 'utf8');
const page = fs.readFileSync('web-tv/ban-tin.html', 'utf8');

assert.ok(html.includes('id="btnNewsTab"'), 'Home screen must render the Bản tin button');
assert.ok(html.includes('app-safari-policy.js?v=20261010-ipad-landscape-menu1&news=20261010'),
  'Home page must load the active player script with a cache-busting query');
assert.ok(activeScript.includes("$('btnNewsTab').addEventListener('click',function(){location.href='/ban-tin.html';});"),
  'The script actually loaded by index.html must bind the home Bản tin button');
assert.ok(activeScript.includes('Bản tin · Highlights / Xem lại'),
  'Side navigation must include Bản tin');
assert.ok(activeScript.includes("if(p===11){location.href='/ban-tin.html';return}"),
  'Selecting Bản tin from the side menu must open the news page');
assert.ok(worker.includes("if(p==='/api/news')return newsResponse(url);"),
  'Worker must route the news API');
assert.ok(worker.includes("return env.ASSETS.fetch(request)"),
  'Worker must serve /ban-tin.html through its configured assets binding');
assert.ok(page.includes('id="btnNewsTab"') === false,
  'News page must stay separate from the home screen');
for (const tab of ['highlights', 'onplus', 'replay']) {
  assert.ok(page.includes('data-source="'+tab+'"'), 'News UI must render provider tab: ' + tab);
}
console.log('GETOUT_NEWS_ENTRY_REGRESSION_OK: home button + side menu + active script + Worker assets');
