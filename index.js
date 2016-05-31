//module.exports = require('./lib/gmb');
/*
exports.PrintMsg = function () {
	console.log("TEST BY PRASHANT")
}

*/

'use strict';
var GMB = (function() {
	var 
		//debugReq = require('debug')('google_my_business:req'),
		//debugSig = require('debug')('google_my_business:sig'),
		request  = require('request'),
		URL      = require('url'),
		QS       = require('querystring'),
		crypto   = require('crypto'),
		version  = require('./package.json').version,
		//getLoginUrl,
		api,
		//napi,
		//nodeifyCallback,
		google,
		//rest,
		oauthRequest,
		parseOAuthApiResponse,
		stringifyParams,
		setAccessToken,
		getAccessToken,
		getAppSecretProof,
		parseSignedRequest,
		base64UrlDecode,
		log,
		has,
		options,
		METHODS = ['get', 'post', 'delete', 'put'],
		opts = {
			accessToken: null,
			appId: null,
			appSecret: null,
			appSecretProof: null,
			beta: false,
			version: 'v2.0',
			timeout: null,
			scope:  null,
			redirectUri: null,
			proxy: null,
			userAgent: 'thuzi_nodejssdk/' + version
		},
		readOnlyCalls = {
			'v3.accounts': true,
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
			google.apply(this, arguments);
		} 
	};

	/**
	 *
	 * Make a api call to google server.
	 *
	 * Except the path, all arguments to this function are optiona. So any of
	 * these are valid:
	 *
	 *  GMB.api('/me') // throw away the response
	 *  GMB.api('/me', function(r) { console.log(r) })
	 *  GMB.api('/me', { fields: 'email' }); // throw away response
	 *  GMB.api('/me', { fields: 'email' }, function(r) { console.log(r) });
	 *  GMB.api('/123456789', 'delete', function(r) { console.log(r) } );
	 *  GMB.api(
	 *      '/me/feed',
	 *      'post',
	 *      { body: 'hi there' },
	 *      function(r) { console.log(r) }
	 *  );
	 *
	 */
	google = function() {
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

		oauthRequest('google', path, method, params, cb);
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
				if ( opts.appSecret ) {
					params.appsecret_proof = opts.appSecretProof;
				}
			}
		} else if ( !params.appsecret_proof && opts.appSecret ) {
			params.appsecret_proof = getAppSecretProof(params.access_token, opts.appSecret);
		}

		//https://mybusiness.googleapis.com/v3/accounts?pageSize=3&pageToken
		if ( domain === 'google' ) {
			uri = 'https://mybusiness.googleapis.com/' + options('version') + '/' + path;
			isOAuthRequest = /^oauth.*/.test('oauth/');
		}

		parsedUri = URL.parse(uri);
		delete parsedUri.search;
		parsedQuery = QS.parse(parsedUri.query);

		if ( method === 'post' ) {
			if ( params.access_token ) {
				parsedQuery.access_token = params.access_token;
				delete params.access_token;

				if ( params.appsecret_proof ) {
					parsedQuery.appsecret_proof = params.appsecret_proof;
					delete params.appsecret_proof;
				}
			}

			body = stringifyParams(params);
		} else {
			for (key in params) {
				parsedQuery[key] = params[key];
			}
		}

		parsedUri.search = stringifyParams(parsedQuery);
		uri = URL.format(parsedUri);

		pool = {maxSockets: options('maxSockets') || Number(process.env.MAX_SOCKETS) || 5};
		requestOptions = {
			method: method,
			uri: uri,
			body: body,
			pool: pool
		};
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
		console.log(requestOptions)
		//debugReq(method.toUpperCase() + ' ' + uri);
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
						json = JSON.parse(body);
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
		// todo
		console.log(d); // eslint-disable-line no-console
	};

	has = function(obj, key) {
		return Object.prototype.hasOwnProperty.call(obj, key);
	};

	getAccessToken = function() {
		return options('accessToken');
	};

	setAccessToken = function(accessToken) {
		options({accessToken: accessToken});
	};

	getAppSecretProof = function(accessToken, appSecret) {
		var hmac = crypto.createHmac('sha256', appSecret);
		hmac.update(accessToken);
		return hmac.digest('hex');
	};

	/**
	 *
	 * @access public
	 * @param signedRequest {String} the signed request value
	 * @param appSecret {String} the application secret
	 * @return {Object} the parsed signed request or undefined if failed
	 *
	 * throws error if appSecret is not defined
	 *
	 * GMB.parseSignedRequest('signedRequest', 'appSecret')
	 * GMB.parseSignedRequest('signedRequest') // will use appSecret from options('appSecret')
	 *
	 */
	parseSignedRequest = function() {
		var args = Array.prototype.slice.call(arguments),
			signedRequest = args.shift(),
			appSecret = args.shift() || options('appSecret'),
			split,
			encodedSignature,
			encodedEnvelope,
			envelope,
			hmac,
			base64Digest,
			base64UrlDigest;

		if ( !signedRequest ) {
			debugSig('invalid signedRequest');
			return;
		}

		if ( !appSecret ) {
			throw new Error('appSecret required');
		}

		split = signedRequest.split('.');

		if ( split.length !== 2 ) {
			debugSig('invalid signedRequest');
			return;
		}

		encodedSignature = split.shift();
		encodedEnvelope = split.shift();

		if ( !encodedSignature || !encodedEnvelope ) {
			debugSig('invalid signedRequest');
			return;
		}

		try {
			envelope = JSON.parse(base64UrlDecode(encodedEnvelope));
		} catch (ex) {
			debugSig('encodedEnvelope is not a valid base64 encoded JSON');
			return;
		}

		if ( !(envelope && has(envelope, 'algorithm') && envelope.algorithm.toUpperCase() === 'HMAC-SHA256') ) {
			debugSig(envelope.algorithm + ' is not a supported algorithm, must be one of [HMAC-SHA256]');
			return;
		}

		hmac = crypto.createHmac('sha256', appSecret);
		hmac.update(encodedEnvelope);
		base64Digest = hmac.digest('base64');

		// remove Base64 padding
		base64UrlDigest = base64Digest.replace(/={1,3}$/, '');

		// Replace illegal characters
		base64UrlDigest = base64UrlDigest.replace(/\+/g, '-').replace(/\//g, '_');

		if ( base64UrlDigest !== encodedSignature ) {
			debugSig('invalid signature');
			return;
		}

		return envelope;
	};

	base64UrlDecode = function(str) {
		var base64String = str.replace(/\-/g, '+').replace(/_/g, '/');
		var buffer = new Buffer(base64String, 'base64');
		return buffer.toString('utf8');
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
				switch (key) {
				case 'appSecret':
				case 'accessToken':
					opts.appSecretProof =
						(opts.appSecret && opts.accessToken) ?
						getAppSecretProof(opts.accessToken, opts.appSecret) :
						null;
					break;
				}
			}
		}
	};

	return {
		api: api,
		getAccessToken: getAccessToken,
		setAccessToken: setAccessToken, 
		parseSignedRequest: parseSignedRequest, 
		options: options, 
		version: version, 
	};

})();

module.exports = GMB;
