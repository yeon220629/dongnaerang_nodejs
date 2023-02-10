const express = require('express')
const app = express()
const fmcMessage = require('../dongnaerang_nodejs/firebaseFcm/sendMessage');
const seoulApiJob = require('../dongnaerang_nodejs/firebaseFcm/seoulOpenApi'); // 서울 open api 잡 실행
const dongnerangSpaces = require('../dongnaerang_nodejs/firebaseFcm/dongnerangSpaces'); // 동네랑 spaces 저장

app.get('/', function (req, res) {
    console.log('connect /')
    res.send('Hello World !!')
})

// 알람 보낼 데이터 가져오기 바람
app.get('/getData', fmcMessage.getData);
// 알람 보내기
// app.get('/pushAlram', fmcMessage.pushAlarm);

// 서울 open api 데이터 저장 값 샘플 보기
app.get('/previewSeoulOpenApiSpaces', seoulApiJob.previewSeoulOpenApiSpaces);

// 동네랑 spaces 데이터 저장 ::: 로컬에서 사용
// app.get('/putDongnerangSpaces', dongnerangSpaces.putDongnerangSpaces);


app.listen(3000, function () {
    console.log('3000 port listen !!')
})
