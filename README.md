Google My Business
==============

NodeJS driver for the GMB API.

## Installation

`npm install google_my_business`

## How it works

### Get

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

### Post

```js
var GMB = require('google_my_business')

var postData =    {
    "storeCode": "GOOG-SYD",
    "locationName": "Google Uttam Nagar",
    "primaryPhone": "(02) 1234 5678",
    "address": {
      "addressLines": [
        "Level 5",
        "48 Pirrama Road"
      ],
      "locality": "Pyrmont",
      "postalCode": "2009",
      "administrativeArea": "NSW",
      "country": "AU"
    },
    "latlng": {
      "latitude": -33.869546, 
      "longitude": 151.194540
    },
    "websiteUrl": "https://www.google.com.au/",
    "primaryCategory": {
      "name": "Software Company", 
      "categoryId": "gcid:software_company"
    },
    "regularHours": {
      "periods": [
        {
          "openDay": "SUNDAY",
          "closeDay": "SUNDAY",
          "openTime": "10:00",
          "closeTime": "22:00"
        },
        {
          "openDay": "MONDAY",
          "closeDay": "MONDAY",
          "openTime": "10:00",
          "closeTime": "22:00"
        },
        {
          "openDay": "TUESDAY",
          "closeDay": "TUESDAY",
          "openTime": "10:00",
          "closeTime": "22:00"
        },
        {
          "openDay": "WEDNESDAY",
          "closeDay": "WEDNESDAY",
          "openTime": "10:00",
          "closeTime": "22:00"
        },
        {
          "openDay": "THURSDAY",
          "closeDay": "THURSDAY",
          "openTime": "10:00",
          "closeTime": "22:00"
        },
        {
          "openDay": "FRIDAY",
          "closeDay": "FRIDAY",
          "openTime": "10:00",
          "closeTime": "22:00"
        },
        {
          "openDay": "SATURDAY",
          "closeDay": "SATURDAY",
          "openTime": "10:00",
          "closeTime": "22:00"
        }
      ]
    }  
};

GMB.options({version: 'v3'});
GMB.setAccessToken('access_token');
GMB.api(
  'accounts/XXXXXXXXXXXXXXXXXXXXX/locations?languageCode=en&validateOnly=true&requestId=da822c46-ce15-4aaf-b385-59860ea75eb4',
  'post',
  postData,
  function(res) { 
    if(!res || res.error) {
      console.log(!res ? 'error occurred' : res.error);
      return;
    }
    console.log(res);
  }
);

```

## More infos

* You can find more informations on the [Google My Business developer](https://developers.google.com/oauthplayground/) website.
* You can find more informations on the [YouTube.COM](https://www.youtube.com/watch?v=9FJRjY-Q_6A) website.
* If you have any questions or remark, feel free to contact us at `prashant7july@gmail.com`

## License

Distributed under the MIT License.

