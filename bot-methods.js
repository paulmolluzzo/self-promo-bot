'use strict';

const winston = require('winston');
const request = require('request');
const config = require('./config');

const botMethods = {
	checkMessage(pattern, msg) {
		const rePattern = new RegExp(pattern, 'i');
		return rePattern.test(msg);
	},

	receivedMessage(event) {
		const senderID = event.sender.id;
		const recipientID = event.recipient.id;
		const timeOfMessage = event.timestamp;
		const message = event.message;

		winston.info('Received message for user %d and page %d at %d with message: %s', senderID, recipientID, timeOfMessage, JSON.stringify(message));

		// You may get a text or attachment but not both
		const messageText = message.text;

		// if there's no message then there's an attachment
		if (!messageText) {
			this.sendGifMessage(senderID);
			return this.sendTextMessage(senderID, `Thanks for the attachment!`);
		}

		if (this.checkMessage('gif', messageText)) {
			return this.sendGifMessage(senderID);
		}

		if (this.checkMessage('projects', messageText)) {
			return this.sendProjectsMessage(senderID);
		}

		return this.sendTextMessage(senderID, messageText);
	},

	receivedAuthentication(event) {
		const senderID = event.sender.id;
		const recipientID = event.recipient.id;
		const timeOfAuth = event.timestamp;

		// The 'ref' field is set in the 'Send to Messenger' plugin, in the 'data-ref'
		// The developer can set this to an arbitrary value to associate the
		// authentication callback with the 'Send to Messenger' click event. This is
		// a way to do account linking when the user clicks the 'Send to Messenger'
		// plugin.
		const passThroughParam = event.optin.ref;

		winston.info('Received authentication for user %d and page %d with pass through param %s at %d', senderID, recipientID, passThroughParam, timeOfAuth);

		// When an authentication is received, we'll send a message back to the sender
		// to let them know it was successful.
		this.sendTextMessage(senderID, 'Authentication successful');
	},

	receivedDeliveryConfirmation(event) {
		const delivery = event.delivery;
		const messageIDs = delivery.mids;
		const watermark = delivery.watermark;

		if (messageIDs) {
			messageIDs.forEach(messageID => {
				winston.info('Received delivery confirmation for message ID: %s', messageID);
			});
		}

		winston.info('All messages before %d were delivered.', watermark);
	},

	sendTextMessage(recipientId, messageText) {
		const messageData = {
			recipient: {
				id: recipientId
			},
			message: {
				text: messageText
			}
		};

		this.callSendAPI(messageData);
	},

	callSendAPI(messageData) {
		request({
			uri: 'https://graph.facebook.com/v2.6/me/messages',
			qs: {access_token: config.PAGE_ACCESS_TOKEN},
			method: 'POST',
			json: messageData

		}, (error, response, body) => {
			if (!error && response.statusCode === 200) {
				const recipientId = body.recipient_id;
				const messageId = body.message_id;

				winston.info('Successfully sent generic message with id %s to recipient %s', messageId, recipientId);
			} else {
				winston.error('Unable to send message.', response, error);
			}
		});
	},

	sendGenericMessage(recipientId, elements) {
		const messageData = {
			recipient: {
				id: recipientId
			},
			message: {
				attachment: {
					type: 'template',
					payload: {
						template_type: 'generic',
						elements: elements
					}
				}
			}
		};

		this.callSendAPI(messageData);
	},

	sendProjectsMessage(recipientId) {
		const elements = [{
			title: `Isaora`,
			subtitle: `Performance clothing and progressive style.`,
			item_url: `https://www.isaora.com/`,
			image_url: `${config.SERVER_URL}/assets/isaora.jpg`,
			buttons: [{
				type: 'web_url',
				url: `https://www.isaora.com/`,
				title: 'Buy Stuff'
			}, {
				type: 'postback',
				title: 'View Tech Stack',
				payload: `Shopify and jQuery`
			}]
		},{
			title: `SVGZus`,
			subtitle: `Pop culture coloring book`,
			item_url: `http://svgz.us/`,
			image_url: `${config.SERVER_URL}/assets/svgzus.jpg`,
			buttons: [{
				type: 'web_url',
				url: `http://svgz.us/`,
				title: 'Color In'
			}, {
				type: 'postback',
				title: 'View Tech Stack',
				payload: `Meteor, jQuery, Web Canvas, and AWS`
			}]
		},{
			title: `Olly Nutrrition`,
			subtitle: `Pop culture coloring book`,
			item_url: `https://www.olly.com/`,
			image_url: `${config.SERVER_URL}/assets/olly.jpg`,
			buttons: [{
				type: 'web_url',
				url: `https://www.olly.com/`,
				title: 'Pop a Vitamin'
			}, {
				type: 'postback',
				title: 'View Tech Stack',
				payload: `Rails and jQuery`
			}]
		},{
			title: `Fulcrum Group`,
			subtitle: `A brochure site with javascript and nifty images`,
			item_url: `http://the-fulcrum.com/`,
			image_url: `${config.SERVER_URL}/assets/fulcrum.jpg`,
			buttons: [{
				type: 'web_url',
				url: `http://the-fulcrum.com/`,
				title: 'Scroll Through'
			}, {
				type: 'postback',
				title: 'View Tech Stack',
				payload: `Rails and jQuery`
			}]
		}];

		this.sendGenericMessage(recipientId, elements);
	},

	sendGifMessage(recipientId) {
		var messageData = {
			recipient: {
				id: recipientId
			},
			message: {
				attachment: {
					type: 'image',
					payload: {
						url: `${config.SERVER_URL}/assets/robot.gif`
					}
				}
			}
		};

		this.callSendAPI(messageData);
	},

	receivedPostback(event) {
		const senderID = event.sender.id;
		const recipientID = event.recipient.id;
		const timeOfPostback = event.timestamp;

		// The 'payload' param is a developer-defined field which is set in a postback
		// button for Structured Messages.
		const payload = event.postback.payload;

		winston.info('Received postback for user %d and page %d with payload %s at %d', senderID, recipientID, payload, timeOfPostback);

		// When a postback is called, we'll send a message back to the sender to
		// let them know it was successful
		this.sendTextMessage(senderID, `This site was built with ${payload}`);
	}
};

module.exports = botMethods;
