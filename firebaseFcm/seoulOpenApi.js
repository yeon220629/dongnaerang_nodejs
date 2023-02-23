const axios = require("axios");
const schedule = require('node-schedule');
const moment = require("moment");

const { initializeApp, cert, getApps } = require("firebase-admin/app");
const { getFirestore, FieldValue } = require('firebase-admin/firestore');

let serAccount = require('../firebaseFcm/dbcurd-67641-firebase-adminsdk-ax50d-d03370a8af.json');
let spaceDataMap = new Map();

if (!getApps().length) {
    initializeApp({
        credential: cert(serAccount),
        databaseURL: "https://dbcurd-67641-default-rtdb.firebaseio.com"
    });
}

const db = getFirestore();

// 매일 새벽 3시 실행
const seoulApiJob = schedule.scheduleJob('0 0 3 * * *', function () {
    putSeoulOpenApiSpaces();
});

// 서울 api 호출 후 firestore 입력
async function putSeoulOpenApiSpaces() {
    await getSeoulOpenApiSpaces('ListPublicReservationSport'); // 체육대관
    await getSeoulOpenApiSpaces('ListPublicReservationCulture'); // 문화체험
    await getSeoulOpenApiSpaces('ListPublicReservationEducation'); // 교육
    await getSeoulOpenApiSpaces('ListPublicReservationInstitution'); // 시설대관

    // api 데이터 조회되지 않을 때
    if (spaceDataMap.size === 0) {
        return;
    }
    // api 데이터 1개 이상 조회될 때
    else {
        try {
            for (let [key, value] of spaceDataMap) {
                await setFireStoreSpacesByGu(key, value);
            }
        } catch (e) {
            console.log(e);
        }
    }
}

// 서울 open api 데이터 저장되는 값 샘플 보기
exports.previewSeoulOpenApiSpaces = async function previewSeoulOpenApiSpaces(req, res) {
    let spaces = {};

    await getSeoulOpenApiSpaces('ListPublicReservationSport'); // 체육대관
    await getSeoulOpenApiSpaces('ListPublicReservationCulture'); // 문화체험
    await getSeoulOpenApiSpaces('ListPublicReservationEducation'); // 교육
    await getSeoulOpenApiSpaces('ListPublicReservationInstitution'); // 시설대관

    // api 데이터 조회되지 않을 때
    if (spaceDataMap.size === 0) {
        return res.status(204).json(
            {
                success: true,
                total_count: 0,
                message: "no content"
            }
        );
    }
    // api 데이터 1개 이상 조회될 때
    else {
        try {
            let totalCount = 0;

            for (let [key, value] of spaceDataMap) {
                spaces = {
                    ...spaces,
                    [key]: value
                }
                totalCount += value.length;
            }

            return res.status(200).json(
                {
                    success: true,
                    total_count: totalCount,
                    message: {
                        spaces: spaces
                    }
                }
            );
        } catch (e) {
            return res.status(500).json(
                {
                    success: false,
                    message: e
                }
            );
        }
    }
}

// firestore 입력 : spaces > seoulApiSpaces > seoulApiSpacesByGu > 자치구별
async function setFireStoreSpacesByGu(gu, value) {
    const spaceDocRef = db.collection('spaces').doc('seoulApiSpaces').collection('seoulApiSpacesByGu').doc(gu);

    try {
        await spaceDocRef.update({
            spaces: FieldValue.delete()
        });
        await spaceDocRef.set({
            spaces: value
        });
    } catch (e) {
        console.log(e);
    }
}

// 서울 open api 요청 후 spaceDataMap 에 저장
async function getSeoulOpenApiSpaces(service) {
    const limit = 100;
    let category = '';
    switch (service) {
        case 'ListPublicReservationSport': // 체육대관
            category = 'SR';
            break;
        case 'ListPublicReservationCulture': // 문화체험
            category = 'C';
            break;
        case 'ListPublicReservationEducation': // 교육
            category = 'E';
            break;
        case 'ListPublicReservationInstitution': // 시설대관
            category = 'R';
            break;
        default:
            return;
    }

    try {
        const response = await axios.get(
            `http://openAPI.seoul.go.kr:8088/4b6e71576773647737344a616f444f/json/${service}/1/${limit}`,
        );

        let listTotalCount = response.data[service]['list_total_count'];
        let repeat = Math.ceil(listTotalCount / limit);

        // 처음 1 ~ limit
        dataRowToArr(response.data[service]['row'], category);

        // limit 초과일 경우 반복 처리
        for (let i = 0; i < repeat - 1; i++) {
            try {
                const response = await axios.get(
                    `http://openAPI.seoul.go.kr:8088/4b6e71576773647737344a616f444f/json/${service}/${100 * (i + 1) + 1}/${100 * (i + 2)}`,
                )

                dataRowToArr(response.data[service]['row'], category);
            } catch (e) {
                console.log(e);
            }
        }
    } catch (e) {
        console.log(e);
    }
}

// spaceData 처리 후 spaceDataMap에 저장
function dataRowToArr(data, category) {
    var date = moment().format('YYYY-MM-DD HH:mm:ss');

    for (const space of data) {
        // uid, 자치구, 장소명, 경도, 위도 유효성 검사
        if (space['SVCID'] == "" || space['AREANM'] == "" || space['PLACENM'] == "" || space['X'] == "" || space['Y'] == "") {
            break;
        }

        // 위도, 경도 유효성 검사
        let lat = parseFloat(space['Y']);
        let long = parseFloat(space['X']);

        if ((lat > 33 && lat < 43) && (long > 124 && long < 132)) {
            lat = parseFloat(lat.toFixed(6));
            long = parseFloat(long.toFixed(6));
        } else {
            break;
        }

        spaceData = {
            uid: space['SVCID'],
            gu: space['AREANM'],
            spaceName: space['PLACENM'],
            category: category,
            latitude: lat,
            longitude: long,
            spaceImage: space['IMGURL'],
            detailInfo: space['MAXCLASSNM'],
            pageLink: space['SVCURL'],
            phoneNum: space['TELNO'],
            svcName: space['SVCNM'],
            svcStat: space['SVCSTATNM'],
            svcTimeMin: space['V_MIN'],
            svcTimeMax: space['V_MAX'],
            payInfo: space['PAYATNM'],
            useTarget: space['USETGTINFO'],
            updated: date
        }

        // spaceDataMap 에 구별로 저장
        if (spaceDataMap.has(spaceData.gu)) {
            spaceDataMap.get(spaceData.gu).push(spaceData);
        } else {
            spaceDataMap.set(spaceData.gu, [spaceData]);
        }
    };
}