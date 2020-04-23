const HttpError = require("../errors/HttpError")
const UserAuth = require("../model/UserAuth")
const Post = require("../model/Post")
const mongoose = require("mongoose")
const jwt = require("jsonwebtoken")
const url = require("url")

const getAllPost = async (req, res, next) => {
	let posts
	try {
		posts = await Post.find()
	} catch (error) {
		return next(
			new HttpError("Can't get list of post, please try again", 500)
		)
	}

	res.json({
		posts,
	})
}

const getPostByTag = async (req, res, next) => {
	const queryObject = url.parse(req.url, true).query
	const queryTag = queryObject.tag

	let posts
	try {
		posts = await Post.find({ tags: queryTag })
	} catch (error) {
		return next(new HttpError("Something went wrong", 500))
	}

	res.json(posts)
}

const createPost = async (req, res, next) => {
	const { title, text, tags } = req.body

	let user
	try {
		user = await UserAuth.findById(req.user.userId)
	} catch (error) {
		return next(
			new HttpError("Could not find the user for the provided id", 500)
		)
	}

	if (!user)
		return next(
			new HttpError("Could not find the user for the provided id", 404)
		)

	const newPost = new Post({
		title,
		text,
		tags,
		votes: {
			upvote: 0,
			downvote: 0,
		},
		userOwner: req.user.userId,
	})

	try {
		const sess = await mongoose.startSession()
		sess.startTransaction()
		await newPost.save({ session: sess })
		user.posts.push(newPost)
		await user.save({ session: sess })
		await sess.commitTransaction()
	} catch (error) {
		console.log(error)
		return next(new HttpError("Create post failed", 404))
	}

	res.status(201).json({ post: newPost })
}

const votePost = async (req, res, next) => {
	const postId = req.params.pid
	const { voteType } = req.body

	let post
	try {
		post = await Post.findById(postId)
	} catch (error) {
		return next(
			new HttpError("Could not find post for the provided Id", 500)
		)
	}

	if (!post) {
		return next(
			new HttpError("Could not find post for the provided Id", 500)
		)
	}
	if (voteType === "upvote") {
		post.votes.upvote += 1
	} else {
		post.votes.downvote += 1
	}

	try {
		await post.save()
	} catch (error) {
		return next(new HttpError("Something went wrong", 500))
	}

	res.json(post)
}

const deletePostById = async (req, res, next) => {
	const postId = req.params.pid

	let post
	try {
		post = await Post.findById(postId).populate("userOwner")
	} catch (error) {
		console.log(error)
		return next(new HttpError("Can't find post for the provided id", 500))
	}

	if (!post) {
		return next(new HttpError("Can't find post for the provided id", 500))
	}

	if (!(post.userOwner._id == req.user.userId)) {
		return next(
			new HttpError("You are not allowed to delete this post", 500)
		)
	}

	try {
		const sess = await mongoose.startSession()
		sess.startTransaction()
		await post.remove({ session: sess })
		post.userOwner.posts.pull(post)
		await post.userOwner.save({ session: sess })
		await sess.commitTransaction()
	} catch (error) {
		return next(new HttpError("Something went wrong", 500))
	}

	res.status(201).json({ message: "Deleted post" })
}

const editPostById = async (req, res, next) => {
	const postId = req.params.pid
	const { title, text } = req.body

	let post
	try {
		post = await Post.findById(postId).populate("userOwner")
	} catch (error) {
		console.log(error)
		return next(new HttpError("Can't find post for the provided id", 500))
	}

	if (!post) {
		return next(new HttpError("Can't find post for the provided id", 500))
	}

	if (!(post.userOwner._id == req.user.userId)) {
		return next(
			new HttpError("You are not allowed to delete this post", 500)
		)
	}

	post.title = title
	post.text = text

	try {
		await post.save()
	} catch (error) {
		return next(
			new HttpError("Something went wrong, can't update post", 500)
		)
	}

	res.status(200).json(post)
}

exports.createPost = createPost
exports.getAllPost = getAllPost
exports.deletePostById = deletePostById
exports.getPostByTag = getPostByTag
exports.editPostById = editPostById
exports.votePost = votePost
