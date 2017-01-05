'use strict'
var Promise = require('bluebird')
var _ = require('lodash')
var request = Promise.promisify(require('request'))
var util = require('./util')
var fs = require('fs')
var prefix = 'https://api.weixin.qq.com/cgi-bin/'
var mpPrefix = 'https://mp.weixin.qq.com/cgi-bin/'
var semanticUrl = 'https://api.weixin.qq.com/semantic/semproxy/search?'
var api = {
    semanticUrl: semanticUrl,
    accessToken: prefix + 'token?grant_type=client_credential',
    temporary: {
        upload: prefix + 'media/upload?',
        fetch: prefix + 'media/get?'
    },
    permanent: {
        upload: prefix + 'material/add_material?',
        uploadNews: prefix + 'material/add_news?',
        uploadNewsPic: prefix + 'media/uploadimg?',
        fetch: prefix + 'material/get_material?',
        del: prefix + 'material/del_material?',
        update: prefix + 'material/update_news?',
        count: prefix + 'material/get_materialcount?',
        batch: prefix + 'material/batchget_material?'
    },
    group: {
        create: prefix + 'groups/create?',
        fetch: prefix + 'groups/get?',
        check: prefix + 'groups/getid?',
        update: prefix + 'groups/update?',
        move: prefix + 'groups/members/update?',
        batchMove: prefix + 'groups/members/batchupdate?',
        del: prefix + 'groups/delete?',
    },
    user: {
        remark: prefix + 'user/info/updateremark?',
        fetch: prefix + 'user/info?',
        batchFetch: prefix + 'user/info/batchget?',
        list: prefix + 'user/get?'
    },
    mass: {
        group: prefix + 'message/mass/sendall?',
        openId: prefix + 'message/mass/send?',
        del: prefix + 'message/mass/delete?',
        preview: prefix + 'message/mass/preview?',
        check: prefix + 'message/mass/get?'
    },
    menu: {
        create: prefix + 'menu/create?',
        get: prefix + 'menu/get?',
        del: prefix + 'menu/delete?',
        current: prefix + 'get_current_selfmenu_info?'
    },
    qrcode: {
        create: prefix + 'qrcode/create?',
        show: mpPrefix + 'showqrcode?'
    },
    shortUrl: {
        create: prefix + 'shorturl?'
    },
    ticket:{
        get: prefix + 'ticket/getticket?'
    }
}

/**
 *
 *
 * @param {any} opts
 */
function Wechat(opts) {
    var that = this
    this.appID = opts.appID
    this.appSecret = opts.appSecret
    this.getAccessToken = opts.getAccessToken
    this.saveAccessToken = opts.saveAccessToken
    this.getTicket = opts.getTicket
    this.saveTicket = opts.saveTicket

    this.fetchAccessToken()
}

/**
 *
 *
 * @param {any} data
 * @returns
 */
Wechat.prototype.isValidAccessToken = function (data) {
    if (!data || !data.access_token || !data.expires_in) {
        return false
    }

    var access_token = data.access_token
    var expires_in = data.expires_in
    var now = (new Date().getTime())

    if (now < expires_in) {
        return true
    } else {
        return false
    }
}

/**
 *
 *
 * @returns
 */
Wechat.prototype.updateAccessToken = function () {
    var appID = this.appID
    var appSecret = this.appSecret
    var url = api.accessToken + '&appid=' + appID + '&secret=' + appSecret

    return new Promise(function (resolve, reject) {
        request({url: url, json: true}).then(function (response) {
            var data = response.body
            var now = (new Date().getTime())
            var expires_in = now + (data.expires_in - 20) * 1000

            data.expires_in = expires_in
            resolve(data)
        })
    })
}

/**
 *
 *
 * @param {any} data
 * @returns
 */
Wechat.prototype.fetchAccessToken = function () {
    var that = this

    return this.getAccessToken()
        .then(function (data) {
            try {
                data.JSON.parse(data)
            } catch (e) {
                return that.updateAccessToken()
            }

            if (that.isValidAccessToken(data)) {
                return Promise.resolve(data)
            } else {
                return that.updateAccessToken()
            }
        })
        .then(function (data) {

            that.saveAccessToken(data)

            return Promise.resolve(data)
        })
}

