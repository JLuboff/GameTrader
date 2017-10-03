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
          let tradeReqs = req.user == undefined ? 0 : req.user.tradeRequestsCount,
          ownReq = req.flash('ownReq');
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
            res.render('index.hbs', { games, loggedIn, tradeReqs, ownReq });
          });
        });

        app.route('/findGames').get(isLogged, (req, res) => {
          let tradeReqs = req.user.tradeRequestsCount,
          noGames = req.flash('noGames');
          res.render('findgames.hbs', { tradeReqs, loggedIn: true, noGames });
        });
        app.route('/findGames/:gameTitle').post((req, res) => {
          findGameByName(req.params.gameTitle, data => {
            res.json(data);
          });
        });

        app.route('/addGame/:gameId/:platform').post((req, res) => {
          let id = Number(req.params.gameId),
          user = req.user._id,
          email = req.user.email,
          username = req.user.username,
          plat = req.params.platform;
          //console.log(id, user, plat);

          db
          .collection('games')
          .find({ id: id })
          .toArray((err, doc) => {
            //console.log(doc);
            if (doc.length) {
              db
              .collection('games')
              .updateOne({ id: id }, { $addToSet: { owner: {user, plat, username} } });
            } else {
              findGameById(id, data => {
                //  console.log(data);
                data[0]['owner'] = [{user, plat, username}];
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
            //console.log(`Login post: ${JSON.stringify(req.user)}`);
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
            username: req.body.username.toLowerCase(),
            password: hash,
            email: req.body.email,
            city: req.body.city,
            state: req.body.state,
            tradeRequestsCount: 0,
            tradeRequests: []
          };
          console.log(user);
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
          let tradeReqs = req.user.tradeRequestsCount;
          db
          .collection('games')
          .aggregate(
            [{ $unwind: '$owner' }, { $match: { 'owner.user': ObjectId(req.user._id) } }],
            (err, games) => {
              if (err) throw err;
              //console.log(games);
              res.render('profile.hbs', { games, loggedIn: true, tradeReqs });
            }
          );
        });

        app.route('/remove/:id/:platform').post((req, res) => {
          let id = Number(req.params.id),
          platform = req.params.platform.replace('%20', ' ');
          //console.log(typeof id, platform);
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
          let tradeReqs = req.user.tradeRequestsCount,
          id = Number(req.params.id),
          plat = req.params.platform === 'XboxOne' ? 'Xbox One' : 'Playstation 4';

          db
          .collection('games')
          .aggregate(
            [{ $unwind: '$owner' }, { $match: { 'owner.user': ObjectId(req.user._id) } }],
            (err, games) => {
              if (err) throw err;
              if (!games.length) {
                console.log(`No games found: ${games}`);
                res.redirect('/noGamesForTrade');
              } else {
                console.log(`User has games: ${games}`);
                //insert into both users, Requesting user to show what he requested
                //User requesting from to show someone is requesting a trade
                db.collection('games').aggregate([{$match: {id: id}}, {$unwind: '$owner'}, {$match: {'owner.plat': plat}}, {$project: {_id: 0, id: 1, name: 1, owner: 1  }}], (err, doc) => {
                  if(err) throw err;

                  if(doc[0].owner.user.toString() == req.user._id.toString()){
                    return res.redirect('/ownRequest');
                  }

                  let requester = {
                    gameName: doc[0].name,
                    gameId: doc[0].id,
                    requestTo: {id: doc[0].owner.user, username: doc[0].owner.username},
                    platform: plat,
                    status: 'Pending...'
                  };

                  let requestFrom = {
                    gameName: doc[0].name,
                    gameId: doc[0].id,
                    requestFrom: {id: req.user._id, username: req.user.username, location: req.user.city + ', ' + req.user.state},
                    platform: plat,
                    status: 'Pending...'
                  }
                  db.collection('users').updateOne({_id: ObjectId(doc[0].owner.user)}, {$addToSet: {tradeRequests: requestFrom}, $inc: {tradeRequestsCount: 1}}, {upsert: true});
                  db.collection('users').updateOne({_id: ObjectId(req.user._id)}, {$addToSet: {tradeRequests: requester}}, {upsert: true}, (err, object) => {
                    // console.log(object);
                    res.redirect('/requestSent');
                  })

                })
              }
            }
          );
        });

//Define flash routes
        app.route('/tradeRequests')
        .get(isLogged, (req, res) => {
          let requestSent = req.flash('requestSent');
          db.collection('users').findOne({_id: ObjectId(req.user._id)}, {tradeRequestsCount: 1, tradeRequests: 1}, (err, doc) => {
            res.render('traderequests.hbs', {loggedIn: true, requestSent, doc});
          })
        });

        app.route('/usernameExists').get((req, res) => {
          req.flash('exists', 'Username is already taken. Please choose another.');
          res.redirect('/login/register');
        });

        app.route('/noGamesForTrade')
        .get((req, res) => {
          req.flash('noGames', 'You do not have any games for trade. Please add at least one before attempting a trade.');
          res.redirect('/findGames');
        });

        app.route('/requestSent')
        .get((req, res) => {
          req.flash('requestSent', 'Your trade request has been sent!');
          res.redirect('/tradeRequests');
        });

        app.route('/ownRequest')
        .get((req, res) => {
          req.flash('ownReq', 'Sorry, you can not request a trade with yourself.');
          res.redirect('/');
        })
};
