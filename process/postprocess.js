
var preProcess = require('./preprocess')

var reg = new RegExp(/[\{\}\.\,\;]/g)
var resultArray = []
var cateArray = [0,0,0,0,0,0,0,0,0,0]



/** 괄호 안의 내용 제외 및 낱말만을 검색 */
async function searchData(sentence, query) { 
    
    const sentenceArr = sentence.split("")
    const queryLength  = query.toString().length
    let isBlocked = false
    
    
    for (const [idx, chr] of sentenceArr.entries()){
        
        if(isBlocked) 
            continue
        
        if(chr == '(') isBlocked = true
        else if(chr == ')') isBlocked = false
        
        if((sentence[idx-1] == ' ' || idx == 0) && (sentence[idx+queryLength] == ' ' || idx+queryLength == sentenceArr.length)){
            
            if(sentence[idx] == query[0]){
                let word_num = 1
                let query_idx = 1
                for(i = idx+1; i < idx+queryLength; i++)
                {
                    if(sentence[i] != query[query_idx]) break

                    query_idx++
                    word_num++
                }

                if(word_num == queryLength) {
                    return true 
                }
            }
        }
    }
    return false
}

function categoryNumCalculation(chr){
    if(chr == 'A')
        cateArray[0] += 1
    else if(chr == 'B')
        cateArray[1] += 1
    else if(chr == 'C')
        cateArray[2] += 1
    else if(chr == 'D')
        cateArray[3] += 1
    else if(chr == 'E')
        cateArray[4] += 1
    else if(chr == 'F')
        cateArray[5] += 1
    else if(chr == 'G')
        cateArray[6] += 1
    else if(chr == 'H')
        cateArray[7] += 1
    else if(chr == 'Y')
        cateArray[8] += 1
    else if(chr == 'Z')
        cateArray[9] += 1
}

async function dataTreePreOrderSearch(node, query){
    let flag = false
    if(node != null){
        
        var refineSentence = node.data.toString().replace(reg,' ')
        
        if(await searchData(refineSentence, query)){
            console.log(node.code, " ", node.num, " ", node.data)

            categoryNumCalculation(node.code[0])

            resultArray.push([node.code, node.num, node.data])
            flag = true
        }
        if(node.child != null && flag == false){
            dataTreePreOrderSearch(node.child, query)
        }
        if(node.nextNode != null){
            dataTreePreOrderSearch(node.nextNode, query)
        }
        
    }
}

async function sendSearchData(req, rootNode) {
    
    dataTreePreOrderSearch(rootNode, req.body.data)
    let resData = {
        data: resultArray,
        categorySum: cateArray 
    }
    let resJsonEncode = JSON.stringify(resData)
    return resJsonEncode
    
}


module.exports = {
    dataTreePreOrderSearch,
    sendSearchData
}