Wechat.prototype.fetchTicket = function (access_token) {
    var that = this

    return this.getTicket()
        .then(function (data) {
            try {
                data.JSON.parse(data)
            } catch (e) {
                return that.updateTicket(access_token)
            }

            if (that.isValidTicket(data)) {
                return Promise.resolve(data)
            } else {
                return that.updateTicket(access_token)
            }
        })
        .then(function (data) {
            that.saveTicket(data)

            return Promise.resolve(data)
        })
}

Wechat.prototype.updateTicket = function (access_token) {
    var url = api.ticket.get + '&access_token=' + access_token + '&type=jsapi'

    return new Promise(function (resolve, reject) {
        request({url: url, json: true}).then(function (response) {
            var data = response.body
            var now = (new Date().getTime())
            var expires_in = now + (data.expires_in - 20) * 1000

            data.expires_in = expires_in
            resolve(data)
        })
    })
}

Wechat.prototype.isValidTicket = function (data) {
    if (!data || !data.ticket || !data.expires_in) {
        return false
    }

    var ticket = data.ticket
    var expires_in = data.expires_in
    var now = (new Date().getTime())

    if (ticket && now < expires_in) {
        return true
    } else {
        return false
    }
}


/**
 *
 *
 * @param {any} type
 * @param {any} material
 * @param {any} permanent
 * @returns
 */
Wechat.prototype.uploadMaterial = function (type, material, permanent) {
    var that = this
    var form = {}
    var uploadUrl = api.temporary.upload

    if (permanent) {
        uploadUrl = api.permanent.upload
        _.extend(form, permanent)
    }

    if (type === 'pic') {
        uploadUrl = api.permanent.uploadNewsPic
    }

    //图文
    if (type === 'news') {
        uploadUrl = api.permanent.uploadNews
        form = material
    } else {//其他类型
        form.media = fs.createReadStream(material)
    }

    return new Promise(function (resolve, reject) {
        that.fetchAccessToken()
            .then(function (data) {
                var url = uploadUrl + 'access_token=' + data.access_token
                if (!permanent) {
                    url += '&type=' + type
                } else {
                    form.access_token = data.access_token
                }

                var options = {
                    method: 'POST',
                    url: url,
                    json: true
                }

                if (type === 'news') {
                    options.body = form
                } else {
                    options.formData = form
                }
                request(options).then(function (response) {
                    var _data = response.body
                    if (_data) {
                        resolve(_data)
                    } else {
                        throw new Error("Upload material fails")
                    }
                }).catch(function (err) {
                    reject(err)
                })
            })
    })
}

/**
 *
 *
 * @param {any} mediaId
 * @param {any} type
 * @param {any} permanent
 * @returns
 */
Wechat.prototype.fetchMaterial = function (mediaId, type, permanent) {
    var that = this
    var fetchUrl = api.temporary.fetch

    if (permanent) {
        fetchUrl = api.permanent.fetch
    }

    return new Promise(function (resolve, reject) {
        that.fetchAccessToken()
            .then(function (data) {
                var url = fetchUrl + 'access_token=' + data.access_token
                var form = {}
                var options = {
                    method: 'POST',
                    url: url,
                    json: true
                }

                if (permanent) {
                    form.media_id = mediaId
                    form.access_token = data.access_token
                    options.body = form
                } else {
                    if (type === 'video') {
                        url = url.replace('https://', 'http://')
                    }
                    url += '&media_id=' + mediaId
                }

                if (type === 'news' || type === 'video') {
                    request(options).then(function (response) {
                        var _data = response.body
                        if (_data) {
                            resolve(_data)
                        } else {
                            throw new Error("fetch material fails")
                        }
                    }).catch(function (err) {
                        reject(err)
                    })
                } else {
                    resolve(url)
                }

            })
    })
}

/**
 *
 *
 * @param {any} mediaId
 * @returns
 */
Wechat.prototype.deleteMaterial = function (mediaId) {
    var that = this
    var form = {
        media_id: media_id
    }

    return new Promise(function (resolve, reject) {
        that.fetchAccessToken()
            .then(function (data) {
                var url = api.permanent.del + 'access_token=' + data.access_token + '&media_id=' + mediaId
                var options = {
                    method: 'POST',
                    url: url,
                    body: form,
                    json: true
                }
                request(options).then(function (response) {
                    var _data = response.body
                    if (_data) {
                        resolve(_data)
                    } else {
                        throw new Error("Delete material fails")
                    }
                }).catch(function (err) {
                    reject(err)
                })
            })
    })
}

