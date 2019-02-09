if (process.env.NODE_ENV !== "production") require("dotenv").config();
const bodyParser = require("body-parser");
const cors = require("cors");
const express = require("express");
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
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

server.post("/unsubscribe", (req, res) => {
	db.Subscription.findOneAndUpdate(
		{ tricode: req.body.tricode },
		{ $pull: { userTokens: req.body.userToken } },
		(err, subscription) => {
			if (err) {
				throw err;
			}

			db.User.findOneAndUpdate(
				{ userToken: req.body.userToken },
				{ $pull: { subscriptions: req.body.tricode } },
				(err, user) => {
					if (err) {
						throw err;
					}
					res.json(user);
				},
			);
		},
	);
});

server.get("/subscriptions", (req, res) => {
	db.Subscription.find({}, (err, subscriptions) => {
		if (err) {
			throw err;
		}

		res.json({ subscriptions });
	});
});

server.get("/subscription", (req, res) => {
	const { tricode } = req.query;
	db.Subscription.findOne({ tricode }, (err, subscription) => {
		if (err) {
			throw err;
		}

		res.json({ subscription });
	});
});

server.get("/user", (req, res) => {
	const { userToken } = req.query;
	db.User.findOne({ userToken }, (err, user) => {
		if (err) {
			throw err;
		}
		res.json(user);
	});
});

server.get("/users", (req, res) => {
	db.User.find({}, (err, users) => {
		if (err) {
			throw err;
		}

		res.json({ users });
	});
});

server.get("/verify", (req, res) => {
	const { key, name } = req.query;

	db.betaKey.findOne({ name }, (err, betaKey) => {
		if (err) {
			throw err;
		}

		bcrypt.compare(key, betaKey.key, (err, validKey) => {
			if (err) {
				throw err;
			}

			if (!validKey) {
				return res.status(401).json({
					valid: false,
					message: "This key is invalid",
				});
			}

			if (betaKey.registeredUsers + 1 >= betaKey.maxUsers) {
				return res.status(401).json({
					valid: false,
					message: "This key has reached max allowed users",
					registeredUsers: betaKey.registeredUsers,
					maxUsers: betaKey.maxUsers,
				});
			}

			db.betaKey.findOneAndUpdate(
				{ name },
				{ $inc: { registeredUsers: 1 } },
				(err, betaKey) => {
					if (err) {
						throw err;
					}
					return res.json({
						valid: true,
						registeredUsers: betaKey.registeredUsers + 1,
						maxUsers: betaKey.maxUsers,
					});
				},
			);
		});
	});
});

server.post("/create-beta-key", async (req, res) => {
	const { CREATE_BETA_KEY_SECRET, maxUsers, validUntil, name } = req.body;

	if (CREATE_BETA_KEY_SECRET !== process.env.CREATE_BETA_KEY_SECRET) {
		return res.status(401).json("go away");
	}

	db.betaKey.findOne({ name }, async (err, key) => {
		if (err) {
			throw err;
		}

		if (key) {
			res.status(422).json({ message: "API key name is not unique" });
		} else {
			const newKey = await bcrypt.hash(req.body.betaKey, 10);

			await db.betaKey.create(
				{
					key: newKey,
					name: name,
					maxUsers: maxUsers || 10,
					registeredUsers: 0,
					validUntil: validUntil,
				},
				(err, betaKey) => {
					if (err) {
						throw err;
					}

					res.json({ name: betaKey.name });
				},
			);
		}
	});
});

server.listen(port, err => {
	if (err) throw err;
	console.log(`> Ready on http://localhost:${port}`);
});
