const express = require('express'),
      getGames = require('./services/getGames');

var app = express();

app.get('/', (req, res) => {
  getGames('gears of war', data => {
    console.log(data);
    res.send(data);
  })
})

app.listen(3000, () => {
  console.log(`Listening...`);
});
