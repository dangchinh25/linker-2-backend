const mongoose = require("mongoose")
const Schema = mongoose.Schema

const newUser = new Schema({
	name: { type: String, required: true },
	email: { type: String, required: true, unique: true },
	password: { type: String, required: true, minlength: 6 },
	age: { type: Number },
	gender: { type: String },
	images: [{ type: String }],
	posts: [{ type: mongoose.Types.ObjectId, ref: "Post" }],
	peopleConnected: [{ type: mongoose.Types.ObjectId, ref: "UserAuth" }],
})

module.exports = mongoose.model("UserAuth", newUser)