/**
 *
 *
 * @param {any} mediaId
 * @param {any} news
 * @returns
 */
Wechat.prototype.updateMaterial = function (mediaId, news) {
    var that = this
    var form = {
        media_id: media_id
    }

    _.extend(form, news)

    return new Promise(function (resolve, reject) {
        that.fetchAccessToken()
            .then(function (data) {
                var url = api.permanent.update + 'access_token=' + data.access_token + '&media_id=' + mediaId
                var options = {
                    method: 'POST',
                    url: url,
                    body: form,
                    json: true
                }
                request(options).then(function (response) {
                    var _data = response.body
                    if (_data) {
                        resolve(_data)
                    } else {
                        throw new Error("Update material fails")
                    }
                }).catch(function (err) {
                    reject(err)
                })
            })
    })
}
/**
 *
 *
 * @returns
 */
Wechat.prototype.countMaterial = function () {
    var that = this
    return new Promise(function (resolve, reject) {
        that.fetchAccessToken()
            .then(function (data) {
                var url = api.permanent.count + 'access_token=' + data.access_token
                var options = {
                    method: 'GET',
                    url: url,
                    json: true
                }
                request(options).then(function (response) {
                    var _data = response.body
                    if (_data) {
                        resolve(_data)
                    } else {
                        throw new Error("Count material fails")
                    }
                }).catch(function (err) {
                    reject(err)
                })
            })
    })
}
/**
 *
 *
 * @param {any} options
 * @returns
 */
Wechat.prototype.batchMaterial = function (options) {
    var that = this
    options.type = options.type || 'image'
    options.offset = options.offset || 0
    options.count = options.count || 1

    return new Promise(function (resolve, reject) {
        that.fetchAccessToken()
            .then(function (data) {
                var url = api.permanent.batch + 'access_token=' + data.access_token
                request({
                    method: 'POST',
                    url: url,
                    body: options,
                    json: true
                }).then(function (response) {
                    var _data = response.body
                    if (_data) {
                        resolve(_data)
                    } else {
                        throw new Error("Batch material fails")
                    }
                }).catch(function (err) {
                    reject(err)
                })
            })
    })
}

/**
 *
 *
 * @param {any} name
 * @returns
 */
Wechat.prototype.createGroup = function (name) {
    var that = this

    return new Promise(function (resolve, reject) {
        that.fetchAccessToken()
            .then(function (data) {
                var url = api.group.create + 'access_token=' + data.access_token

                var form = {
                    group: {
                        name: name
                    }
                }

                request({
                    method: 'POST',
                    url: url,
                    body: form,
                    json: true
                }).then(function (response) {
                    var _data = response.body
                    if (_data) {
                        resolve(_data)
                    } else {
                        throw new Error("Create group fails")
                    }
                }).catch(function (err) {
                    reject(err)
                })
            })
    })
}

/**
 *
 *
 * @returns
 */
Wechat.prototype.fetchGroups = function () {
    var that = this

    return new Promise(function (resolve, reject) {
        that.fetchAccessToken()
            .then(function (data) {
                var url = api.group.fetch + 'access_token=' + data.access_token

                request({
                    url: url,
                    json: true
                }).then(function (response) {
                    var _data = response.body
                    if (_data) {
                        resolve(_data)
                    } else {
                        throw new Error("Fetch group fails")
                    }
                }).catch(function (err) {
                    reject(err)
                })
            })
    })
}

/**
 *
 *
 * @param {any} openId
 * @returns
 */
Wechat.prototype.checkGroup = function (openId) {
    var that = this

    return new Promise(function (resolve, reject) {
        that.fetchAccessToken()
            .then(function (data) {
                var url = api.group.check + 'access_token=' + data.access_token

                var form = {
                    openid: openId
                }

                request({
                    method: 'POST',
                    url: url,
                    body: form,
                    json: true
                }).then(function (response) {
                    var _data = response.body
                    if (_data) {
                        resolve(_data)
                    } else {
                        throw new Error("Check group fails")
                    }
                }).catch(function (err) {
                    reject(err)
                })
            })
    })
}
/**
 *
 *
 * @param {any} id
 * @param {any} name
 * @returns
 */
