const { initializeApp, cert, getApps } = require("firebase-admin/app");
const { getFirestore } = require('firebase-admin/firestore');

let serAccount = require('../firebaseFcm/dbcurd-67641-firebase-adminsdk-ax50d-d03370a8af.json');
let spaceDataMap = new Map();

if (!getApps().length) {
    initializeApp({
        credential: cert(serAccount),
    });
}

const db = getFirestore();
const fs = require('fs');

// 동네랑 데이터 firestore에 저장
exports.putDongnerangSpaces = async function putDongnerangSpaces(req, res) {
    let spaces = {};

    try {
        let file = await readFile(__dirname + '/spacesJsonSample_v3.json');
        let data = JSON.parse(file);
        await dataToMapByGu(data[0].spaces);

        // api 데이터 조회되지 않을 때
        if (spaceDataMap.size === 0) {
            return res.status(200).json(
                {
                    success : true,
                    message : "no content"
                }
            );
        } 
        // api 데이터 1개 이상 조회될 때
        else {
            let totalCount = 0;

            for(let [key, value] of spaceDataMap) {
                // Firestore에 저장
                await setFireStoreSpacesByGu(key, value);

                spaces = {
                    ...spaces,
                    [key]: value
                }

                totalCount += value.length;
            }

            return res.status(200).json(
                {
                    success : true,
                    total_count: totalCount,
                    message : {
                        spaces: spaces
                    }
                }
            );
        }
    } catch(e) {
        return res.status(500).json(
            {
                success : false,
                message : e
            }
        );
    }
}

// firestore 입력 : spaces > dongnerangSpaces > dongnerangSpacesByGu > 자치구별
async function setFireStoreSpacesByGu(gu, value) {
    const spaceDocRef = db.collection('spaces').doc('dongnerangSpaces').collection('dongnerangSpacesByGu').doc(gu);

    try {
        await spaceDocRef.set({
            spaces: value
        });
    } catch(e) {
        console.log(e);
    }
}

// spaceData 전체 json > 자치구별로 spaceDataMap 에 저장
async function dataToMapByGu(data) {
    for(const space of data) {
        // uid, 자치구, 장소명, 경도, 위도 유효성 검사
        if (space['uid'] == "" || space['gu'] == "" || space['spaceName'] == "" || space['latitude'] == "" || space['longitude'] == "") {
            break;
        }

        // 위도, 경도 유효성 검사
        if (!((space['latitude'] > 33 && space['latitude'] < 43) && (space['longitude'] > 124 && space['longitude'] < 132))) {
            break;
        }

        // spaceDataMap 에 구별로 저장
        if(spaceDataMap.has(space.gu)) {
            spaceDataMap.get(space.gu).push(space);
        } else {
            spaceDataMap.set(space.gu, [space]);
        }
    }
}

// 파일 읽기 함수
function readFile(path) {
    return new Promise((resolve, reject) => {
        fs.readFile(path, (err, file) => {
            if (err) {
                reject(err);
            }
            resolve(file);
        });
    });
}