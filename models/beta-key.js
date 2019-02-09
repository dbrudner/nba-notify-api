const mongoose = require("mongoose");

const betaKeySchema = mongoose.Schema({
	key: String,
	maxUsers: Number,
	registeredUsers: Number,
	validUntil: Date,
	name: String,
});

module.exports = mongoose.model("betaKey", betaKeySchema);
