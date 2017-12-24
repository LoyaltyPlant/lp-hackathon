const GroupModel = require('../models/group');
const UserModel = require('../models/user');
const GameModel = require('../models/game');
const lodash = require('lodash');
const express = require('express');
const router = express.Router();
const adminRequired = require('../middleware/adminRequired');

router.get('/', (req, res) => {
  fetchGame().then(game => {
    if (game) {
      GroupModel.findOne({ _id: res.locals.user.group })
        .populate('users')
        .then(_group => {
          let group;
          if (_group) {
            const users = _group.users.map(u => ({
              name: u.name,
              picture: u.picture
            }));
            group = { ..._group.toObject(), users };
          }
          res.status(200).json({ game, group });
        });
    } else {
      res.sendStatus(204);
    }
  });
});

router.post('/', adminRequired, (req, res) => {
  fetchGame().then(game => {
    if (game) {
      if (game.isStarted) {
        res.sendStatus(400);
      } else {
        prepareGame();
        res.sendStatus(201);
      }
    } else {
      prepareGame();
      res.sendStatus(201);
    }
  });
});

function prepareGame() {
  Promise.all([
    GroupModel.find(),
    UserModel.find({ role: 'User', isReady: true })
  ]).then(([groups, users]) => {
    const randomizedUsers = lodash.shuffle(users);
    console.log(randomizedUsers);

    const game = new GameModel({ isStarted: true, groups });
    game.save(err => {
      if (err) throw err;
    });
  });
}

function fetchGame() {
  return GameModel.find()
    .populate({
      path: 'groups',
      populate: {
        path: 'users',
        model: 'User'
      }
    })
    .then(games => {
      if (games && games.length > 0) {
        let game = games[0];
        let rawGroups = game.groups;
        const groups = rawGroups.map(g => {
          users = g.users.map(u => ({
            name: u.name,
            picture: u.picture
          }));
          return { ...g.toObject(), users };
        });
        return { ...game.toObject(), groups };
      }
    })
    .catch(err => {
      throw err;
    });
}

module.exports = router;