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
// ?????? CPC ??????????????? ??? ??????????????? CPC ????????? ???????????? ????????? ?????? ??? ????????? ????????? ?????????
// ?????? ????????? ????????????
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
// invertedIndexTable??? ????????????. invertedIndexTable??? Map Object??? ???????????? ???????????????
// ??? ????????? ?????? ??? index??? ????????????.
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
// ??? ???????????? ?????? child??? index??? ????????? ?????????. 
// ????????????????????? spread????????? ???????????? ????????????.
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
// ??? ????????? ??????????????? recordTree??? ???????????? ??? Record??? ????????? ????????????.
// ????????? addressMappingTable[recordindex] = recordIndex??? ???????????? ??????
// ??? ?????? addressMappingTable[recordindex].code, addressMappingTable[recordindex].description .....
// ?????? ?????????????????? ??????.
let structAddressMappingTable = async (record) => {

    addressMappingTable.push(record)

    if(record.child != null)  
        await structAddressMappingTable(record.child)
    if(record.nextRecord != null)   
        await structAddressMappingTable(record.nextRecord)
     
}

// 7.
// ??? row??? descendants??? ?????????. ?????? invertedIndexTable?????? descendants??? remove??? ??? 
// ???????????? ?????? struct??? table??????.
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
// record??? index??? ???????????? DescendantsTable??? ???row??? ????????????.
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
// descendantsTable??? ???????????? ??? record??? ???????????? descendats??? ????????????.
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


// 1. CPC ?????? ????????? ???????????? ??????????????? ????????? ?????? ??????????????? ??????
let createTable = () => {
    let cpcItems = [],
        file_idx = 0
    //????????? ???????????? fileList????????? ??????
    fs.readdir(process.cwd()+"/public/CPC", function(error, fileList){
        // fileList?????? ???????????? ????????? ???????????? forEach??? local_xcel??? ????????? ???????????? ????????????.
        fileList.forEach(async (local_xcel)=>{
            file_idx++
            // ?????? ???????????? 9(????????? ??????)??? ????????? ????????? ?????? ???????????? cpcItems(CPC ???????????? ????????????)??? ????????????.
            if(file_idx != 9){
                let readFile = await dfd.read_excel(process.cwd()+"/public/CPC/"+local_xcel).then((readFile)=>{
                    cpcItems.push(readFile.$data)
                })
            }
            // ?????? ???????????? 9(????????? ??????)?????? ????????? ?????? ????????? ???????????? ????????? ?????? ????????? ????????????. - structRecordTree
            // ?????? ?????? ??????????????? ?????? ???????????? ??? ????????? ???????????? ????????? ???????????? ???????????? ???????????? ?????? ????????????
            // ????????? ????????? ????????????.  - setNumberDescendantsTree
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