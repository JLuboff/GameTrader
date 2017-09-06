const flash = require('connect-flash'),
      getGames = require('../services/getGames'),
      bcrypt = require('bcryptjs');

module.exports = (app, passport, db) => {
	const isLogged = (req, res, next) => {
    //console.log(`isLogged: ${JSON.stringify(req)}`);
		if (req.isAuthenticated()) {
			return next();
		}
		return res.redirect('/login');
	};

	app.route('/').get((req, res) => {
		getGames('gears of war', data => {
			//console.log(data);
      console.log(req.session);
			res.send(data);
		});
	});

  app.route('/findGames')
  .get((req, res) => {
    res.render('findgames.hbs');
  });
  app.route('/findGames/:gameTitle')
  .post((req, res) => {
    getGames(req.params.gameTitle, data => {
      res.json(data);
    })
  });

	app
		.route('/login')
		.get((req, res) => {
			res.render('login.hbs');
		})
		.post(
			passport.authenticate('local', { failureRedirect: '/login' }),
			(req, res) => {
        console.log(`Login post: ${JSON.stringify(req.user)}`);
				res.redirect('/');
			}
		);

	app
		.route('/login/signup')
		.get((req, res) => {
			let usernameExists = req.flash('exists');
			res.render('signup.hbs', { usernameExists });
		})
		.post((req, res) => {
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
			db
				.collection('users')
				.findOne({ username: user.username }, (err, doc) => {
					if (err) throw err;
					if (doc) {
						return res.redirect('/usernameExists');
					} else {
						db.collection('users').insertOne(user);
						res.redirect('/login');
					}
				});
		});

  app.route('/profile')
     .get(isLogged, (req, res) => {
       console.log(`Profile: ${req.user}`);
       res.send(`Profile will be here: ${JSON.stringify(req.user)}`);
     })

	app.route('/usernameExists').get((req, res) => {
		req.flash('exists', 'Username is already taken. Please choose another.');
		res.redirect('/login/signup');
	});
};
