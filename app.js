'use strict'

var Koa = require('koa')
var serve = require('koa-static')
var wechat = require('./wechat/g')
var path = require('path')
var config = require('./config')
var reply = require('./wx/reply')
var Wechat = require('./wechat/wechat')

var app = new Koa()

var ejs = require('ejs')
var crypto = require('crypto')
var heredoc = require('heredoc')

var port = process.env.PORT || 1234

var tpl = heredoc(function () {/*
    <!DOCTYPE html>
    <html>
        <head>
            <title>猜电影</title>
            <meta name="viewport" content="initial-scale=1, maximum-scale=1, minimum-scale=1">
        </head>
        <body>
            <h1>点击标题, 开始录音翻译</h1>
            <p id="title"></p>
            <div id="year"></div>
            <div id="director"></div>
            <div id="poster"></div>
            <script src="http://zeptojs.com/zepto.min.js"></script>
            <script src="http://res.wx.qq.com/open/js/jweixin-1.0.0.js"></script>
            <script src="touch.js"></script>
            <script>
                 wx.config({
                     debug: false, // 开启调试模式,调用的所有api的返回值会在客户端alert出来，若要查看传入的参数，可以在pc端打开，参数信息会通过log打出，仅在pc端时才会打印。
                     //appId: 'wx192dea1777d45bf9', // 必填，公众号的唯一标识
                     appId: 'wxcd9b5e2da5f6f52b', // 测试
                     timestamp: '<%= timestamp%>', // 必填，生成签名的时间戳
                     nonceStr: '<%= noncestr%>', // 必填，生成签名的随机串
                     signature: '<%= signature%>',// 必填，签名，见附录1
                     jsApiList: [
                             'onMenuShareTimeline',
                             'onMenuShareAppMessage',
                             'onMenuShareQQ',
                             'onMenuShareWeibo',
                             'onMenuShareQZone',
                             'previewImage',
                             'startRecord',
                             'stopRecord',
                             'onVoiceRecordEnd',
                             'translateVoice'
                     ] // 必填，需要使用的JS接口列表，所有JS接口列表见附录2
                 });

                 wx.ready(function(){
                     wx.checkJsApi({
                         jsApiList: ['onVoiceRecordEnd'],
                         success: function(res) {
                            console.log(res)
                         }
                     })

                     var shareContent = {
                         title: 'sousousou', // 分享标题
                         desc: '我搜出来了啥', // 分享描述
                         link: 'https://github.com', // 分享链接
                         imgUrl: 'http://static.mukewang.com/static/img/common/logo.png', // 分享图标
                         success: function () {
                            window.alert('分享成功')
                         },
                         cancel: function () {
                            window.alert('分享失败')
                         }
                     }
                     wx.onMenuShareAppMessage(shareContent)

                     var isRecording = false
                     var slides
                     $('#poster').on('tap', function(){
                         wx.previewImage(slides)
                     }


                     $('h1').on('tap', function(){
                        if(!isRecording){
                           isRecording = true
                           wx.startRecord({
                             cancel:function(){
                                window.alert('搜索不了啦,请给我权限撒^_^')
                             }

                           })
                           return
                        }

                         isRecording = false

                         wx.stopRecord({
                             success: function (res) {
                                 var localId = res.localId

                                 wx.translateVoice({
                                     localId: localId, // 需要识别的音频的本地Id，由录音相关接口获得
                                     isShowProgressTips: 1, // 默认为1，显示进度提示
                                     success: function (res) {
                                        var result = res.translateResult // 语音识别的结果
                                        // window.alert(result)
                                        $.ajax({
                                            type:'get',
                                            url: 'https://api.douban.com/v2/movie/search?q=' + result,
                                            dataType: 'jsonp',
                                            jsonp:'callback',
                                            success: function(data){
                                                var subject = data.subjects[0]
                                                $('#title').html(subject.title)
                                                $('#year').html(subject.year)
                                                $('#director').html(subject.directors[0].name)
                                                $('#poster').html('<img src="' + subject.images.large + '"/>')

                                                shareContent = {
                                                     title: subject.title, // 分享标题
                                                     desc: '搜索结果' + subject.title, // 分享描述
                                                     link: 'https://github.com', // 分享链接
                                                     imgUrl: subject.images.large, // 分享图标
                                                     success: function () {
                                                        window.alert('分享成功')
                                                     },
                                                     cancel: function () {
                                                        window.alert('分享失败')
                                                     }
                                               }

                                               slides = {
                                                    current: subject.images.large,
                                                    urls:[subject.images.large],
                                               }

                                               data.subjects.forEach(function(item){
                                                    slides.urls.push(item.images.large)
                                               })

                                               wx.onMenuShareAppMessage(shareContent)
                                            }
                                        })
                                     }
                                 })
                             }
                         })
                     })
                 })
            </script>
        </body>
    </html>
 */
})

var createNonce = function () {
    return Math.random().toString(36).substr(2, 15)
}

var createTimestamp = function () {
    return parseInt(new Date().getTime() / 1000, 10) + ''
}

var _sign = function (noncestr, ticket, timestamp, url) {
    var params = [
        'noncestr=' + noncestr,
        'jsapi_ticket=' + ticket,
        'timestamp=' + timestamp,
        'url=' + url
    ]

    var str = params.sort().join('&')
    var shasum = crypto.createHash('sha1')
    shasum.update(str)

    return shasum.digest('hex')
}

function sign(ticket, url) {
    var noncestr = createNonce()
    var timestamp = createTimestamp()
    var signature = _sign(noncestr, ticket, timestamp, url)

    return {
        noncestr: noncestr,
        timestamp: timestamp,
        signature: signature
    }
}

app.use(serve(path.join(__dirname, 'public')))

app.use(function *(next) {
    if (this.url.indexOf('/movie') > -1) {
        var wechatApi = new Wechat(config.wechat)
        var data = yield wechatApi.fetchAccessToken()
        var access_token = data.access_token
        var ticketData = yield wechatApi.fetchTicket(access_token)
        var ticket = ticketData.ticket
        var url = this.href
        var params = sign(ticket, url)

        this.body = ejs.render(tpl, params)
        return next
    }
    yield next
})

app.use(wechat(config.wechat, reply.reply))

app.listen(port)
console.log('Listening: ' + port)