const express = require('express'),
      getGames = require('./services/getGames'),
      session = require('express-session'),
      passport = require('passport'),
      Strategy = require('passport-local').Strategy,
      hbs = require('hbs'),
      MongoClient = require('mongodb').MongoClient,
      //db = require('./models/db'),
      morgan = require('morgan'),
      bodyParser = require('body-parser'),
      port = process.env.PORT || 3000;

MongoClient.connect(`mongodb://localhost:27017/gameTrader`, (err, db) => {

passport.use(new Strategy((username, password, cb) => {
  console.log(username);
  db.collection('users').findOne({username}, (err, user) => {
    if(err) return cb(err);
    if(!user) return cb(null, false);
    if(user.password !== password) return cb(null, false);
    return cb(null, user);
  });
}));
/*passport.use(
	new Strategy(function(username, password, cb) {
		db.users.findByUsername(username, function(err, user) {
			if (err) {
				return cb(err);
			}

			if (!user) {
				return cb(null, false);
			}

			if (user.password != password) {
				return cb(null, false);
			}

			return cb(null, user);
		});
	})
); */

passport.serializeUser(function(user, cb) {

	cb(null, user);
});

passport.deserializeUser(function(username, cb) {
	db.collection('users').findOne({username}, function(err, user) {
		if (err) {
			return cb(err);
		}

		cb(null, user);
	});
});


var app = express();

app.set('view engine', 'hbs');
//app.use(morgan('combined'));
app.use(bodyParser.urlencoded({extended: true}));
app.use(session({
  secret: 'potato',
  resave: true,
  saveUnitialized: true
}));
app.use(passport.initialize());
app.use(passport.session());

app.get('/', (req, res) => {
	getGames('gears of war', data => {
		console.log(data);
		res.send(data);
	});
});

app.post('/login',

  passport.authenticate('local', { failureRedirect: '/login' }),

  function(req, res) {

    res.redirect('/');

  });
app.get('/login', (req, res) => {
  console.log(`Loaded.`)
  res.render('login.hbs');
})

app.listen(port, () => {
	console.log(`Listening...`);
});

});
