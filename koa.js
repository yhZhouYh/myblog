const Koa = require('koa')
const logger = require('./logger')
const static = require("koa-static");
const path = require('path')
const config = require('./config')
const router = require('./router')
const bodyParser = require('koa-bodyparser')()
// const router = require('./router')

// 静态资源目录对于相对入口文件index.js的路径
const staticPath = './'
const app = new Koa()

//db start
const { host, database, port, url } = config.db
const mongoose = require('mongoose')
mongoose.Promise = global.Promise
mongoose.connect(url, { useMongoClient: true })
app.use(static(
    path.join( __dirname,  staticPath)
  ))


// app.use(logger())
// app.use(async (ctx) => {
//   ctx.body = 'hello'
// })
app.use(bodyParser)
app.use(router.routes()).use(router.allowedMethods())
app.listen(9090)


console.log('[demo] start-quick is starting at port 9090')
