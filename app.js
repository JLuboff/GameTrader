const express = require('express'),
      getGames = require('./services/getGames'),
      session = require('express-session'),
      passport = require('passport'),
      Strategy = require('passport-local').Strategy,
      hbs = require('hbs'),
      flash = require('connect-flash'),
      MongoClient = require('mongodb').MongoClient,
      bcrypt = require('bcryptjs'),
      //db = require('./models/db'),
      morgan = require('morgan'),
      bodyParser = require('body-parser'),
      port = process.env.PORT || 3000;

MongoClient.connect(`mongodb://localhost:27017/gameTrader`, (err, db) => {

passport.use(new Strategy((username, password, cb) => {

  db.collection('users').findOne({username}, (err, user) => {
    if(err) return cb(err);
    if(!user) return cb(null, false);
    if(!bcrypt.compareSync(password, user.password)) return cb(null, false);
    return cb(null, user);
  });
}));


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
app.use(flash());
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

app.post('/login', passport.authenticate('local', { failureRedirect: '/login' }), function(req, res) {
    res.redirect('/');
  });
app.get('/login', (req, res) => {
  res.render('login.hbs');
})

app.get('/login/signup', (req, res) => {
    let usernameExists = req.flash('exists');
  res.render('signup.hbs', {usernameExists});
});

app.post('/login/signup', (req, res) => {
  console.log(req.body);
  let salt = bcrypt.genSaltSync(10);
  let hash = bcrypt.hashSync(req.body.password, salt);

  let user = {
    username: req.body.username,
    password: hash,
    firstName: req.body.firstName,
    lastName: req.body.lastName,
    city: req.body.city,
    state: req.body.state
  };
  console.log(user);
  db.collection('users').findOne({username: user.username}, (err, doc) => {
    if(err) throw err;
    if(doc){
      return res.redirect('/usernameExists');
    } else {
      db.collection('users').insertOne(user);
      res.redirect('/login');
    }
  })

})

app.get('/usernameExists', (req, res) => {
  req.flash('exists', 'Username is already taken. Please choose another.');
  res.redirect('/login/signup');
})

app.listen(port, () => {
	console.log(`Listening...`);
});

});
