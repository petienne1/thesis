const knex = require('../db/db');
const _ = require('underscore');

const User = {};

User.getInfo = (req, res) => {
  knex('users').select('*')
    .then(users => res.status(200).send(users))
    .catch(err => console.log(err));
};

User.getUser = user =>
  new Promise((reject, resolve) =>
    knex('users').where('user_id', user.id)
      .then((userData) => {
        if (userData.length > 0) resolve(userData);
        else resolve(false);
      })
      .catch(err => console.log(err)));

User.login = (user) => {
  knex('users').where('user_id', user.id)
    .then((data) => {
      if (data.length > 0) {
        console.log(`user ${data.user_id} already exists!`);
      } else {
        const newUser = {
          user_id: user.id,
          user_name: user.username,
          user_url: user.profileUrl,
          // user_image: user.photos[0],
          user_favorites: '',
        };
        knex('users').insert(newUser)
          .then(() => console.log(`User ${user.id} successfully added!`));
      }
    })
    .catch(err => console.log(err));
};

User.getFavorites = (req, res) => {
  knex('users').where('user_id', req.user.id)
    .then((user) => {
      const favs = user[0].user_favorites;
      if (favs) {
        knex('tracks')
          .groupBy('track_id')
          .whereIn('track_id', favs.split(','))
          .then(favTracks => res.send(favTracks));
      } else {
        res.send([]);
      }
    })
    .catch(err => console.log(err));
};


User.addFavorite = (req, res) => {
  knex('users').select('user_favorites').where('user_id', req.user.id)
    .then((user) => {
      const favs = user[0].user_favorites;
      let newFavs;
      if (favs) {
        if (!favs.includes(req.body.track_id)) {
          newFavs = `${favs},${req.body.track_id}`;
        } else {
          newFavs = favs;
        }
      } else {
        newFavs = req.body.track_id;
      }
      console.log('newFavs: ', newFavs);
      knex('users').where('user_id', req.user.id).update({
        user_favorites: newFavs,
      })
        .then((data) => {
          User.getFavorites(req, res);
        });
    })
    .catch(err => console.log(err));
};

User.removeFavorite = (req, res) => {
  knex('users').select('user_favorites').where('user_id', req.user.id)
    .then(((user) => {
      const favs = user[0].user_favorites.split(',');
      const newFavs = _.reject(favs, f => f === req.body.track_id).join(',');
      knex('users').where('user_id', req.user.id).update({
        user_favorites: newFavs,
      })
        .then((data) => {
          User.getFavorites(req, res);
        });
    }))
    .catch(err => console.log(err));
  console.log('DELETED!');
};

module.exports = User;
