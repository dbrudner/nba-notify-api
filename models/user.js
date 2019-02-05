const mongoose = require("mongoose");

const userSchema = mongoose.Schema({
	userToken: String,
	subscriptions: [String],
});

module.exports = mongoose.model("User", userSchema);
