const Koa = require('koa')
const logger = require('./logger')

const app = new Koa()

app.use(logger())
app.use( async(ctx) =>{
    ctx.body = 'hello koa'
})

app.listen(3000)

console.log('[demo] start-quick is starting at port 3000')