Wechat.prototype.updateGroup = function (id, name) {
    var that = this

    return new Promise(function (resolve, reject) {
        that.fetchAccessToken()
            .then(function (data) {
                var url = api.group.update + 'access_token=' + data.access_token

                var form = {
                    group: {
                        id: id,
                        name: name
                    }
                }

                request({
                    method: 'POST',
                    url: url,
                    body: form,
                    json: true
                }).then(function (response) {
                    var _data = response.body
                    if (_data) {
                        resolve(_data)
                    } else {
                        throw new Error("Update group fails")
                    }
                }).catch(function (err) {
                    reject(err)
                })
            })
    })
}

/**
 *
 *
 * @param {any} openIds
 * @param {any} to
 * @returns
 */
Wechat.prototype.moveGroup = function (openIds, to) {
    var that = this

    return new Promise(function (resolve, reject) {
        that.fetchAccessToken()
            .then(function (data) {
                var url
                var form = {
                    to_groupid: to
                }
                if (_.isArray(openIds)) {
                    url = api.group.batchMove + 'access_token=' + data.access_token
                    form.openid_list = openIds
                } else {
                    url = api.group.move + 'access_token=' + data.access_token
                    form.openid = openIds
                }

                request({
                    method: 'POST',
                    url: url,
                    body: form,
                    json: true
                }).then(function (response) {
                    var _data = response.body
                    if (_data) {
                        resolve(_data)
                    } else {
                        throw new Error("Move group fails")
                    }
                }).catch(function (err) {
                    reject(err)
                })
            })
    })
}

/**
 *
 *
 * @param {any} id
 * @returns
 */
Wechat.prototype.deleteGroup = function (id) {
    var that = this

    return new Promise(function (resolve, reject) {
        that.fetchAccessToken()
            .then(function (data) {
                var url = api.group.del + 'access_token=' + data.access_token
                var form = {
                    group: {
                        id: id
                    }
                }

                request({
                    method: 'POST',
                    url: url,
                    body: form,
                    json: true
                }).then(function (response) {
                    var _data = response.body
                    if (_data) {
                        resolve(_data)
                    } else {
                        throw new Error("Delete group fails")
                    }
                }).catch(function (err) {
                    reject(err)
                })
            })
    })
}
/**
 *
 *
 * @param {any} openId
 * @param {any} remark
 * @returns
 */
Wechat.prototype.remarkUser = function (openId, remark) {
    var that = this

    return new Promise(function (resolve, reject) {
        that.fetchAccessToken()
            .then(function (data) {
                var url = api.user.remark + 'access_token=' + data.access_token
                var form = {
                    openid: openId,
                    remark: remark
                }

                request({
                    method: 'POST',
                    url: url,
                    body: form,
                    json: true
                }).then(function (response) {
                    var _data = response.body
                    if (_data) {
                        resolve(_data)
                    } else {
                        throw new Error("Remark user fails")
                    }
                }).catch(function (err) {
                    reject(err)
                })
            })
    })
}

/**
 *
 * 获取用户基本信息/批量获取用户基本信息
 * @param {any} openIds 数组则为批量获取，反之，获取单个用户基本信息
 * @param {any} lang 默认为中文
 * @returns
 */
Wechat.prototype.fetchUsers = function (openIds, lang) {
    var that = this
    lang = lang || 'zh_CN'
    return new Promise(function (resolve, reject) {
        that.fetchAccessToken()
            .then(function (data) {
                var options = {
                    json: true,
                }
                if (_.isArray(openIds)) {
                    options.url = api.user.batchFetch + 'access_token=' + data.access_token
                    options.body = {
                        user_list: openIds
                    }
                    options.method = 'POST'
                } else {
                    options.url = api.user.fetch + 'access_token=' + data.access_token
                        + '&openid=' + openIds + '&lang=' + lang
                }
                request(options).then(function (response) {
                    var _data = response.body
                    if (_data) {
                        resolve(_data)
                    } else {
                        throw new Error("Fetch user fails")
                    }
                }).catch(function (err) {
                    reject(err)
                })
            })
    })
}
/**
 *
 *
 * @param {any} openId
 * @returns
 */
