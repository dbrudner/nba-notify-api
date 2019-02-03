require("dotenv").config();
const bodyParser = require("body-parser");
const cors = require("cors");
const express = require("express");
const mongoose = require("mongoose");
const port = process.env.PORT || 3000;
const db = require("./models");

mongoose.connection.on("open", function() {
	console.log("Connected to mongo server.");
});

mongoose.connect(process.env.ATLAS_URI, { useNewUrlParser: true });

const server = express();

const whitelist = ["https://nba-notify.herokuapp.com/"];
const corsOptions = {
	origin: (origin, callback) => {
		console.log(origin);
		if (whitelist.indexOf(origin) !== -1) {
			callback(null, true);
		} else {
			callback(new Error("Not allowed by CORS"));
		}
	},
};

server.use(bodyParser.urlencoded({ extended: true }));
server.use(bodyParser.json());

server.post("/subscribe", cors(corsOptions), (req, res) => {
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
					res.json({ tricode: subscription.tricode });
				},
			);
		}
	});
});

server.listen(port, err => {
	if (err) throw err;
	console.log(`> Ready on http://localhost:${port}`);
});
