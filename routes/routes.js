const flash = require('connect-flash'),
      findGameByName = require('../services/findGameByName'),
      findGameById = require('../services/findGameById'),
      ObjectId = require('mongodb').ObjectId,
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
		db.collection('games').find({}).toArray((err, games) => {
      console.log(games);
      let loggedIn = req.user != undefined ? true : false;
      res.render('index.hbs', {games, loggedIn})
    })
		});

  app.route('/findGames')
  .get(isLogged, (req, res) => {
    let tradeReqs = req.user.tradeRequests;
    res.render('findgames.hbs', {tradeReqs, loggedIn: true});
  });
  app.route('/findGames/:gameTitle')
  .post((req, res) => {
    findGameByName(req.params.gameTitle, data => {
      res.json(data);
    })
  });

  app.route('/addGame/:gameId/:platform')
  .post((req, res) => {

    let id = Number(req.params.gameId),
        user = req.user._id,
        plat = req.params.platform;
        console.log(id, user, plat);

    db.collection('games').find({id : id}).toArray((err, doc) => {
      console.log(doc);
      if(doc.length){
        db.collection('games').updateOne({id : id}, {$addToSet: {'owner': [user, plat]}})
      } else {
        findGameById(id, data => {
        //  console.log(data);
          data[0]['owner'] = [[user, plat]];
          db.collection('games').insertOne(data[0]);
          res.json(data);
        })
      }
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
				state: req.body.state,
        tradeRequests : 0
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

  app.route('/logout')
    .get((req,res) => {
      req.logout();
      res.redirect('/');
    });

  app.route('/profile')
     .get(isLogged, (req, res) => {
       //Need aggregate to break apart array.
       db.collection('games').aggregate([{$unwind: '$owner'}, {$match: {owner: ObjectId(req.user._id)}}], (err, doc) => {
         if(err) throw err;
         res.send(doc);
       })
      /* db.collection('games').find({'owner': ObjectId(req.user._id)}).toArray((err, doc) => {
         if (err) throw err;
         res.send(doc);
       }) */
       console.log(`Profile: ${req.user}`);
       //res.send(`Profile will be here: ${JSON.stringify(req.user)}`);
     })

	app.route('/usernameExists').get((req, res) => {
		req.flash('exists', 'Username is already taken. Please choose another.');
		res.redirect('/login/signup');
	});
};
