const mongoose = require('mongoose')
const article = new mongoose.Schema({
    articleId: {type: String},
    title: {type: String},
    content: {type: String},
    by: {type: String},
    modifyOn: {type: Date, default: Date.now},    
})
module.exports = mongoose.model('article', article)