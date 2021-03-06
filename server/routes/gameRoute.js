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

router.get('/users', (req, res) => {
  Promise.all([
    UserModel.count({ role: 'User' }),
    UserModel.count({ role: 'User', isReady: false }),
    UserModel.count({ role: 'User', isReady: true })
  ]).then(([all, notReady, ready]) => {
    res.status(200).json({ all, notReady, ready });
  });
});

router.get('/stats', (req, res) => {
  GroupModel.find()
    .sort( {collectedPoints: 'desc'})
    .then(groups => {
      res.status(200).json(groups.map(g =>  ({ name: g.name, points: g.collectedPoints, completed: g.completedStations.length})))
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
        socketEmit(req.io);
      }
    } else {
      prepareGame();
      res.sendStatus(201);
      socketEmit(req.io);
    }
  });
});

function prepareGame() {
  Promise.all([
    GroupModel.find(),
    UserModel.find({ role: 'User', isReady: true })
  ]).then(([groups, users]) => {
    const randomizedUsers = lodash.shuffle(users);
    let groupIndex = 0;
    let userIndex = 0;
    while (userIndex < randomizedUsers.length) {
      groups[groupIndex].users.push(randomizedUsers[userIndex]);
      randomizedUsers[userIndex].group = groups[groupIndex];
      if (++groupIndex === groups.length) groupIndex = 0;
      userIndex++;
    }
    randomizedUsers.forEach(u => {
      UserModel.update({ _id: u._id }, { group: u.group._id }, err => {
        if (err) throw err;
      });
    });

    groups.forEach(g => {
      GroupModel.update(
        { _id: g._id },
        {
          users: g.users.map(u => u._id)
        },
        err => {
          if (err) throw err;
        }
      );
    });
    const game = new GameModel({
      isStarted: true,
      groups: groups.map(g => String(g._id))
    });
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

function socketEmit(io) {
  io.sockets.emit('gameStarted', 'Started at: ' + new Date());
}

module.exports = router;