Wechat.prototype.listUsers = function (openId) {
    var that = this
    return new Promise(function (resolve, reject) {
        that.fetchAccessToken()
            .then(function (data) {
                var url = api.user.list + 'access_token=' + data.access_token
                if (openId) {
                    url += '&next_openid=' + openId
                }
                request({url: url, json: true}).then(function (response) {
                    var _data = response.body
                    if (_data) {
                        resolve(_data)
                    } else {
                        throw new Error("List user fails")
                    }
                }).catch(function (err) {
                    reject(err)
                })
            })
    })
}

/**
 *
 *
 * @param {any} type
 * @param {any} message
 * @param {any} groupId
 * @returns
 */
Wechat.prototype.sendByGroup = function (type, message, groupId) {
    var that = this
    var msg = {
        filter: {},
        msgtype: type
    }

    msg[type] = message

    if (!groupId) {
        msg.filter.is_to_all = true
    } else {
        msg.filter = {
            is_to_all: false,
            group_id: groupId
        }
    }

    return new Promise(function (resolve, reject) {
        that.fetchAccessToken()
            .then(function (data) {
                var url = api.mass.group + 'access_token=' + data.access_token
                request({method: 'POST', url: url, body: msg, json: true}).then(function (response) {
                    var _data = response.body
                    if (_data) {
                        resolve(_data)
                    } else {
                        throw new Error("Send to group fails")
                    }
                }).catch(function (err) {
                    reject(err)
                })
            })
    })
}

/**
 *
 *
 * @param {any} type
 * @param {any} message
 * @param {any} openIds
 * @returns
 */
Wechat.prototype.sendByOpenId = function (type, message, openIds) {
    var that = this
    var msg = {
        msgtype: type,
        touser: openIds
    }

    msg[type] = message
    return new Promise(function (resolve, reject) {
        that.fetchAccessToken()
            .then(function (data) {
                var url = api.mass.openId + 'access_token=' + data.access_token
                request({method: 'POST', url: url, body: msg, json: true}).then(function (response) {
                    var _data = response.body
                    if (_data) {
                        resolve(_data)
                    } else {
                        throw new Error("Send By OpenId fails")
                    }
                }).catch(function (err) {
                    reject(err)
                })
            })
    })
}

/**
 *
 *
 * @param {any} msgId
 * @returns
 */
Wechat.prototype.deleteMass = function (msgId) {
    var that = this
    return new Promise(function (resolve, reject) {
        that.fetchAccessToken()
            .then(function (data) {
                var url = api.mass.del + 'access_token=' + data.access_token
                var form = {
                    msg_id: msgId
                }
                request({method: 'POST', url: url, body: form, json: true}).then(function (response) {
                    var _data = response.body
                    if (_data) {
                        resolve(_data)
                    } else {
                        throw new Error("Delete Mass fails")
                    }
                }).catch(function (err) {
                    reject(err)
                })
            })
    })
}

/**
 *
 *
 * @param {any} type
 * @param {any} message
 * @param {any} openId
 * @returns
 */
Wechat.prototype.previewMass = function (type, message, openId) {
    var that = this
    var msg = {
        msgtype: type,
        touser: openId
    }
    msg[type] = message
    return new Promise(function (resolve, reject) {
        that.fetchAccessToken()
            .then(function (data) {
                var url = api.mass.preview + 'access_token=' + data.access_token
                request({method: 'POST', url: url, body: msg, json: true}).then(function (response) {
                    var _data = response.body
                    if (_data) {
                        resolve(_data)
                    } else {
                        throw new Error("Preview Mass fails")
                    }
                }).catch(function (err) {
                    reject(err)
                })
            })
    })
}

/**
 *
 *
 * @param {any} msgId
 * @returns
 */
Wechat.prototype.checkMass = function (msgId) {
    var that = this
    return new Promise(function (resolve, reject) {
        that.fetchAccessToken()
            .then(function (data) {
                var url = api.mass.check + 'access_token=' + data.access_token
                var form = {
                    msg_id: msgId
                }
                request({method: 'POST', url: url, body: form, json: true}).then(function (response) {
                    var _data = response.body
                    if (_data) {
                        resolve(_data)
                    } else {
                        throw new Error("Check Mass fails")
                    }
                }).catch(function (err) {
                    reject(err)
                })
            })
    })
}

/**
 *
 * @param menu
 */
