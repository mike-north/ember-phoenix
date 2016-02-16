# Ember-phoenix [![Build Status](https://travis-ci.org/levanto-financial/ember-phoenix.svg?branch=master)](https://travis-ci.org/levanto-financial/ember-phoenix)

## Use

You can import phoenix framework client-side utilities as an ES6 module

```js
import { Socket } from 'phoenix';

let socket = new Socket('/socket', {
  logger: ((kind, msg, data) => {
    console.log(`${kind}: ${msg}`, data);
  })
});
```

## Installation

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
