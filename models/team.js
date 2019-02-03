const mongoose = require("mongoose");

const subscriptionSchema = mongoose.Schema({
	tricode: String,
	userTokens: [String],
});

module.exports = mongoose.model("Subscription", subscriptionSchema);