Wechat.prototype.createMenu = function (menu) {
    var that = this
    return new Promise(function (resolve, reject) {
        that.fetchAccessToken()
            .then(function (data) {
                var url = api.menu.create + 'access_token=' + data.access_token
                request({method: 'POST', url: url, body: menu, json: true}).then(function (response) {
                    var _data = response.body
                    if (_data) {
                        resolve(_data)
                    } else {
                        throw new Error("Create menu fails")
                    }
                }).catch(function (err) {
                    reject(err)
                })
            })
    })
}

/**
 *
 */
Wechat.prototype.getMenu = function () {
    var that = this
    return new Promise(function (resolve, reject) {
        that.fetchAccessToken()
            .then(function (data) {
                var url = api.menu.get + 'access_token=' + data.access_token
                request({url: url, json: true}).then(function (response) {
                    var _data = response.body
                    if (_data) {
                        resolve(_data)
                    } else {
                        throw new Error("Get menu fails")
                    }
                }).catch(function (err) {
                    reject(err)
                })
            })
    })
}

Wechat.prototype.deleteMenu = function () {
    var that = this
    return new Promise(function (resolve, reject) {
        that.fetchAccessToken()
            .then(function (data) {
                var url = api.menu.del + 'access_token=' + data.access_token
                request({url: url, json: true}).then(function (response) {
                    var _data = response.body
                    if (_data) {
                        resolve(_data)
                    } else {
                        throw new Error("Delete menu fails")
                    }
                }).catch(function (err) {
                    reject(err)
                })
            })
    })
}

Wechat.prototype.getCurrentMenu = function () {
    var that = this
    return new Promise(function (resolve, reject) {
        that.fetchAccessToken()
            .then(function (data) {
                var url = api.menu.current + 'access_token=' + data.access_token
                request({url: url, json: true}).then(function (response) {
                    var _data = response.body
                    if (_data) {
                        resolve(_data)
                    } else {
                        throw new Error("Get current menu fails")
                    }
                }).catch(function (err) {
                    reject(err)
                })
            })
    })
}

Wechat.prototype.createQrcode = function (qr) {
    var that = this
    return new Promise(function (resolve, reject) {
        that.fetchAccessToken()
            .then(function (data) {
                var url = api.qrcode.create + 'access_token=' + data.access_token
                request({method: 'POST', url: url, body: qr, json: true}).then(function (response) {
                    var _data = response.body
                    if (_data) {
                        resolve(_data)
                    } else {
                        throw new Error("Create qrcode fails")
                    }
                }).catch(function (err) {
                    reject(err)
                })
            })
    })
}

Wechat.prototype.showQrcode = function (ticket) {
    return api.qrcode.show + 'ticket=' + encodeURI(ticket)
}


Wechat.prototype.createShorturl = function (action, long_url) {
    action = action || 'long2short'
    var that = this
    return new Promise(function (resolve, reject) {
        that.fetchAccessToken()
            .then(function (data) {
                var url = api.shortUrl.create + 'access_token=' + data.access_token
                var form = {
                    action: action,
                    long_url: long_url
                }
                request({method: 'POST', url: url, body: form, json: true}).then(function (response) {
                    var _data = response.body
                    if (_data) {
                        resolve(_data)
                    } else {
                        throw new Error("Create shorturl fails")
                    }
                }).catch(function (err) {
                    reject(err)
                })
            })
    })
}

Wechat.prototype.semantic = function (semanticData) {
    var that = this
    return new Promise(function (resolve, reject) {
        that.fetchAccessToken()
            .then(function (data) {
                var url = api.semanticUrl + 'access_token=' + data.access_token
                semanticData.appid = data.appID
                request({method: 'POST', url: url, body: semanticData, json: true}).then(function (response) {
                    var _data = response.body
                    if (_data) {
                        resolve(_data)
                    } else {
                        throw new Error("semantic fails")
                    }
                }).catch(function (err) {
                    reject(err)
                })
            })
    })
}

/**
 *
 */
Wechat.prototype.reply = function () {
    //不知为何会存在多次回复,二次以及后的content可能为undefined
    var content = this.body || ''
    var message = this.weixin
    var xml = util.tpl(content, message)

    // console.log(xml)

    this.status = 200
    this.type = 'application/xml'
    this.body = xml
}

module.exports = Wechat