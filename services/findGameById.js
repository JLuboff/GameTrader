const querystring = require('querystring'),
	    https = require('https');

const findGameById = function(gameId, callback) {
	const options = {
		hostname: 'api-2445582011268.apicast.io',
		headers: {
			'user-key': process.env.APIKEY,
			Accept: 'application/json'
		},
		port: 443,
		path: `/games/${gameId}?fields=id,name,summary,total_rating,developers.name,publishers.name,game_modes.name,cover,release_dates.platform,release_dates.human&expand=developers,publishers,game_modes&filter[release_dates.platform][eq]=48&filter[release_dates.platform][eq]=49&limit=5`,
		method: 'GET'
	};

	https.get(options, res => {
		let data = '';
		res.setEncoding('utf8');

		res.on('data', chunk => {
			data += chunk;
		});

		res.on('end', () => {
			return callback(JSON.parse(data));
		});
	});
};

module.exports = findGameById;
