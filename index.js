'use strict';
var GMB = (function() {
	var 
		request  = require('request'),
		URL      = require('url'),
		QS       = require('querystring'),
		version  = require('./package.json').version,
		api,
		googlemybusiness,
		oauthRequest,
		parseOAuthApiResponse,
		stringifyParams,
		setAccessToken,
		log,
		has,
		options,
		METHODS = ['get', 'post', 'delete', 'put'],
		opts = {
			accessToken: null,
			beta: false,
			version: 'v2.0',
			timeout: null,
			scope:  null,
			redirectUri: null,
			proxy: null,
			userAgent: 'google_my_business/' + version
		};

	/**
	 *
	 * @access public
	 * @param path {String} the url path
	 * @param method {String} the http method (default: `"GET"`)
	 * @param params {Object} the parameters for the query
	 * @param cb {Function} the callback function to handle the response
	 */
	api = function() {
		if ( typeof arguments[0] === 'string' ) {
			googlemybusiness.apply(this, arguments);
		} 
	};

	/**
	 *
	 * Make a api call to google my business client.
	 *
	 * Except the path, all arguments to this function are optiona. So any of
	 * these are valid:
	 *
	 *  GMB.api('/accounts') // throw away the response
	 *  GMB.api('/accounts', function(r) { console.log(r) })
	 *  GMB.api('accounts/accounts/115683801091927416992/locations/17408462555750810870', 'delete', function(r) { console.log(r) } );
	 *  GMB.api(
	 *      'accounts/115683801091927416992/locations?languageCode=en&validateOnly=true&requestId=da822c46-ce15-4aaf-b385-59860ea75eb4',
	 *      'post',
	 *      {	"storeCode": "GOOG-SYD",
  	 *			"locationName": "Google SYDNEY",
  	 *			"primaryPhone": "(02) 1234 5678",
  	 *			...
  	 *			...
 	 *		},
	 *      function(r) { console.log(r) }
	 *  );
	 *
	 */
	googlemybusiness = function() {
		var args = Array.prototype.slice.call(arguments),
			path = args.shift(),
			next = args.shift(),
			method,
			params,
			cb;

		while (next) {
			var type = typeof next;
			if ( type === 'string' && !method ) {
				method = next.toLowerCase();
			} else if ( type === 'function' && !cb ) {
				cb = next;
			} else if ( type === 'object' && !params ) {
				params = next;
			} else {
				log('Invalid argument passed to GMB.api(): ' + next);
				return;
			}
			next = args.shift();
		}

		method = method || 'get';
		params = params || {};

		// remove prefix slash if one is given, as it's already in the base url
		if ( path[0] === '/' ) {
			path = path.substr(1);
		}

		if ( METHODS.indexOf(method) < 0 ) {
			log('Invalid method passed to GMB.api(): ' + method);
			return;
		}

		oauthRequest('googlemybusiness', path, method, params, cb);
	};

	/**
	 * Add the oauth parameter, and fire of a request.
	 *
	 * @access private
	 * @param domain {String}   the domain key, one of 'api', 'api_read',
	 *                          or 'google'
	 * @param path {String}     the request path
	 * @param method {String}   the http method
	 * @param params {Object}   the parameters for the query
	 * @param cb {Function}     the callback function to handle the response
	 */
	oauthRequest = function(domain, path, method, params, cb) {
		var uri,
			parsedUri,
			parsedQuery,
			body,
			key,
			requestOptions,
			isOAuthRequest,
			pool;

		cb = cb || function() {};
		if ( !params.access_token ) {
			if ( opts.accessToken ) {
				params.access_token = opts.accessToken;
			}
		}

		if ( domain === 'googlemybusiness' ) {
			uri = 'https://mybusiness.googleapis.com/' + options('version') + '/' + path;
			isOAuthRequest = /^oauth.*/.test('oauth/');
		}

		parsedUri = URL.parse(uri);
		delete parsedUri.search;
		parsedQuery = QS.parse(parsedUri.query);

		if ( method === 'post' || method === 'patch' ) {
			if ( params.access_token ) {
				parsedQuery.access_token = params.access_token;
				delete params.access_token;
			}
			//body = stringifyParams(params);
			body = params;
		} else {
			for (key in params) {
				parsedQuery[key] = params[key];
			}
		}

		parsedUri.search = stringifyParams(parsedQuery);
		uri = URL.format(parsedUri);

		pool = {maxSockets: options('maxSockets') || Number(process.env.MAX_SOCKETS) || 5};

		if ( method === 'post' ) {
			requestOptions = {
				method: method,
				json: body,
				uri: uri,
				pool: pool
			};
		} else {
			requestOptions = {
				method: method,
				uri: uri,
				body: body,
				pool: pool
			};
		}

		if ( options('proxy') ) {
			requestOptions['proxy'] = options('proxy');
		}
		if ( options('timeout') ) {
			requestOptions['timeout'] = options('timeout');
		}
		if ( options('userAgent') ) {
			requestOptions['headers'] = {
				'User-Agent': options('userAgent')
			};
		}

		request(requestOptions,
			function(error, response, body) {
				if ( error !== null ) {
					if ( error === Object(error) && has(error, 'error') ) {
						return cb(error);
					}
					return cb({error: error});
				}

				if ( isOAuthRequest && response && response.statusCode === 200  &&
					response.headers && /.*text\/plain.*/.test(response.headers['content-type'])) {
					cb(parseOAuthApiResponse(body));
				} else {
					var json;
					try {
					    if ( typeof body ) {
					      json = body;
					    } else {
					      json = JSON.parse(body);           
					    }
					} catch (ex) {
						// sometimes GMB is has API errors that return HTML and a message
						// of "Sorry, something went wrong". These are infrequent and unpredictable but
						// let's not let them blow up our application.
						json =  {
							error: {
								code: 'JSONPARSE',
								Error: ex
							}
						};
					}
					cb(json);
				}
			});
	};

	parseOAuthApiResponse = function(body) {
		var result,
			key;

		result = QS.parse(body);
		for (key in result) {
			if ( !isNaN(result[key]) ) {
				result[key] = parseInt(result[key]);
			}
		}

		return result;
	};

	stringifyParams = function(params) {
		var data = {},
			key,
			value;

		for (key in params) {
			value = params[key];
			if ( value && typeof value !== 'string' ) {
				value = JSON.stringify(value);
			}
			if ( value !== undefined ) {
				data[key] = value;
			}
		}

		return QS.stringify(data);
	};

	log = function(d) {
		console.log(d);
	};

	has = function(obj, key) {
		return Object.prototype.hasOwnProperty.call(obj, key);
	};

	setAccessToken = function(accessToken) {
		options({accessToken: accessToken});
	};

	options = function(keyOrOptions) {
		var key;
		if ( !keyOrOptions ) {
			return opts;
		}
		if ( Object.prototype.toString.call(keyOrOptions) == '[object String]' ) {
			return has(opts, keyOrOptions) ? opts[keyOrOptions] : null;
		}
		for (key in opts) {
			if ( has(opts, key) && has(keyOrOptions, key) ) {
				opts[key] = keyOrOptions[key];
			}
		}
	};

	return {
		api: api,
		setAccessToken: setAccessToken,
		options: options, 
		version: version, 
	};

})();

module.exports = GMB;