'use strict'
var path = require('path')
var util = require('./libs/util')
var wechat_file = path.join(__dirname, './config/wechat.txt')
var wechat_ticket_file = path.join(__dirname, './config/wechat_ticket.txt')
var config = {
    wechat: {
        // appID: 'wx192dea1777d45bf9',//正式
        appID: 'wxcd9b5e2da5f6f52b',//测试
        // appSecret: '475a6a8c7156cc532f41d9e19863c9ad',
        appSecret: 'fd5af8a527684f4167e3ff3101f06828',//测试
        token: 'wechatToken20161209',
        getAccessToken: function () {
            return util.readFileAsync(wechat_file)
        },
        saveAccessToken: function (data) {
            data = JSON.stringify(data)
            return util.writeFileAsync(wechat_file, data)
        },
        getTicket: function () {
            return util.readFileAsync(wechat_ticket_file)
        },
        saveTicket: function (data) {
            data = JSON.stringify(data)
            return util.writeFileAsync(wechat_ticket_file, data)
        }
    }
}

module.exports = config