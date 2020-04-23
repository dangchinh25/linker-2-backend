const HttpError = require("../errors/HttpError")
const UserAuth = require("../model/UserAuth")
const jwt = require("jsonwebtoken")
const bcrypt = require("bcrypt")
const mongoose = require("mongoose")

const signUp = async (req, res, next) => {
	const { name, email, password } = req.body

	let existingUSer
	try {
		existingUSer = await UserAuth.findOne({ email: email })
	} catch (err) {
		return next(
			new HttpError("Signing up failed, please try again later", 500)
		)
	}

	if (existingUSer) {
		return next(
			new HttpError(
				"User already existed, please try login instead",
				422
			)
		)
	}

	let hashedPassword
	try {
		hashedPassword = await bcrypt.hash(password, 12)
	} catch (err) {
		return next(
			new HttpError(
				"Could not create user, please try again later",
				500
			)
		)
	}

	const newUser = new UserAuth({
		name,
		email,
		password: hashedPassword,
		age: 18,
		gender: "Male",
		images: "",
		posts: [],
		peopleConnected: [],
		pendingRequest: [],
		incomingRequest: [],
	})

	try {
		await newUser.save()
	} catch (err) {
		return new HttpError(
			"Could not create user, please try again later",
			500
		)
	}

	let token
	try {
		token = jwt.sign(
			{ userId: newUser.id, email: newUser.email },
			process.env.ACCESS_TOKEN_SECRET,
			{
				expiresIn: "1h",
			}
		)
	} catch (err) {
		return next(
			new HttpError("Signing up failed, please try again later.", 500)
		)
	}

	res.status(201).json({
		userId: newUser.id,
		email: newUser.email,
		token: token,
	})
}

const login = async (req, res, next) => {
	const { email, password } = req.body

	let existingUSer

	try {
		existingUSer = await UserAuth.findOne({ email: email })
	} catch (err) {
		return next(
			new HttpError("Logging in failed, please try again later.", 500)
		)
	}

	if (!existingUSer)
		return next(new HttpError("Invalid email/password", 403))

	let isValidPassword = false
	try {
		isValidPassword = await bcrypt.compare(
			password,
			existingUSer.password
		)
	} catch (err) {
		return next(
			new HttpError("Logging in failed, please try again later.", 500)
		)
	}

	if (!isValidPassword)
		return next(
			new HttpError("Logging in failed, please try again later.", 500)
		)

	let token
	try {
		token = jwt.sign(
			{ userId: existingUSer.id, email: existingUSer.email },
			process.env.ACCESS_TOKEN_SECRET,
			{ expiresIn: "1h" }
		)
	} catch (err) {
		console.log(err)
		return next(
			new HttpError("Loggin in failed, please try again later.", 500)
		)
	}

	res.json({
		userId: existingUSer.id,
		email: existingUSer.email,
		token: token,
	})
}

const requestConnect = async (req, res, next) => {
	const userId = req.params.uid

	let thisUser
	try {
		thisUser = await UserAuth.findById(req.user.userId)
	} catch (error) {
		return next(
			new HttpError("Could not find the user for the provided id", 500)
		)
	}

	if (!thisUser)
		return next(
			new HttpError("Could not find the user for the provided id", 404)
		)

	let userConnect
	try {
		userConnect = await UserAuth.findById(userId)
	} catch (error) {
		return next(
			new HttpError("Could not find the user for the provided id", 500)
		)
	}

	if (!userConnect)
		return next(
			new HttpError("Could not find the user for the provided id", 404)
		)

	//user cant send request to people they already connected
	const previousConnected = thisUser.peopleConnected
	const existedConnect = previousConnected.find(
		(connectionId) =>
			connectionId.toString() === userConnect._id.toString()
	)
	if (existedConnect) {
		return next(new HttpError("Already connected", 500))
	}

	//user cant send request to people they already sent request
	const existedPending = thisUser.pendingRequest.find(
		(connectionId) =>
			connectionId.toString() === userConnect._id.toString()
	)
	if (existedPending) {
		return next(new HttpError("Already requested", 500))
	}

	try {
		const sess = await mongoose.startSession()
		sess.startTransaction()
		userConnect.incomingRequest.push(req.user.userId)
		thisUser.pendingRequest.push(userConnect._id)
		await userConnect.save({ session: sess })
		await thisUser.save({ session: sess })
		await sess.commitTransaction()
	} catch (error) {
		console.log(err)
		return next(new HttpError("Something went wrong", 500))
	}

	res.json({ thisUser, userConnect })
}

const acceptConnect = async (req, res, next) => {
	const userId = req.params.uid

	//this user are trying to accept an invitation
	let thisUser
	try {
		thisUser = await (await UserAuth.findById(req.user.userId)).populate(
			"incomingRequest"
		)
	} catch (error) {
		return next(
			new HttpError("Could not find the user for the provided id", 500)
		)
	}

	if (!thisUser)
		return next(
			new HttpError("Could not find the user for the provided id", 404)
		)

	//this user will be accepted
	let acceptedUser
	try {
		acceptedUser = await UserAuth.findById(userId).populate(
			"pendingRequest"
		)
	} catch (error) {
		return next(
			new HttpError("Could not find the user for the provided id", 500)
		)
	}

	if (!acceptedUser)
		return next(
			new HttpError("Could not find the user for the provided id", 404)
		)

	const previousConnected = thisUser.peopleConnected
	const existedConnect = previousConnected.find(
		(connectionId) =>
			connectionId.toString() === acceptedUser._id.toString()
	)
	if (existedConnect) {
		return next(new HttpError("Already connected", 500))
	}

	try {
		const sess = await mongoose.startSession()
		sess.startTransaction()
		acceptedUser.pendingRequest.pull(thisUser._id)
		thisUser.incomingRequest.pull(acceptedUser._id)
		acceptedUser.peopleConnected.push(req.user.userId)
		thisUser.peopleConnected.push(acceptedUser._id)
		await acceptedUser.save({ session: sess })
		await thisUser.save({ session: sess })
		await sess.commitTransaction()
	} catch (error) {
		console.log(err)
		return next(new HttpError("Something went wrong", 500))
	}

	res.json({ thisUser, acceptedUser })
}

const getUserById = async (req, res, next) => {
	const userId = req.params.uid

	let user
	try {
		user = await UserAuth.findById(userId)
	} catch (error) {
		return next(
			new HttpError("Cannot find user for the provided id", 500)
		)
	}

	if (!user) {
		return next(
			new HttpError("Cannot find user for the provided id", 500)
		)
	}

	res.json(user)
}

const getAllUSer = async (req, res, next) => {
	let users
	try {
		users = await UserAuth.find()
	} catch (error) {
		return next(new HttpError("Something went wrong"))
	}

	res.json(users)
}

exports.signUp = signUp
exports.login = login
exports.getUserById = getUserById
exports.getAllUSer = getAllUSer
exports.requestConnect = requestConnect
exports.acceptConnect = acceptConnect
