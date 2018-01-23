const articleModel = require('../model/article')

module.exports = {
    async save(data) {
        return articleModel.create(data)
    }
}