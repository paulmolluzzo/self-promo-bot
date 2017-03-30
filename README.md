# Self Promo Bot

This is a self promo FB Messenger to make me cool on the internet.

![](./public/assets/chatbot.gif)

# Installation

## Dependencies

Read through the [FB Messenger Quick Start](https://developers.facebook.com/docs/messenger-platform/guides/quick-start) to learn about what is required to build and deploy a FB Messenger bot. Follow the guide there to set up:

* FB Page
* FB App connected to the FB Page

Also, you will need the following services for deployment, logging, and user reminders:

* Hosting service with a static URL (e.g. Heroku or `now` aliased to a specific domain)
* Papertrail
* Mongo DB (e.g. mLabs)

## Set up local repo

1. Fork and clone the repo.
2. Run `npm install`
3. Copy `.env-sample` to `.env` and fill in all the environment variables
4. Deploy.

## Set up deployed environment

1. Create a server instance with your hosting provider.
2. Set up all the environment variables.
3. Push the repo to the server.
4. Run `npm install` on server.
5. Run `npm start` on server.

---

© 2016-2017 Paul Molluzzo
MIT
