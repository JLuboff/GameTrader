const express = require('express'),
      routes = require('./routes/routes'),
      session = require('express-session'),
      passport = require('passport'),
      Strategy = require('passport-local').Strategy,
      hbs = require('hbs'),
      flash = require('connect-flash'),
      MongoClient = require('mongodb').MongoClient,
      ObjectID = require('mongodb').ObjectID,
      bcrypt = require('bcryptjs'),
      morgan = require('morgan'),
      bodyParser = require('body-parser'),
      port = process.env.PORT || 3000;

MongoClient.connect(`mongodb://localhost:27017/gameTrader`, (err, db) => {
	passport.use(
		new Strategy((username, password, cb) => {
			db.collection('users').findOne({ username: username.toLowerCase() }, (err, user) => {
				if (err) return cb(err);
				if (!user) return cb(null, false);
				if (!bcrypt.compareSync(password, user.password)) return cb(null, false);
				return cb(null, user);
			});
		})
	);

	passport.serializeUser(function(user, cb) {
  //  console.log(`Serialize: ${JSON.stringify(user)}`);
		cb(null, user._id);
	});

	passport.deserializeUser(function(username, cb) {
  //  console.log(username);
		db.collection('users').findOne({ _id: ObjectID(username) }, {_id:1, username: 1, actualUsername: 1, firstName: 1, lastName: 1, city: 1, state: 1, tradeRequests: 1, tradeRequestsCount: 1, email: 1}, function(err, user) {
    //  console.log(user);
			if (err) {
				return cb(err);
			}
			cb(null, user);
		});
	});

	var app = express();

	app.set('view engine', 'hbs');
	app.use(morgan('combined'));
	app.use(flash());
	app.use(bodyParser.urlencoded({ extended: true }));
	app.use(
		session({
			secret: 'potato',
			resave: true,
			saveUnitialized: true
		})
	);
	app.use(passport.initialize());
	app.use(passport.session());
  app.use('/css', express.static(__dirname + '/node_modules/bootstrap/dist/css'));
  app.use('/js', express.static(__dirname + '/node_modules/bootstrap/dist/js'));

	routes(app, passport, db);

	app.listen(port, () => {
		console.log(`Listening...${port}`);
	});
});
