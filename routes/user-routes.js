const router = require("express").Router()
const userController = require("..//controllers/user-controllers")
const validateToken = require("../middleware/validateToken")

router.post("/new", userController.signUp)
router.post("/login", userController.login)
router.post("/connect/:uid", validateToken, userController.requestConnect)
router.post("/connect/:uid/accept", validateToken, userController.acceptConnect)
router.get("/all", userController.getAllUSer)
router.get("/:uid", userController.getUserById)

module.exports = router
