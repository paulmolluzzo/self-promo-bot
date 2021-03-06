'use strict';

const winston = require('winston');
const rp = require('request-promise-native');
const promiseDelay = require('promise-delay');
const config = require('./config');
const userReminders = require('./user-reminders');

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
    const isEcho = message.is_echo;
    const msgSticker = message.sticker_id;
    const likeStickerID = 369239263222822;

    // find or create a user for future reminders
    userReminders.findOrCreateUser(senderID);

    if (isEcho) {
      return;
    }
    // You may get a text or attachment but not both
    const messageText = message.text;

    // if there's no message then there's an attachment
    if (!messageText) {
      if (msgSticker === likeStickerID) {
        return this.sendTextMessage(senderID, `Aww, I like you too. 👍`);
      }

      message.attachments.forEach(attachment => {
        if (attachment.payload && attachment.payload.url) {
          winston.info('Received message with attachment for user %d and page %d at %d. Link:', senderID, recipientID, timeOfMessage, attachment.payload.url);
        }
      });

      return this.sendGifMessage(senderID).then(() => {
        return this.sendTextMessage(senderID, `Thanks for the attachment!`);
      });
    }

    winston.info('Received message for user %d and page %d at %d with message: %s', senderID, recipientID, timeOfMessage, messageText);

    if (this.checkMessage('gif', messageText)) {
      return this.sendGifMessage(senderID);
    }

    if (this.checkMessage('contact|reach', messageText)) {
      return this.sendTextMessage(senderID, `Pauls email address is paul@molluzzo.com`, 3000).then(() => {
        this.sendContactInfo(senderID, 'Or you can call/tweet him.', 3000).then(() => {
          this.sendWebPresence(senderID, undefined, 3000);
        });
      }).catch(err => {
        winston.error(err);
        return this.sendTextMessage(senderID, `I think you broke something! 😲 Try again or ask for help.`).then(() => {
          return this.sendQuickOptions(senderID);
        });
      });
    }

    if (this.checkMessage('email', messageText)) {
      return this.sendTextMessage(senderID, `Pauls email is paul@molluzzo.com`, 1000);
    }

    if (this.checkMessage('phone', messageText)) {
      return this.sendContactInfo(senderID, undefined, 3000, ['phone']);
    }

    if (this.checkMessage('tech|stack|software', messageText)) {
      return this.sendTechnologiesMessage(senderID, 3000).then(() => {
        return this.sendTextMessage(senderID, `It looks kind of crazy when I write it all out like that! 😅`, 1000);
      });
    }

    if (this.checkMessage('oss|open source', messageText)) {
      return this.sendTextMessage(senderID, `Paul loves OSS! He's built or contributed to a bunch of cool open source things, and keeps his eyes open for new stuff the community is building. Here are a few worth poking at:`, 2000).then(() => {
        return this.sendProjectsMessage(senderID, ['open-source'], 3000, [{
          content_type: 'text',
          title: 'See paid work',
          payload: `See paid work`
        }, {
          content_type: 'text',
          title: `See Tech Skills`,
          payload: `See Tech Skills`
        }]);
      });
    }

    if (this.checkMessage('work', messageText)) {
      return this.sendTextMessage(senderID, `Paul has a bunch of paid work he's proud of (and he's always looking for new projects 😉). Here are some that come to mind:`, 2000).then(() => {
        return this.sendProjectsMessage(senderID, ['work'], 3000, [{
          content_type: 'text',
          title: 'View Contact Info',
          payload: `View Contact Info`
        }, {
          content_type: 'text',
          title: `See Tech Skills`,
          payload: `See Tech Skills`
        }]);
      });
    }

    if (this.checkMessage('projects', messageText)) {
      return this.sendTextMessage(senderID, `Here's a mix of paid work and OSS projects that you might like. Email Paul if any stand out for you.`, 2000).then(() => {
        return this.sendProjectsMessage(senderID, ['work', 'open-source'], 3000, [{
          content_type: 'text',
          title: 'View Contact Info',
          payload: `View Contact Info`
        }, {
          content_type: 'text',
          title: `See Tech Skills`,
          payload: `See Tech Skills`
        }]);
      });
    }

    if (this.checkMessage('help', messageText)) {
      return this.sendHelpMessage(senderID);
    }

    if (this.checkMessage('sign|astrology|astrological|zodiac|Aries|Taurus|Gemini|Cancer|Leo|Virgo|Libra|Scorpio|Sagittarius|Capricorn|Aquarius|Pisces', messageText)) {
      return this.sendTextMessage(senderID, `Paul's on the cusp of Leo and Virgo. 😉`, 1000);
    }

    if (this.checkMessage('hey', messageText)) {
      return this.sendTextMessage(senderID, `Hey is for horses. 😂`, 1000).then(() => {
        return this.sendQuickOptions(senderID);
      });
    }

    winston.warn('Unhandled message: %s', messageText);
    return this.sendTextMessage(senderID, `That's a new one. I'll ask Paul to add an answer. In the meantime maybe ask for help?`, 1000).then(() => {
      return this.sendQuickOptions(senderID);
    });
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

  sendSenderAction(recipientId, actionType) {
    const messageData = {
      recipient: {
        id: recipientId
      },
      sender_action: actionType
    };

    return this.callSendAPI(messageData);
  },

  sendMarkSeen(recipientId) {
    return this.sendSenderAction(recipientId, 'mark_seen');
  },

  sendTypingOn(recipientId) {
    return this.sendSenderAction(recipientId, 'typing_on');
  },

  sendTypingOff(recipientId) {
    return this.sendSenderAction(recipientId, 'typing_off');
  },

  sendTextMessage(recipientId, messageText, delay = 0) {
    const messageData = {
      recipient: {
        id: recipientId
      },
      message: {
        text: messageText
      }
    };

    return this.sendTypingOn(recipientId).then(() => {
      return promiseDelay(delay, this.callSendAPI(messageData));
    });
  },

  sendHelpMessage(recipientId) {
    const messageData = {
      recipient: {
        id: recipientId
      },
      message: {
        text: `Need some help, huh? You can try sending messages like:
* What's your contact info?
* Have you done any open source?
* Can I see a list of work you've done?
* Have any cool projects worth checking out?
* What technologies have you used?`,
        quick_replies: [{
          content_type: 'text',
          title: 'Get contact info',
          payload: `Get contact info`
        },
          {
            content_type: 'text',
            title: 'See OSS work',
            payload: `See OSS work`
          },
          {
            content_type: 'text',
            title: 'See paid work',
            payload: `See paid work`
          },
          {
            content_type: 'text',
            title: `See Tech Skills`,
            payload: `See Tech Skills`
          }]
      }
    };

    return this.callSendAPI(messageData);
  },

  sendQuickOptions(recipientId, text = `Here are some options you can try:`) {
    const messageData = {
      recipient: {
        id: recipientId
      },
      message: {
        text: text,
        quick_replies: [{
          content_type: 'text',
          title: 'Get contact info',
          payload: `Get contact info`
        }, {
          content_type: 'text',
          title: 'See OSS work',
          payload: `See OSS work`
        }, {
          content_type: 'text',
          title: 'See paid work',
          payload: `See paid work`
        }, {
          content_type: 'text',
          title: `See Tech Skills`,
          payload: `See Tech Skills`
        }]
      }
    };

    return this.callSendAPI(messageData);
  },

  callSendAPI(messageData) {
    return rp({
      uri: 'https://graph.facebook.com/v2.6/me/messages',
      qs: {access_token: config.PAGE_ACCESS_TOKEN},
      method: 'POST',
      json: messageData
    }).then(body => {
      const recipientId = body.recipient_id;
      const messageId = body.message_id;
      let messageType = messageData.sender_action || 'text';

      if (messageData.message !== undefined && messageData.message.attachment !== undefined) {
        messageType = messageData.message.attachment.type;
      }

      winston.info('Successfully sent %s message with id %s to recipient %s', messageType, messageId, recipientId);
    }).catch(err => {
      winston.error('Unable to send message.', err);
    });
  },

  sendGenericMessage(recipientId, elements, delay = 0, quickReplies) {
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
        },
        quick_replies: quickReplies
      }
    };

    return this.sendTypingOn(recipientId).then(() => {
      return promiseDelay(delay, this.callSendAPI(messageData));
    });
  },

  sendProjectsMessage(recipientId, projectTypes, delay = 0, quickReplies = []) {
    const projectList = [];

    const workProjects = [{
      title: `Origins Holiday Treasure Hunt`,
      subtitle: `Web mini game built with Angular and ThreeJS`,
      image_url: `${config.SERVER_URL}/assets/origins.gif`,
      buttons: [{
        type: 'postback',
        title: 'View Tech Stack',
        payload: `Angular, Three.js (WebGL), and Rails 4.`
      }]
    }, {
      title: `SoftBank Robotics Developer Portal`,
      subtitle: `Global portal with developer documentation and forums`,
      item_url: `https://developer.softbankrobotics.com/`,
      image_url: `${config.SERVER_URL}/assets/sbr.jpg`,
      buttons: [{
        type: 'web_url',
        url: `https://developer.softbankrobotics.com/`,
        title: 'Build for Pepper'
      }, {
        type: 'postback',
        title: 'View Tech Stack',
        payload: `PHP (Drupal 7) and jQuery, with custom integrations for PingOne Identity mgmt and Meetup.com.`
      }]
    }, {
      title: `Isaora`,
      subtitle: `Performance clothing and progressive style.`,
      item_url: `https://www.isaora.com/`,
      image_url: `${config.SERVER_URL}/assets/isaora.jpg`,
      buttons: [{
        type: 'web_url',
        url: `https://www.isaora.com/`,
        title: 'Spend that $$$'
      }, {
        type: 'postback',
        title: 'View Tech Stack',
        payload: `Shopify and jQuery`
      }]
    }, {
      title: `SVGZus`,
      subtitle: `Pop culture coloring book`,
      image_url: `${config.SERVER_URL}/assets/svgzus.jpg`,
      buttons: [{
        type: 'postback',
        title: 'View Tech Stack',
        payload: `Meteor, jQuery, Web Canvas, and AWS`
      }]
    }, {
      title: `Olly Nutrition`,
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
    }, {
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

    const ossProjects = [{
      title: `Refined Github`,
      subtitle: `Chrome extension that simplifies the GitHub interface and adds useful features`,
      item_url: `https://github.com/sindresorhus/refined-github`,
      image_url: `${config.SERVER_URL}/assets/refined-github.png`,
      buttons: [{
        type: 'web_url',
        url: `https://github.com/sindresorhus/refined-github`,
        title: 'View Source'
      }, {
        type: 'web_url',
        url: `https://chrome.google.com/webstore/detail/refined-github/hlepfoohegkhhmjieoechaddaejaokhf`,
        title: '➡💻 on Webstore'
      }]
    }, {
      title: `Pesticide`,
      subtitle: `🐞 Kill your css layout bugs`,
      item_url: `http://pesticide.io/`,
      image_url: `${config.SERVER_URL}/assets/pesticide.gif`,
      buttons: [{
        type: 'web_url',
        url: `https://github.com/mrmrs/pesticide`,
        title: 'View Source'
      }, {
        type: 'web_url',
        url: `https://chrome.google.com/webstore/detail/bblbgcheenepgnnajgfpiicnbbdmmooh`,
        title: '➡💻 on Webstore'
      }]
    }, {
      title: `Anatine`,
      subtitle: `🐤 Pristine Twitter App`,
      item_url: `https://github.com/sindresorhus/anatine`,
      image_url: `${config.SERVER_URL}/assets/anatine.png`,
      buttons: [{
        type: 'web_url',
        url: `https://github.com/sindresorhus/anatine`,
        title: 'View Source'
      }, {
        type: 'web_url',
        url: `https://github.com/sindresorhus/anatine/releases/latest`,
        title: '➡💻'
      }]
    }];

    if (projectTypes.includes('work')) {
      projectList.push(...workProjects);
    }

    if (projectTypes.includes('open-source')) {
      projectList.push(...ossProjects);
    }

    this.sendGenericMessage(recipientId, projectList, delay, quickReplies);
  },

  sendContactInfo(recipientId, message = `Here you go.`, delay = 0, infoTypesArray = ['phone', 'twitter']) {
    const infoTypesButtons = [];

    if (infoTypesArray.indexOf('phone') !== -1) {
      infoTypesButtons.push({
        type: `phone_number`,
        payload: config.PHONE_NUMBER,
        title: `Call Me`
      });
    }

    if (infoTypesArray.indexOf('twitter') !== -1) {
      infoTypesButtons.push({
        type: `web_url`,
        url: `https://twitter.com/paulmolluzzo`,
        title: `Twitter`
      });
    }

    const messageData = {
      recipient: {
        id: recipientId
      },
      message: {
        attachment: {
          type: 'template',
          payload: {
            template_type: 'button',
            text: message,
            buttons: infoTypesButtons
          }
        }
      }
    };

    return this.sendTypingOn(recipientId).then(() => {
      return promiseDelay(delay, this.callSendAPI(messageData));
    });
  },

  sendWebPresence(recipientId, message = `You can also view more info about Paul here:`, delay = 0) {
    const messageData = {
      recipient: {
        id: recipientId
      },
      message: {
        attachment: {
          type: 'template',
          payload: {
            template_type: 'button',
            text: message,
            buttons: [
              {
                type: `web_url`,
                url: `https://paul.molluzzo.com`,
                title: `My Website`
              },
              {
                type: `web_url`,
                url: `https://github.com/paulmolluzzo`,
                title: `GitHub`
              },
              {
                type: `web_url`,
                url: `https://linkedin.com/in/paulmolluzzo`,
                title: `LinkedIn`
              }
            ]
          }
        }
      }
    };

    return this.sendTypingOn(recipientId).then(() => {
      return promiseDelay(delay, this.callSendAPI(messageData));
    });
  },

  sendTechnologiesMessage(recipientId, delay = 0) {
    const messageData = {
      recipient: {
        id: recipientId
      },
      message: {
        text: `Paul's worked with the following tech:
* Frontend- HTML5, CSS3, SASS/SCSS/LESS, JS, Angular 1, jQuery
* Backend & CMS - Ruby on Rails, PHP, Node, WordPress, Shopify, Drupal 7
* Servers & PaaS: Apache, Ubuntu, AWS (S3, EC2, CloudFront, IAM), Heroku
* Source Control - Git, SVN`
      }
    };

    return this.sendTypingOn(recipientId).then(() => {
      return promiseDelay(delay, this.callSendAPI(messageData));
    });
  },

  sendReminderTextMessage(recipientId) {
    const messageData = {
      recipient: {
        id: recipientId
      },
      message: {
        text: `Did you know you can send your own questions too? You can try sending messages like:
* What is Pauls phone number?
* Has Paul done any open source code?
* Can I see a list of Pauls skills?`
      }
    };

    return this.callSendAPI(messageData);
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

    return this.callSendAPI(messageData);
  },

  receivedPostback(event) {
    const senderID = event.sender.id;
    const recipientID = event.recipient.id;
    const timeOfPostback = event.timestamp;

    // The 'payload' param is a developer-defined field which is set in a postback
    // button for Structured Messages.
    const payload = event.postback.payload;

    winston.info('Received postback for user %d and page %d with payload %s at %d', senderID, recipientID, payload, timeOfPostback);

    if (payload === 'clicked_getting_started') {
      return this.sendTextMessage(senderID, `Paul is a web developer specializing in e-commerce and interactive web development. I am his pet chatbot. 😎`, 1000).then(() => {
        return this.sendQuickOptions(senderID);
      });
    }

    // When a postback is called, we'll send a message back to the sender to
    // let them know it was successful
    this.sendTextMessage(senderID, `This site was built with ${payload}`);
  }
};

module.exports = botMethods;
