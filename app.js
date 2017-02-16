'use strict';

// grab env vars
require('dotenv').config({silent: true});

const express = require('express');
const compression = require('compression');
const logger = require('morgan');
const bodyParser = require('body-parser');
const exphbs = require('express-handlebars');
const winston = require('winston');
const papertrail = require('winston-papertrail').Papertrail; // eslint-disable-line no-unused-vars
const mongoose = require('mongoose');
const config = require('./config');
const botMethods = require('./bot-methods');
const userReminders = require('./user-reminders');

// connect to MongoDB
mongoose.connect(process.env.MONGO_DB_URL);

// init express
const app = express();

// views
app.engine('html', exphbs({defaultLayout: 'main', extname: '.html'}));
app.set('view engine', 'html');

// app locals
app.locals.fbMessengerAppId = config.FB_MESSENGER_APP_ID;
app.locals.fbPageId = config.FB_PAGE_ID;

// public assets
app.use(express.static('public'));

// compression
app.use(compression());

// logger
app.use(logger('dev'));

// body parser
app.use(bodyParser.json({
  extended: false,
  parameterLimit: 10000,
  limit: 1024 * 1024 * 10
}));
app.use(bodyParser.urlencoded({
  extended: false,
  parameterLimit: 10000,
  limit: 1024 * 1024 * 10
}));

// winston logging options
winston.configure({
  transports: [
    new (winston.transports.File)({
      filename: 'logs/' + process.env.NODE_ENV + '.log',
      level: 'info',
      json: true,
      timestamp: true
    }),
    new (winston.transports.Papertrail)({
      host: process.env.PAPERTRAIL_HOST,
      port: process.env.PAPERTRAIL_PORT
    })
  ]
});

if (!(config.APP_SECRET && config.VALIDATION_TOKEN && config.PAGE_ACCESS_TOKEN && config.SERVER_URL)) {
  winston.error('Missing config values');
  throw new Error('Missing config values');
}

// remind users who were created more than 1 day ago
setInterval(() => {
  userReminders.findUsersToRemind(usersToRemind => {
    usersToRemind.forEach(user => {
      return botMethods.sendReminderTextMessage(user.senderID).then(() => userReminders.markUserReminded(user));
    });
  });
}, (5 * 60 * 1000));

module.exports = app;
