const jwt = require("jsonwebtoken")
const HttpError = require("../errors/HttpError")

const validateToken = (req, res, next) => {
	const authHeader = req.headers["authorization"]
	const token = authHeader && authHeader.split(" ")[1]

	if (!token)
		return next(new HttpError("No token, authorization failed", 401))

	try {
		const decoded = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET)
		req.user = decoded
		next()
	} catch (err) {
		return next(new HttpError("Token is not valid", 400))
	}
}

module.exports = validateToken
