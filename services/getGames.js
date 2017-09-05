const querystring = require('querystring'),
      https = require('https');

const getGames = function(game, callback) {
  /*const apiQuery = querystring.stringify({
      'fields':
  }); */

  const options = {
    hostname: 'api-2445582011268.apicast.io',
    headers: {
      'user-key': 'f07eb68ccc69683f2d96ea50b9820ddd',
      'Accept' : 'application/json'
    },
    port: 443,
    path: `/games/?search=${game.replace(/\s/g, '%20')}&fields=id,name,summary,total_rating,developers,publishers,cover,release_dates.platform,release_dates.human&filter[release_dates.platform][eq]=6`,
    method: 'GET'
  };

  console.log(options);
  https.get(options, res => {
    let data = '';
    res.setEncoding('utf8');

    res.on('data', chunk => {
    //  console.log(chunk);
      data += chunk;
    });

    res.on('end', () => {
      return callback(JSON.parse(data));
    });
  });
};

module.exports = getGames;
