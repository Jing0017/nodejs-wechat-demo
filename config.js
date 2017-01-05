'use strict'
var path = require('path')
var util = require('./libs/util')
var wechat_file = path.join(__dirname, './config/wechat.txt')
var wechat_ticket_file = path.join(__dirname, './config/wechat_ticket.txt')
var config = {
    wechat: {
        appID: 'wx192dea1777d45bf9',
        appSecret: '475a6a8c7156cc532f41d9e19863c9ad',
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