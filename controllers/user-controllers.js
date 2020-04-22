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
		images: [],
		posts: [],
		peopleConnected: [],
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
