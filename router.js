const fs = require('fs')

/**
 * 获取文件
 * @param {string} page 
 */
function render(page) {
    return Promise((resolve, reject) => {
        let url = './${page}'
        fs.readSync(url, 'binary', (err, data) => {
            if (err) {
                reject(err)
            } else {
                resolve(data)
            }
        })
    })
}

async function route(url){
    let view = 'index.html'
    switch(url){
        case '/':
        view ='index.html'
    }
}

