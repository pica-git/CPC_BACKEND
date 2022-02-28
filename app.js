let express = require('express')
let app = express()

// var preProcess = require('./process/preprocess')
//var postProcess = require('./process/postprocess')



let multer = require('multer')
let form_data = multer()

let cors = require('cors')

let dfd = require("danfojs-node")
let fs = require('fs')

let elastic = require('./process/elastic')

let corsOption = {
    origin: 'http://localhost:8080',
    credentials: true
}

app.use(form_data.array())
app.use(express.urlencoded({ extended: false }));
app.use(express.json());

app.use(cors(corsOption))

let rootRecord = null
let lastSection = null,
    lastClass = null,
    lastSubClass = null,
    lastMainGroup = null,
    lastSubGroup = [null,null,null,null,null,null]

let sectionIdxArray = [0,0,0,0,0,0,0,0,0,0]

let childTable = [],
    descendantsTable = [],
    addressMappingTable = []
    

class Record{
    constructor(code = null, description = null, descriptionToken = null, index = null, child = null, nextRecord = null, haveChilds = false, totalDescendants = 1){
        this.code = code
        this.description = description
        this.descriptionToken = descriptionToken
        this.index = index
        this.child = child
        this.nextRecord = nextRecord
        this.haveChilds = haveChilds
        this.totalDescendants = totalDescendants
    }
}

async function insertSection(line, recordIndex){
    let descriptionToken = tokenizeDescription(line[2])
    let record = new Record(line[0], line[2], descriptionToken, recordIndex)
    setSectionIdx(line[0][0], recordIndex)
    if(lastSection == null){
        rootRecord = record
        lastSection = record
    }
    else
        lastSection.nextRecord = record
    
    lastSection = record
}

async function insertClass(line, recordIndex){
    let descriptionToken = tokenizeDescription(line[2])
    let record = new Record(line[0], line[2], descriptionToken, recordIndex)
    if(lastSection.child == null)
        lastSection.child = record
    else
        lastClass.nextRecord = record

    lastClass = record
}
async function insertSubClass(line, recordIndex){
    let descriptionToken = tokenizeDescription(line[2])
    let record = new Record(line[0], line[2], descriptionToken, recordIndex)
    if(lastClass.child == null)
        lastClass.child = record
    else
        lastSubClass.nextRecord = record

    lastSubClass = record
    
}
async function insertMainGroup(line, recordIndex){
    let descriptionToken = tokenizeDescription(line[2])
    let record = new Record(line[0], line[2], descriptionToken, recordIndex)
    if(lastSubClass.child == null)
        lastSubClass.child = record
    else
        lastMainGroup.nextRecord = record

    lastMainGroup = record
}
async function insertSubGroup(line, recordIndex){
    let descriptionToken = tokenizeDescription(line[2])
    let record = new Record(line[0], line[2], descriptionToken, recordIndex)
    if(lastMainGroup.child == null)
        lastMainGroup.child = record
    else
        lastSubGroup[0].nextRecord = record
    
    lastSubGroup[0] = record
}

async function insertSubGroup_Above(line, recordIndex){
    let descriptionToken = tokenizeDescription(line[2])
    let record = new Record(line[0], line[2], descriptionToken, recordIndex)
    if(lastSubGroup[line[1]-2].child == null)
        lastSubGroup[line[1]-2].child = record
    else
        lastSubGroup[line[1]-1].nextRecord = record
    
    lastSubGroup[line[1]-1] = record
}



function EraseBracketInDescription(description){
    let descriptionArr = description.split("")
    let refinedDescription = null
        chrArr = [],
        numBracket = 0
    
    for([idx, chr] of descriptionArr.entries()){
        chrArr.push(chr)
        if(chr === '(')
          numBracket += 1
        else if(chr === ')'){
            if(numBracket != 0){
              while(true) {
                if(chrArr.pop() === '(')
                  break
              }
              numBracket -= 1
            }
        }
    }
    
    refinedDescription = chrArr.join('')
  
    return refinedDescription
  
}

