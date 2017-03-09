'use strict'

var path = require('path')
var config = require('../config')
var Wechat = require('../wechat/wechat')
var menu = require('./menu')
var wechatApi = new Wechat(config.wechat)

// wechatApi.deleteMenu().then(function () {
//     wechatApi.createMenu(menu)
// }).then(function (msg) {
//     console.log(msg)
// })

exports.reply = function*(next) {
    var message = this.weixin

    if (message.MsgType === 'event') {
        if (message.Event === 'subscribe') {
            if (message.EventKey) {
                console.log('扫描二维码进来:' + message.EventKey + ' ' + message.ticket)
            }
            this.body = '欢迎订阅此公众号'
        } else if (message.Event === 'unsubscribe') {
            console.log('为啥要离开我')
            this.body = ''
        } else if (message.Event === 'LOCATION') {
            this.body = '您上报的位置是： ' + message.Latitude + '/' + message.Longitude
                + '-' + message.Precision
        } else if (message.Event === 'CLICK') {
            this.body = '您点击了菜单： ' + message.EventKey
        } else if (message.Event === 'SCAN') {
            console.log('关注后扫二维码' + message.EventKey + ' ' + message.Ticket)
            this.body = '看到你扫了一下哦'
        } else if (message.Event === 'VIEW') {
            this.body = '您点击了菜单中的链接： ' + message.EventKey
        } else if (message.Event === 'scancode_push') {
            console.log(message.ScanCodeInfo.ScanType)
            console.log(message.ScanCodeInfo.ScanResult)
            this.body = '您点击了菜单中： ' + message.EventKey
        } else if (message.Event === 'scancode_waitmsg') {
            console.log(message.ScanCodeInfo.ScanType)
            console.log(message.ScanCodeInfo.ScanResult)
            this.body = '您点击了菜单中： ' + message.EventKey
        } else if (message.Event === 'pic_sysphoto') {
            console.log(message.SendPicsInfo.PicList)
            console.log(message.SendPicsInfo.Count)
            this.body = '您点击了菜单中： ' + message.EventKey
        } else if (message.Event === 'pic_photo_or_album') {
            console.log(message.SendPicsInfo.PicList)
            console.log(message.SendPicsInfo.Count)
            this.body = '您点击了菜单中： ' + message.EventKey
        } else if (message.Event === 'pic_weixin') {
            console.log(message.SendPicsInfo.PicList)
            console.log(message.SendPicsInfo.Count)
            this.body = '您点击了菜单中： ' + message.EventKey
        } else if (message.Event === 'location_select') {
            console.log(message.SendLocationInfo.Location_X)
            console.log(message.SendLocationInfo.Location_Y)
            console.log(message.SendLocationInfo.Scale)
            console.log(message.SendLocationInfo.Label)
            console.log(message.SendLocationInfo.Poiname)
            this.body = '您点击了菜单中： ' + message.EventKey
        }
    } else if (message.MsgType === 'text') {
        var content = message.Content
        var reply = '额，你说的 ' + message.Content + ' 太复杂了'

        if (content === '1') {
            reply = '天下第一吃大米'
        } else if (content === '2') {
            reply = '天下第二吃豆腐'
        } else if (content === '3') {
            reply = '天下第三吃咸蛋'
        } else if (content === '4') {
            reply = [{
                title: '技术改变世界',
                description: '只是个描述而已',
                picUrl: 'http://pic36.nipic.com/20131211/10777699_140106221132_2.jpg',
                url: 'https://github.com'
            }]
        } else if (content === '5') {
            var data = yield wechatApi.uploadMaterial('image', path.join(__dirname, '../2.jpg'))
            reply = {
                type: 'image',
                mediaId: data.media_id
            }
        } else if (content === '6') {
            var data = yield wechatApi.uploadMaterial('video', path.join(__dirname, '../6.mp4'))
            reply = {
                type: 'video',
                title: '视频内容',
                description: '跳个舞',
                mediaId: data.media_id
            }
        } else if (content === '7') {
            var data = yield wechatApi.uploadMaterial('image', path.join(__dirname, '../2.jpg'))
            reply = {
                type: 'music',
                title: '音乐内容',
                description: '听首歌',
                musicUrl: 'http://localhost:3000/7.mp3',
                thumbMediaId: data.media_id,
            }
        } else if (content === '8') {
            var data = yield wechatApi.uploadMaterial('image', path.join(__dirname, '../2.jpg'), {type: 'image'})
            reply = {
                type: 'image',
                mediaId: data.media_id
            }
        } else if (content === '9') {
            var data = yield wechatApi.uploadMaterial('video', path.join(__dirname, '../6.mp4'), {
                type: 'video',
                description: '{"title":"title", "introduction":"Never give up"}'
            })

            reply = {
                type: 'video',
                title: '视频内容',
                description: '跳个舞',
                mediaId: data.media_id
            }
        } else if (content === '10') {
            var picData = yield wechatApi.uploadMaterial('image', path.join(__dirname, '../2.jpg'), {})

            var media = {
                articles: [{
                    title: 'hahaha',
                    thumb_media_id: picData.media_id,
                    author: 'YJ',
                    digest: 'no digest',
                    show_cover_pic: 1,
                    content: 'no content',
                    content_source_url: 'https://github.com'
                }, {
                    title: 'hahaha2',
                    thumb_media_id: picData.media_id,
                    author: 'YJ',
                    digest: 'no digest',
                    show_cover_pic: 1,
                    content: 'no content',
                    content_source_url: 'https://github.com'
                }]
            }

            data = yield wechatApi.uploadMaterial('news', media, {})
            data = yield wechatApi.fetchMaterial(data.media_id, 'news', {})
            console.log(data)
            var items = data.news_item
            var news = []
            items.forEach(function (item) {
                news.push({
                    title: item.title,
                    description: item.digest,
                    picUrl: picData.url,
                    url: item.url
                })
            })

            reply = news
        } else if (content === '11') {
            var counts = yield wechatApi.countMaterial()
            console.log(JSON.stringify(counts))

            var results = yield [
                wechatApi.batchMaterial({
                    type: 'image',
                    offset: 0,
                    count: 10,
                }),
                wechatApi.batchMaterial({
                    type: 'video',
                    offset: 0,
                    count: 10,
                }),
                wechatApi.batchMaterial({
                    type: 'voice',
                    offset: 0,
                    count: 10,
                }),
                wechatApi.batchMaterial({
                    type: 'news',
                    offset: 0,
                    count: 10,
                })
            ]

            console.log(JSON.stringify(results))
            reply = '1'
        } else if (content === '12') {
            // var group = yield wechatApi.createGroup('wechat2')
            // console.log('新分组 wechat2')
            // console.log(group)

            // var groups = yield wechatApi.fetchGroups()
            // console.log('加了 wechat2 后的分组列表')
            // console.log(groups)

            var group2 = yield wechatApi.checkGroup(message.FromUserName)

            console.log('查看自己分组')
            console.log(group2)

            // var result = yield wechatApi.moveGroup(message.FromUserName, 100)
            // console.log('移动到100')
            // console.log(result)

            // var groups2 = yield wechatApi.fetchGroups()
            // console.log('移动到100 后的分组列表')
            // console.log(groups2)

            // var result2 = yield wechatApi.moveGroup([message.FromUserName], 101)
            // console.log('批量移动到101')
            // console.log(result2)

            // var groups3 = yield wechatApi.fetchGroups()
            // console.log('批量移动到101 后的分组列表')
            // console.log(groups3)

            // var result3 = yield wechatApi.updateGroup(100, 'wechat100')
            // console.log('100 wechat 改名为 wechat100')
            // console.log(result3)

            // var groups4 = yield wechatApi.fetchGroups()
            // console.log('100 wechat 改名为 wechat100 后的分组列表')
            // console.log(groups4)

            // var result4 = yield wechatApi.deleteGroup(100)
            // console.log('删除100 wechat100分组')
            // console.log(result4)

            // var groups5 = yield wechatApi.fetchGroups()
            // console.log('删除100 wechat100分组 后的分组列表')
            // console.log(groups5)

            reply = 'Group done!'
        } else if (content === '13') {
            var user = yield wechatApi.fetchUsers(message.FromUserName, 'en')
            console.log(user)

            var openIds = [
                {
                    openid: message.FromUserName,
                    lang: 'en'
                }
            ]
            var users = yield wechatApi.fetchUsers(openIds)
            console.log(users)

            reply = JSON.stringify(user)
        } else if (content === '14') {
            var userList = yield wechatApi.listUsers()

            console.log(userList)
            reply = userList.total
        } else if (content === '15') {
            var mpnews = {
                media_id: 'D3tU27cc_3xmceRnC4IjFMiW0ttHdgG25JSssPkJB9Q'
            }

            var text = {
                content: 'Hello Wechat'
            }

            var msgData = yield wechatApi.sendByGroup('mpnews', mpnews, 101)
            console.log(msgData)
            reply = 'Yeah!'
        } else if (content === '16') {
            var mpnews = {
                media_id: 'D3tU27cc_3xmceRnC4IjFMiW0ttHdgG25JSssPkJB9Q'
            }
            var text = {
                content: 'Hello Wechat'
            }
            var msgData = yield wechatApi.previewMass('mpnews', mpnews, 'oRr4xvz2RgGYbgA0RTMZBwRWlRQM')
            console.log(msgData)
            reply = 'Yeah!'
        } else if (content === '17') {
            var msgData = yield wechatApi.checkMass('6364584982867191702')
            console.log(msgData)
            reply = 'Yeah!'
        } else if (content === '18') {

            var tempQr = {
                expire_seconds: 40000,
                action_name: 'QR_SCENE',
                action_info: {
                    scene: {
                        scene_id: 123
                    }
                }
            }

            var permQr = {
                action_name: 'QR_LIMIT_SCENE',
                action_info: {
                    scene: {
                        scene_id: 123
                    }
                }
            }

            var permStrQr = {
                action_name: 'QR_LIMIT_STR_SCENE',
                action_info: {
                    scene: {
                        scene_str: 'abc'
                    }
                }
            }

            var qr1 = yield wechatApi.createQrcode(tempQr)
            var qr2 = yield wechatApi.createQrcode(permQr)
            var qr3 = yield wechatApi.createQrcode(permStrQr)

            reply = 'Yeah!'
        } else if (content === '19') {
            var longUrl = 'http://www.imooc.com/'

            var shortData = yield wechatApi.createShorturl(null, longUrl)
            reply = shortData.short_url
        } else if (content === '20') {
            var semanticData = {
                query: '长城',
                city: '南京',
                category: 'movie',
                uid: message.FromUserName
            }

            var _semanticData = yield wechatApi.semantic(semanticData)
            reply = JSON.stringify(_semanticData)
        }
        this.body = reply
    }

    yield next
}