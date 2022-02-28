/* elastic api에 관한 내용은 
https://www.elastic.co/guide/en/elasticsearch/client/javascript-api/current/api-reference.html
에서 확인 가능
*/
const { Client } = require('elasticsearch')
const { text } = require('express')
const client = new Client({ node: 'http://localhost:9200' })


//인덱스 조회
let getIndex = async (index) => {
    
    console.log('Get index : '+ index)

    return client.indices.get({
        index: index
    }).then(handleResolve)

}
// 인덱스 생성
let createIndex = async (index) => {
    console.log('Create index : '+ index)

    return client.indices.create({
        index: index,
        
    }).then(handleResolve)
}
// 인덱스 삭제
let deleteIndex = async (index) => {
    console.log('Delete index : '+ index)

    return client.indices.delete({
        index: index,
        
    }).then(handleResolve)
}



// 인덱스 업데이트
let updateIndex = (index) => {


}

// 지정한 인덱스에 Analyzer 지정, 왼쪽부터 index, 토크나이저명, 토크나이저 setting, 토큰필터명, 토큰필터 setting, 캐릭터 필터명, 캐릭터 필터 setting 이다.
let putAnalyzerSettings = async (index, tokenizer_name = null, customTokenizer = null, filter_name = null, customFilter = null, charfilter_name = null, customCharfilter = null) =>{
    console.log('Put Analyzer index : '+ index)

    return client.indices.putSettings({
        index: index,
        body: {
            settings: {
                analysis: {
                    analyzer: {
                        my_analyzer: {
                            type: 'custom',
                            char_filter: charfilter_name,
                            tokenizer: tokenizer_name,
                            filter: filter_name
                        }
                    },
                    tokenizer: customTokenizer,
                    char_filter: customCharfilter,
                    filter: customFilter
                }
            }
        }
    }).then(handleResolve)
    
}
// Analyzer 적용을 위한 mappings 정보 입력
let putAnalyzerMappings = async (index, analyzer) => {
    console.log('Put Mappings index : '+ index)

    return client.indices.putMapping({
        index: index,
        body: {
            properties:{
                description:{
                    type: 'text',
                    analyzer: analyzer
                }
            }   
        }
    }).then(handleResolve)
}
// index를 open 상태로 변환
let openIndex = async (index) => {
    console.log('Open index : ', index)

    return client.indices.open({
        index: index
    }).then(handleResolve)
}
// index를 close 상태로 변환
let closeIndex = async (index) => {
    console.log('Close index : ', index)

    return client.indices.close({
        index: index
    }).then(handleResolve)
}

let indexAnalyzerTest = async (index, str) =>  {
    console.log('Test analyzer in ',index)

    return client.indices.analyze({
        index: index,
        body:{
            analyzer:'my_analyzer',
            text: str
        }
    }).then(handleResolve)
}
// 도큐먼트 삭제
let deleteDocument = (index, id) => {
    console.log('Delete document id '+ id + ' in index '+ index)
    
    return clearInterval.asyncSearch.delete({
        index: index,
        id: id
    })
    
}

//도큐먼트 생성, 삽입
let createDocument = async (index, id, body) => { 

    return client.index({
        index: index,
        id: id,
        body: body
    }).then(handleResolve)
}
//도큐먼트 업데이트
let updateDocument = (index, id) => {

    
}
//쿼리를 통해 검색한 도큐먼트를 업데이트(임시, 삭제 가능성)
let updateDocumentByQuery = (query) =>{

} 
// id를 통한 도큐먼트 조회
let getDocument = (index, id) => {
    
}

//id를 통한 child doc 조회
let getChilds = (index, id) => {
    console.log('Search parent id : ', id)

    return client 

}
// 쿼리를 통한 도큐먼트 검색 
let searchDocument = async (index, query, operator) =>{
    console.log('Search keyword : ', query)
    return client.search({
        index: index,
        body: {
            query: {
                match: {
                  description: {
                    query: query,
                    operator: operator
                  }
                }
              }
        }
    })
}




let handleResolve = (body) => {

    if (!body.error) {

        console.log('\x1b[32m' + 'Success' + '\x1b[37m');
        
    } else {
    
        console.log('\x1b[33m' + 'Failed' + '\x1b[37m');
        
    }
    console.log(body)
    return Promise.resolve();
}


module.exports =  {
    getIndex,
    createIndex,
    deleteIndex,
    updateIndex,
    putAnalyzerSettings,
    putAnalyzerMappings,
    openIndex,
    closeIndex,
    indexAnalyzerTest,
    getDocument,
    createDocument,
    deleteDocument,
    updateDocument,
    searchDocument
}