function tokenizeDescription(description){
    // () 괄호 안의 문자열을 자르고 스트링화 시킨 후 대문자화 한다.
    // 대문자화는 후에 검색어와 비교할 때 대소문자를 구분하지 않기 위한 방법이다.
    let refineDescription = EraseBracketInDescription(description).toString()
                                .toUpperCase()
    // (\W: _를 제외한 특수문자) (\s: 공백 하나) 그리고 정규식 패턴 \W\s_ 이 여러개 나오면 
    // 연결된 문자열을 " "로 변경  
    // 그리고 trim 으로 맨 앞 뒤의 공백을 없앤 후 " "를 기준으로 토큰화
    let descriptionToken = refineDescription.replace(/[\W\s_]+/gi," ")
                                .trim()
                                .split(" ")
                                
    // console.log("token : ",token)
    return descriptionToken
}
// 2.
// 전체 CPC 데이터에서 각 레코드마다 CPC 코드를 분류하여 계층을 나눈 후 데이터 트리에 구조화
// 하는 함수를 실행한다
let structRecordTree = async (items)=> {
    let regex_Section = new RegExp('^[A-Z]$')
    let regex_Class = new RegExp('^[A-Z][0-9]{2}$')
    let regex_SubClass = new RegExp('^[A-Z][0-9]{2}[A-Z]$')
    let regex_MainGroup = new RegExp('^[A-Z][0-9]{2}[A-Z][0-9]{1,4}/00$')
    let regex_SubGroup = new RegExp('^[A-Z][0-9]{2}[A-Z][0-9]{1,4}/[0-9]{2,6}$')
    let recordIndex = 0
    
    for(let item of items){
        for(line of item){
            if(regex_Section.test(line[0])){
                await insertSection(line, recordIndex)
                recordIndex += 1
            }
            else if(regex_Class.test(line[0])){
                await insertClass(line, recordIndex)
                recordIndex += 1
            }
            else if(regex_SubClass.test(line[0])){
                await insertSubClass(line, recordIndex)
                recordIndex += 1
            }
            else if(regex_MainGroup.test(line[0])){
                await insertMainGroup(line, recordIndex)
                recordIndex += 1
            }
            else if(regex_SubGroup.test(line[0])){    
                if(line[1] == 1){
                    await insertSubGroup(line, recordIndex)
                    recordIndex += 1
                }
                else if(line[1] > 1){
                    await insertSubGroup_Above(line, recordIndex)
                    recordIndex += 1
                }
            }
        }
    }

}

// 4.
// invertedIndexTable을 구축한다. invertedIndexTable은 Map Object을 사용하여 선언했으며
// 각 검색어 토큰 별 index를 추가한다.
let structInvertedIndexTable = async (record) =>{
    
    for(let token of record.descriptionToken){
        let getTokenValue = invertedIndexTable.get(token)
        if(getTokenValue === undefined)
            invertedIndexTable.set(token, [record.index])
        else if(getTokenValue[getTokenValue.length-1] === record.index){
            // console.log("duplicated!")
            continue
        }
        else{
            let tempArr = getTokenValue
            tempArr.push(record.index)
            invertedIndexTable.set(token, tempArr)
        }
    }
    
   
    if(record.child != null){    
        await structInvertedIndexTable(record.child)
    }
    if(record.nextRecord != null){
        await structInvertedIndexTable(record.nextRecord)
    }
    
}
// 5.
// 각 레코드에 대한 child의 index를 기록한 테이블. 
// 클라이언트에서 spread기능을 사용할때 조회한다.
let structChildTable = async (record) => {
    let childArray = [],
        childNextRecord = {...record.child}

    while(childNextRecord != null){
        childArray.push(childNextRecord.index)
        childNextRecord = childNextRecord.nextRecord
    }
    childTable.push(childArray)
    
    if(record.child != null){    
        record.haveChilds = true
        await structChildTable(record.child)
    }
    if(record.nextRecord != null){
        await structChildTable(record.nextRecord)
    }
}

// 6.
// 각 레코드 인덱스마다 recordTree에 존재하는 각 Record의 주소를 매핑한다.
// 그러면 addressMappingTable[recordindex] = recordIndex의 메모리상 주소
// 가 되고 addressMappingTable[recordindex].code, addressMappingTable[recordindex].description .....
// 으로 접근가능하게 된다.
let structAddressMappingTable = async (record) => {

    addressMappingTable.push(record)

    if(record.child != null)  
        await structAddressMappingTable(record.child)
    if(record.nextRecord != null)   
        await structAddressMappingTable(record.nextRecord)
     
}

// 7.
// 각 row의 descendants를 구한다. 이는 invertedIndexTable에서 descendants를 remove할 때 
// 사용하기 위해 struct한 table이다.
let structDescendantsTable = async (record) => {
    if(record.child != null){
        let descendantsIndexOfElement = await concatDescedantsIndex(record.child)
        descendantsTable.push(descendantsIndexOfElement)
        await structDescendantsTable(record.child)
    }  
    else{
        descendantsTable.push([])
    }
    
    if(record.nextRecord != null){
        await structDescendantsTable(record.nextRecord)
    }
}
// record의 index를 연결하여 DescendantsTable의 각row에 반환한다.
let concatDescedantsIndex = async (record) => {
    let childIndexArr = [],
        nextRecordIndexArr = []
    
    if(record.child != null)
        childIndexArr = await concatDescedantsIndex(record.child)
    if(record.nextRecord != null)
        nextRecordIndexArr = await concatDescedantsIndex(record.nextRecord)

    return [record.index].concat(childIndexArr.concat(nextRecordIndexArr))
}


