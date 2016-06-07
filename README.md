Google My Business
==============

NodeJS driver for the GMB API.

## Installation

`npm install google_my_business`

## How it works

```js
var GMB = require('google_my_business')

GMB.options({version: 'v3'});
GMB.setAccessToken('access_token');
GMB.api('accounts', 'get', {}, function (res) {
  if(!res || res.error) {
    console.log(!res ? 'error occurred' : res.error);
    return;
  }
  console.log(res);
});
```

## More infos

* You can find more informations on the [Google My Business developer](https://developers.google.com/oauthplayground/) website.
* You can find more informations on the [YouTube.COM](https://www.youtube.com/watch?v=9FJRjY-Q_6A) website.
* If you have any questions or remark, feel free to contact us at `prashant7july@gmail.com`

## License

Distributed under the MIT License.

