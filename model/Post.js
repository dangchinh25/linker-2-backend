const mongoose = require("mongoose")
const Schema = mongoose.Schema

const postSchema = new Schema({
	userOwner: { type: mongoose.Types.ObjectId, ref: "UserAuth" },
	title: { type: String, required: true },
	text: { type: String, required: true },
	tags: [{ type: String, required: true }],
	votes: {
		upvote: { type: Number, required: true },
		downvote: { type: Number, required: true },
	},
})

module.exports = mongoose.model("Post", postSchema)