//8.
// descendantsTable을 참조하여 각 record에 해당하는 descendats를 제거한다.
let cutChildInInvertedIndexTable = async () =>  {
    console.time('for'); 
    await invertedIndexTable.forEach(async (value, key)=>{
        let copiedValue = [...value],
            idx = 0
        
        while(copiedValue.length != 0 && idx < copiedValue.length){
            let element = copiedValue[idx++]
            copiedValue = copiedValue.filter(iter => !descendantsTable[element].includes(iter))
        }
        invertedIndexTable.set(key, copiedValue)
        
    })
    console.timeEnd('for'); 
    
}

// 3.
// 하위 계층 레코드의 수를 계산.
// recursion으로 stack을 쌓아 맨 마지막으로 호출된 마지막 레코드부터 
// 레코드가 가지고 있는 하위 계층 레코드의 합을 상위 계층으로 return 하고 그 값을 return 받은 레코드가
// 레코드 값을 갱신하고 다시 그 값을 상위 레코드에 전달해주는 방식이다.
let setNumberDescendants = async (record) => {
    let numChild = 0,
        numNextRecord = 0
    
    if(record != null){
        if(record.child != null)
        {    
            numChild = await setNumberDescendants(record.child)
        }
        if(record.nextRecord != null){
            numNextRecord = await setNumberDescendants(record.nextRecord)
        }

        record.totalDescendants = record.totalDescendants + numChild 

        return record.totalDescendants + numNextRecord
    }

}



// 1. CPC 엑셀 파일을 읽어들여 연결리스트 형태의 트리 구조화하는 루틴
let readXLS = () => {
    let cpcItems = [],
        file_idx = 0
    //파일을 읽어들여 fileList형태로 저장
    fs.readdir(process.cwd()+"/public/CPC", function(error, fileList){
        // fileList에는 파일명의 목록이 저장되고 forEach로 local_xcel에 각각의 파일명을 전달한다.
        fileList.forEach(async (local_xcel)=>{
            file_idx++
            // 파일 인덱스가 9(마지막 섹션)이 아니면 파일을 계속 읽어들여 cpcItems(CPC 데이터의 저장공간)에 푸쉬한다.
            if(file_idx != 9){
                let readFile = await dfd.read_excel(process.cwd()+"/public/CPC/"+local_xcel).then((readFile)=>{
                    cpcItems.push(readFile.$data)
                })
            }
            // 파일 인덱스가 9(마지막 섹션)이면 연속적 콜백 구조로 동기적인 데이터 세팅 루틴을 실행한다. - structRecordTree
            // 먼저 전제 레코드들을 트리 구조화한 후 트리에 존재하는 각각의 레코드에 하위계층 데이터의 수를 세팅하여
            // 레코드 구조를 완성한다.  - setNumberDescendantsTree
            else if(file_idx == 9){
                let readFile = await dfd.read_excel(process.cwd()+"/public/CPC/"+local_xcel).then((readFile)=>{
                    cpcItems.push(readFile.$data)
                }).then(()=>{
                    console.log("1.readXLS()")
                    structRecordTree(cpcItems).then(()=>{ 
                        console.log("2.structRecordTree()")
                        
                        setNumberDescendants(rootRecord).then(()=>{
                            console.log("3.setNumberDescendantsInTree")
                            structChildTable(rootRecord).then(()=>{
                                console.log("5.structChildTable")
                                
                                // console.log(childTable)
                                console.log(childTable.length)
                                structAddressMappingTable(rootRecord).then(()=>{
                                    console.log("6.structAddressMappingTable")
                                    // console.log(addressMappingTable)
                                    console.log(addressMappingTable.length)
                                    structDescendantsTable(rootRecord).then(()=>{
                                        console.log("7.structDescendantsTable")
                                        // console.log(descendantsTable)
                                        console.log(descendantsTable.length)
                                    })   
                                })
                            })
                        })
                    })
                })
            }
            
        })
        
    })

    return rootRecord
}

