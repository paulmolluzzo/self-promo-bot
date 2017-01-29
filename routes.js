'use strict';

const winston = require('winston');
const app = require('./app');
const botMethods = require('./bot-methods');
const config = require('./config');

// homepage
app.get('/', (req, res) => {
  res.render('home');
});

// webhook validation
app.get('/webhook', (req, res) => {
  if (req.query['hub.mode'] === 'subscribe' && req.query['hub.verify_token'] === config.VALIDATION_TOKEN) {
    winston.info('Validating webhook');
    res.status(200).send(req.query['hub.challenge']);
  } else {
    winston.error('Failed validation. Make sure the validation tokens match.');
    res.sendStatus(403);
  }
});

// posts to webhook
app.post('/webhook', (req, res) => {
  const data = req.body;

  if (data.object === 'page') {
		// loop all entries
    data.entry.forEach(pageEntry => {
			// Iterate over each messaging event
      pageEntry.messaging.forEach(messagingEvent => {
        if (messagingEvent.optin) {
          botMethods.receivedAuthentication(messagingEvent);
        } else if (messagingEvent.message) {
          botMethods.receivedMessage(messagingEvent);
        } else if (messagingEvent.delivery) {
          botMethods.receivedDeliveryConfirmation(messagingEvent);
        } else if (messagingEvent.postback) {
          botMethods.receivedPostback(messagingEvent);
        } else {
          winston.warn('Webhook received unknown messagingEvent', messagingEvent);
        }
      });
    });

    res.sendStatus(200);
  }
});

module.exports = app;
