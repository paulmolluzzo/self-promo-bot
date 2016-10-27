'use strict';

// grab env vars
require('dotenv').config({silent: true});

const express = require('express');
const compression = require('compression');
const logger = require('morgan');
const bodyParser = require('body-parser');
const exphbs = require('express-handlebars');
const winston = require('winston');
const config = require('./config');

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
winston.add(winston.transports.File, {
	filename: 'logs/' + process.env.NODE_ENV + '.log',
	level: 'info',
	json: true,
	timestamp: true
});
winston.remove(winston.transports.Console);

if (!(config.APP_SECRET && config.VALIDATION_TOKEN && config.PAGE_ACCESS_TOKEN && config.SERVER_URL)) {
	winston.error('Missing config values');
	throw new Error('Missing config values');
}

module.exports = app;
