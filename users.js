const mongoose = require('mongoose');
const findOrCreate = require('mongoose-findorcreate');

const Schema = mongoose.Schema;

const Users = new Schema({
  senderID: String,
  reminderSent: String
}, {
  timestamps: true
});

Users.plugin(findOrCreate);

module.exports = mongoose.model('Users', Users);
