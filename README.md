# Ember-phoenix [![Build Status](https://travis-ci.org/mike-north/ember-phoenix.svg?branch=master)](https://travis-ci.org/mike-north/ember-phoenix) [![Ember Observer Score](https://emberobserver.com/badges/ember-phoenix.svg)](https://emberobserver.com/addons/ember-phoenix) [![npm version](https://badge.fury.io/js/ember-phoenix.svg)](https://badge.fury.io/js/ember-phoenix)

[![Greenkeeper badge](https://badges.greenkeeper.io/mike-north/ember-phoenix.svg)](https://greenkeeper.io/)

## Installation

```
ember install ember-phoenix
```

## Low-Level Use

You can import phoenix framework client-side utilities as an ES6 module

```js
import { Socket } from 'phoenix';

let socket = new Socket('/socket', {
  logger: ((kind, msg, data) => {
    console.log(`${kind}: ${msg}`, data);
  })
});
```

## Recommended Use

Build a service around a socket (you will usually have only one, since phoenix multiplexes for you)

```js

import PhoenixSocket from 'phoenix/services/phoenix-socket';

export default PhoenixSocket.extend({
  
  init() {
    // You may listen to open, "close" and "error"
    this.on('open', () => {
      console.log('Socket was opened!');
    })
  },
  
  connect(/*url, options*/) {
    const myjwt = "abacnwih12eh12...";
    // connect the socket
    this._super("wss://myhost.com/socket/mysocket", {
      params: {token: myjwt}
    });

    // join a channel
    const channel = this.joinChannel("room:123", {
      nickname: "Mike"
    });

    // add message handlers
    channel.on("notification", () => _onNotification(...arguments));
  },

  _onNotification(message) {
    alert(`Notification: ${message}`);
  }
});
```

## Contributing

* `git clone` this repository
* `npm install`
* `bower install`

## Running

* `ember server`
* Visit your app at http://localhost:4200.

## Running Tests

* `npm test` (Runs `ember try:testall` to test your addon against multiple Ember versions)
* `ember test`
* `ember test --server`

## Building

* `ember build`

For more information on using ember-cli, visit [http://www.ember-cli.com/](http://www.ember-cli.com/).

## Copyright

(c) 2016 Levanto Financial