let setSectionIdx = (chr, recordIndex) =>{
    if(chr ==='A')
        sectionIdxArray[1] = recordIndex
    else if(chr === 'B')
        sectionIdxArray[2] = recordIndex
    else if(chr === 'C')
        sectionIdxArray[3] = recordIndex
    else if(chr === 'D')
        sectionIdxArray[4] = recordIndex
    else if(chr === 'E')
        sectionIdxArray[5] = recordIndex
    else if(chr === 'F')
        sectionIdxArray[6] = recordIndex
    else if(chr === 'G')
        sectionIdxArray[7] = recordIndex
    else if(chr === 'H')
        sectionIdxArray[8] = recordIndex
    else if(chr === 'Y')
        sectionIdxArray[9] = recordIndex
}
let initState = () => {
    resultArray = []
}

let tokenizeKeyword = async (keyword) => {
  // (\W: _를 제외한 특수문자) (\s: 공백 하나) 그리고 정규식 패턴 \W\s_ 이 여러개 나오면 
  // 연결된 문자열을 " "로 변경  
  // 그리고 trim 으로 맨 앞 뒤의 공백을 없앤 후 대문자화(대소문자 구분을 없애고 비교하기 위해)
  // 를 진행하고 " "를 기준으로 토큰화
  // 즉 결과적으로 모든 특수문자 및 공백이 제거된 단어들로 토큰 배열을 return한다.
  let keywordToken = keyword.replace(/[\W\s_]+/gi," ")
                        .trim()
                        .toUpperCase()
                        .split(" ")

  console.log("token : ", keywordToken)
  return keywordToken
}


// 검색어 간 교집합 레코드들을 추려낸다.
let intersectionRecordsSearch = async (targetRecords) => {
    let intersectionRecords = [],
        meetFirst = false

    // filter함수를 통해 교집합을 찾을 때
    // intersectionRecords가 빈 배열이면 교집합도 빈 배열이므로 keyword 순서 중 가장 처음으로
    // cpc 문서에 존재하는 검색어에 해당될 경우 intersectionRecords에 저장한다.
    for(let recordId of targetRecords){
        if(!meetFirst){
            intersectionRecords = [recordId].concat([...descendantsTable[recordId]])
            meetFirst = true
            continue
        }
        
        console.log(recordId," ",intersectionRecords)
        intersectionRecords = [recordId].concat(intersectionRecords).filter(it => !descendantsTable[recordId].includes(it))
        
    }
    
    return intersectionRecords
}

// intersection 레코드들을 실제 데이터로 바꾸는 과정. 각 페이지에 렌더링되는 정보만을 추적하여
// 잘라낸다. 그렇기 때문에 보내는 레코드들의 rows number는 항상 10이다. 
let getRecords = async (searchTargetRecords, section, page) =>{
    let resultIndex = [],
        resultArray = []
    //만약 section= 0일 경우 'All' 섹션이므로 섹션 상관없이 첫 레코드 10개만을 필요로 하기때문에
    // 첫 10개만을 가져온다.
    if(section === 0){
        resultIndex = searchTargetRecords.slice((page - 1) * 10, page * 10)

    }
    // 'All' 섹션과 마지막 섹션을 제외한 나머지 섹션 중에서 section 정보를 이용해 
    //  요구받은 section의 페이지를 가져온다.
    else if(section > 0 && section < 9){
        for(let recordIndex of searchTargetRecords){
            if(sectionIdxArray[section]<= recordIndex && sectionIdxArray[section+1]> recordIndex )
                resultIndex.push(recordIndex)
        } 
        resultIndex = resultIndex.slice((page - 1) * 10, page * 10)
    } 
    // 마지막 섹션('Z')의 페이지를 가져온다.
    else if(section === 9){
        for(let recordIndex of searchTargetRecords){
            if(sectionIdxArray[section] <= recordIndex)
                resultIndex.push(recordIndex)
        } 
        resultIndex = resultIndex.slice((page - 1) * 10, page * 10)
    }
    // 레코드들의 code, descendants 개수, description, index, child를 가지고 있는지 여부를 보낸다.
    // haveChilds는 spread 버튼의 여부를 결정한다.
    for(let index of resultIndex){
        let record = addressMappingTable[index]
        resultArray.push([record.code, record.totalDescendants, record.description, record.index, record.haveChilds])
    }

    return resultArray
}

