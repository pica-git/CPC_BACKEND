
var preProcess = require('./preprocess')

var reg = new RegExp(/[\{\}\.\,\;]/g)
var resultArray = []
var cateArray = [0,0,0,0,0,0,0,0,0,0]


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