const flash = require('connect-flash'),
      findGameByName = require('../services/findGameByName'),
      findGameById = require('../services/findGameById'),
      ObjectId = require('mongodb').ObjectId,
      bcrypt = require('bcryptjs');

module.exports = (app, passport, db) => {
	const isLogged = (req, res, next) => {
		if (req.isAuthenticated()) {
			return next();
		}
		return res.redirect('/login');
	};

	app.route('/').get((req, res) => {
    let tradeReqs = req.user == undefined ? 0 : req.user.tradeRequests;
		db
			.collection('games')
			.find({'owner.0': {$exists: true}})
			.sort({ name: 1 })
			.toArray((err, games) => {

        games.forEach(el => {
          let platforms= {}
          for(let i in el.owner){
            if(!platforms.hasOwnProperty(el.owner[i].plat)){
              platforms[el.owner[i].plat.replace(' ', '')] = el.owner[i].plat;
            }
          }
          el['platformsAvail'] = platforms;
        })

				let loggedIn = req.user != undefined ? true : false;
				res.render('index.hbs', { games, loggedIn, tradeReqs });
			});
	});

	app.route('/findGames').get(isLogged, (req, res) => {
		let tradeReqs = req.user.tradeRequests;
		res.render('findgames.hbs', { tradeReqs, loggedIn: true });
	});
	app.route('/findGames/:gameTitle').post((req, res) => {
		findGameByName(req.params.gameTitle, data => {
			res.json(data);
		});
	});

	app.route('/addGame/:gameId/:platform').post((req, res) => {
		let id = Number(req.params.gameId),
			user = req.user._id,
			plat = req.params.platform;
		console.log(id, user, plat);

		db
			.collection('games')
			.find({ id: id })
			.toArray((err, doc) => {
				console.log(doc);
				if (doc.length) {
					db
						.collection('games')
						.updateOne({ id: id }, { $addToSet: { owner: {user, plat} } });
				} else {
					findGameById(id, data => {
						//  console.log(data);
						data[0]['owner'] = [{user, plat}];
						db.collection('games').insertOne(data[0]);
						res.json(data);
					});
				}
			});
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
		.route('/login/register')
		.get((req, res) => {
			let usernameExists = req.flash('exists');
			res.render('register.hbs', { usernameExists });
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
				state: req.body.state,
				tradeRequests: 0
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

	app.route('/logout').get((req, res) => {
		req.logout();
		res.redirect('/');
	});

	app.route('/profile').get(isLogged, (req, res) => {
    let tradeReqs = req.user.tradeRequests;
		db
			.collection('games')
			.aggregate(
				[{ $unwind: '$owner' }, { $match: { 'owner.user': ObjectId(req.user._id) } }],
				(err, games) => {
					if (err) throw err;
					console.log(games);
					res.render('profile.hbs', { games, loggedIn: true, tradeReqs });
				}
			);
	});

	app.route('/remove/:id/:platform').post((req, res) => {
		let id = Number(req.params.id),
			platform = req.params.platform.replace('%20', ' ');
		console.log(typeof id, platform);
		db
			.collection('games')
			.updateOne(
				{ id: id },
				{ $pull: { owner: {user: ObjectId(req.user._id), plat: platform}}},
				(err, doc) => {
					if (err) throw err;

					db
						.collection('games')
						.aggregate(
							[
								{ $unwind: '$owner' },
								{ $match: { 'owner.user': ObjectId(req.user._id) } }
							],
							(err, games) => {
								if (err) throw err;
								res.json(games);
							}
						);
				}
			);
	});

	app.route('/requestTrade/:platform/:id').get(isLogged, (req, res) => {
    let tradeReqs = req.user.tradeRequests;
		db
			.collection('games')
			.aggregate(
				[{ $unwind: '$owner' }, { $match: { 'owner.user': ObjectId(req.user._id) } }],
				(err, games) => {
					if (err) throw err;
					if (!games.length) {
						console.log(`No games found: ${games}`);
					} else {
						console.log(`User has games: ${games}`);
					}
				}
			);
	});

	app.route('/usernameExists').get((req, res) => {
		req.flash('exists', 'Username is already taken. Please choose another.');
		res.redirect('/login/register');
	});
};
