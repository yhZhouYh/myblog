module.exports = ()=>{
    return async (ctx, next) =>{
        console.log(ctx.methods, ctx.header.host + ctx.url)
        await next()
    }
}