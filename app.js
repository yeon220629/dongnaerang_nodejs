const express = require('express')
const app = express()
const fmcMessage = require('../dongnaerang_nodejs/firebaseFcm/sendMessage');
const seoulApiJob = require('../dongnaerang_nodejs/firebaseFcm/seoulOpenApi'); // 서울 open api 잡 실행

app.get('/', function (req, res) {
    console.log('connect /')
    res.send('Hello World !!')
})

// 알람 보낼 데이터 가져오기 바람
app.get('/getData', fmcMessage.getData);
// 알람 보내기
// app.get('/pushAlram', fmcMessage.pushAlarm);


app.listen(3000, function () {
    console.log('3000 port listen !!')
})
