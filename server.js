if (process.env.NODE_ENV !== "production") require("dotenv").config();
const bodyParser = require("body-parser");
const cors = require("cors");
const express = require("express");
const mongoose = require("mongoose");
const port = process.env.PORT || 3000;
const db = require("./models");

mongoose.connection.on("open", function() {
	console.log("Connected to mongo server.");
});

mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true });

const server = express();

server.use(bodyParser.urlencoded({ extended: true }));
server.use(bodyParser.json());
server.use(cors());

server.post("/subscribe", (req, res) => {
	const { userToken, tricode } = req.body;
	db.Subscription.findOne({ tricode }, (err, subscription) => {
		if (err) {
			throw err;
		}

		if (!subscription) {
			db.Subscription.create(
				{
					tricode,
					userTokens: [userToken],
				},
				(err, subscription) => {
					if (err) {
						throw err;
					}
					res.json({ tricode: subscription.tricode });
				},
			);
		} else {
			db.Subscription.findOneAndUpdate(
				{ tricode },
				{ $push: { userTokens: userToken } },
				(err, subscription) => {
					if (err) {
						throw err;
					}
					db.User.findOneAndUpdate(
						{ userToken },
						{
							$push: { subscriptions: tricode },
						},
						(err, user) => {
							if (err) {
								throw err;
							}

							if (!user) {
								db.User.create(
									{
										userToken,
										subscriptions: [tricode],
									},
									(err, newUser) => {
										if (err) {
											throw err;
										}

										res.json(newUser);
									},
								);
							} else {
								res.json({ tricode, user });
							}
						},
					);
				},
			);
		}
	});
});

server.get("/subscriptions", (req, res) => {
	db.Subscription.find({}, (err, subscriptions) => {
		if (err) {
			throw err;
		}

		res.json({ subscriptions });
	});
});

server.get("/user", (req, res) => {
	const { user } = req.query;
});

server.get("/users", (req, res) => {
	db.User.find({}, (err, users) => {
		if (err) {
			throw err;
		}

		res.json({ users });
	});
});

server.listen(port, err => {
	if (err) throw err;
	console.log(`> Ready on http://localhost:${port}`);
});
