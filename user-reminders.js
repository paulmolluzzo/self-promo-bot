const winston = require('winston');
const Users = require('./users');

const userReminders = {
  findOrCreateUser: userID => {
    Users.findOrCreate({senderID: userID}, {reminderSent: null}, err => {
      if (err) {
        console.log(err);
      }
    });
  },

  findUsersToRemind: (callback = () => {}) => {
    const oneDayAgo = new Date(new Date().getTime() - (24 * 60 * 60 * 1000));

    Users.find({reminderSent: null, createdAt: {$lt: oneDayAgo}}, (err, docs) => {
      if (err) {
        return winston.error(err);
      }

      callback(docs);
    });
  },

  markUserReminded: user => {
    user.reminderSent = new Date();
    user.save(err => {
      if (err) {
        winston.error(err);
      }
    });
  }
};

module.exports = userReminders;
