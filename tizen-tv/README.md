# NM7 TV — Samsung Tizen Remote Navigation

This folder is the TV-only input shell for NM7 TV Web.

## Why this exists

Samsung TV Browser can run the NM7 Web UI, but Browser Pointer Mode is controlled by the browser itself. A normal web page cannot call the Tizen TV Input Device API or disable the pointing device. Samsung documents the supported approach for a packaged Tizen Web App:

- `<tizen:setting pointing-device-support="disable"/>`
- `tizen.tvinputdevice.registerKey("ArrowLeft" ...)`

The shell therefore disables the system pointer, captures the six mandatory navigation keys, and forwards them to the existing NM7 Web UI through `postMessage`.

## Project files

- `config.xml` — Samsung TV Web App configuration.
- `index.html` — full-screen host with a remote-key capture surface.
- `tizen.js` — registers D-pad/Enter/Back and forwards commands to NM7 Web.
- `icon.svg` — app icon.

## URL override

The default target is the current Cloudflare test deployment. A different NM7 Web URL can be supplied as a query parameter:

`index.html?url=https%3A%2F%2Fexample.com%2F`

## Build

A Tizen Web package is a `.wgt` archive. Tizen Studio/CLI can build it with:

`tizen build-web -- tizen-tv`

Then package/sign it using a certificate profile:

`tizen package -t wgt -s <profile> -- tizen-tv/.buildResult`

Samsung requires a valid signed package for installation on a TV.

## Install/test

Enable Developer Mode on the Samsung TV, connect it with Tizen Studio/sdb, then install the signed `.wgt`. The application should start without the browser-style pointer and the Samsung remote arrows should move the NM7 focus directly.

## Important

The standard NM7 Web URL remains the PC/browser version. This Tizen shell is the TV-specific input layer; it does not change the playlist or player implementation.
