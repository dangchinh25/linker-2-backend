const router = require("express").Router()
const postController = require("../controllers/post-controllers")
const validateToken = require("../middleware/validateToken")

router.get("/", postController.getAllPost)
router.get("/search", postController.getPostByTag)
router.post("/vote/:pid", validateToken, postController.votePost)
router.post("/new", validateToken, postController.createPost)
router.delete("/delete/:pid", validateToken, postController.deletePostById)
router.patch("/edit/:pid", validateToken, postController.editPostById)

module.exports = router
