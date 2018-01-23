const ArticleService = require('../service/article')
const Router = require('koa-router')
const router = new Router();

router.post('/saveArticle', async(ctx, next)=>{
    // console.log(ctx)
    // console.log(ctx.request.body,'333')
    let data = ctx.request.body
    // ctx.body = 'hello world'
    let rs = await ArticleService.save(data)
    ctx.body = rs
})


module.exports = router