// 모든 레코드의 수, 각 섹션 별 레코드의 수, 각 섹션 별 페이지의 수
let calcAdditionalInfo = async (searchTargetRecords) => {
    let addInfo = {},
        sectionNumArray = [0,0,0,0,0,0,0,0,0,0]
        pageNumArray = [0,0,0,0,0,0,0,0,0,0]
    // console.log(sectionIdxArray)
    // 모든 레코드의 수(in 'All' Section)
    sectionNumArray[0] = searchTargetRecords.length
    // 각 섹션 별 레코드의 수
    for(let record of searchTargetRecords){
        if(record >= sectionIdxArray[9])
            sectionNumArray[9] += 1
        else if(record >= sectionIdxArray[8])
            sectionNumArray[8] += 1
        else if(record >= sectionIdxArray[7])
            sectionNumArray[7] += 1
        else if(record >= sectionIdxArray[6])
            sectionNumArray[6] += 1
        else if(record >= sectionIdxArray[5])
            sectionNumArray[5] += 1
        else if(record >= sectionIdxArray[4])
            sectionNumArray[4] += 1
        else if(record >= sectionIdxArray[3])
            sectionNumArray[3] += 1
        else if(record >= sectionIdxArray[2])
            sectionNumArray[2] += 1
        else if(record >= sectionIdxArray[1])
            sectionNumArray[1] += 1
    }
    
    addInfo.recordsPerSection = sectionNumArray
    
    for(let i = 0; i < 10; i++){
        pageNumArray[i] = Math.floor(sectionNumArray[i]/10)
        if(sectionNumArray[i]%10 != 0)
            pageNumArray[i] += 1 
    }
    addInfo.pagePerSection = pageNumArray
        
    return addInfo
}

// 클라이언트에서 child를 펼치고 싶을 경우 클릭한 row의 Index를 이용해 childTable에서 
// 조회한 후 addressMappingTable로 실제 데이터들을 가져와서 return
let searchChildRecordsForSpread = async (body) => {
    let targetChilds = [],
        itemArray = [],
        returnObject = {}

    targetChilds = childTable[body.parentIndex].slice(body.expansionOrderNum*10, (body.expansionOrderNum+1)*10)
    for(let childIndex of targetChilds){
        let record = addressMappingTable[childIndex]
        itemArray.push([record.code, record.totalDescendants, record.description, record.index, record.haveChilds])
    }
    returnObject.childs = itemArray
    
    return returnObject
}
// 검색어를 토큰화 시킨 후 만약 빈 검색어, 토큰이 아니라면 inverted index table을 조회한 후 
// intersection 레코드들을 찾는다. 찾은 레코드들 addressMappingTable을 이용해 실제 레코드 데이터로 변환하여
// resultRecords에 담고 추가로 각 섹션별 찾은 레코드 개수, 섹션 별 페이지 개수를 담아 
// return
let searchRecords = async (body) => {
    let keyword = body.keyword
    let searchTargetRecords = []
    
    let rcvBody = await elastic.searchDocument('cpc', keyword, 'and')
    let targetRecords = []
    let rcvitems = rcvBody.hits.hits
    
    for(item of rcvitems){
        targetRecords.push(parseInt(item._id))
    }
    
    targetRecords.sort((a, b)=> a - b)
    console.log(targetRecords)
    
    if(!(targetRecords.length == 0))
        searchTargetRecords = await intersectionRecordsSearch(targetRecords)
    
    
    let resultRecords  = [],
        addInfo = {
            recordsPerSection:[0,0,0,0,0,0,0,0,0,0],
            pagePerSection:[0,0,0,0,0,0,0,0,0,0]
        }
    
    if(searchTargetRecords.length != 0){
        addInfo = await calcAdditionalInfo(searchTargetRecords)
        resultRecords = await getRecords(searchTargetRecords, body.section, body.page)
    }
    
    let resData = {
        items: resultRecords,
        addInfo: addInfo
    }
    
    let resJsonEncode = JSON.stringify(resData)
    //console.log(resJsonEncode)
    return resJsonEncode
    
}
/// preprocessing area ------------->

readXLS()
  

///  <------------ preprocessing area


// 포트 3000번 사용
app.listen(3000, () => {
    console.log("port 3000 server start")
})


// request 요구한 검색어에 대한 레코드들을 전송하는 api
app.post('/api/searchCpcItems', async (req, res, nxt) => {
    console.log("receive req : ", req.body.keyword)
    await initState()

    let resJsonEncode = await searchRecords(req.body)
    
    await res.send(resJsonEncode)
})

app.post('/api/spreadChild',async (req, res, nxt)=>{
    console.log("receive req : ", req.body.parentIndex)
    let returnObject = await searchChildRecordsForSpread(req.body)
    let resJsonEncode = JSON.stringify(returnObject)

    await res.send(resJsonEncode)
})
// 임시
app.post('/api',async (req, res, nxt) => {
    console.log("receive root req")
    res.send("root acc succ")
})