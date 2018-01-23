const Router = require('koa-router')
const router = new Router();
const Article = require('./controller/article')

router.use('/article', Article.routes())

module.exports = router