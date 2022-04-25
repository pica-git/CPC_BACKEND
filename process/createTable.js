let dfd = require("danfojs-node")
let fs = require('fs')

let rootRecord = null
let lastSection = null,
    lastClass = null,
    lastSubClass = null,
    lastMainGroup = null,
    lastSubGroup = [null,null,null,null,null,null]

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

let insertSection = async (line, recordIndex) => {
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

let insertClass = async (line, recordIndex) => {
    let descriptionToken = tokenizeDescription(line[2])
    let record = new Record(line[0], line[2], descriptionToken, recordIndex)
    if(lastSection.child == null)
        lastSection.child = record
    else
        lastClass.nextRecord = record

    lastClass = record
}
let insertSubClass = async (line, recordIndex) => {
    let descriptionToken = tokenizeDescription(line[2])
    let record = new Record(line[0], line[2], descriptionToken, recordIndex)
    if(lastClass.child == null)
        lastClass.child = record
    else
        lastSubClass.nextRecord = record

    lastSubClass = record
    
}
let insertMainGroup = (line, recordIndex) => {
    let descriptionToken = tokenizeDescription(line[2])
    let record = new Record(line[0], line[2], descriptionToken, recordIndex)
    if(lastSubClass.child == null)
        lastSubClass.child = record
    else
        lastMainGroup.nextRecord = record

    lastMainGroup = record
}
let insertSubGroup = (line, recordIndex) => {
    let descriptionToken = tokenizeDescription(line[2])
    let record = new Record(line[0], line[2], descriptionToken, recordIndex)
    if(lastMainGroup.child == null)
        lastMainGroup.child = record
    else
        lastSubGroup[0].nextRecord = record
    
    lastSubGroup[0] = record
}

let insertSubGroup_Above = (line, recordIndex) => {
    let descriptionToken = tokenizeDescription(line[2])
    let record = new Record(line[0], line[2], descriptionToken, recordIndex)
    if(lastSubGroup[line[1]-2].child == null)
        lastSubGroup[line[1]-2].child = record
    else
        lastSubGroup[line[1]-1].nextRecord = record
    
    lastSubGroup[line[1]-1] = record
}



let EraseBracketInDescription = (description) => {
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
let structInvertedIndexTable = async (record) => {
    
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
    await invertedIndexTable.forEach(async (value, key)=> {
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


// 1. CPC 엑셀 파일을 읽어들여 연결리스트 형태의 트리 구조화하는 루틴
let createTable = () => {
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