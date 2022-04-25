let elastic = require('./elastic')

// let client = new elasticsearch.Client({
//     host: 'localhost:9200',
//     log: 'trace'
// })

// client.ping({
//     // ping usually has a 3000ms timeout
//     requestTimeout: 3000
//   }, function (error) {
//     if (error) {
//       console.trace('elasticsearch cluster is down!');
//     } else {
//       console.log('All is well');
//     }
// });
  

let fs = require("fs")
const xlsx = require( "xlsx" );

let indexing = async () => {
    let id = 0
    let bodyItem = new Map()
   
    try{
        fs.readdir(process.cwd()+"/public/CPC", async (error, fileList) => {
            await fileList.forEach(async (cpc_file) => {

                let data = xlsx.readFile(process.cwd()+"/public/CPC/"+ cpc_file)
                let sheetName = data.SheetNames[0]         // @details 첫번째 시트 정보 추출
                let firstSheet = data.Sheets[sheetName]       // @details 시트의 제목 추출
                let jsonData = xlsx.utils.sheet_to_json(firstSheet, { defval : "" })
                
                for (let instance of jsonData)
                {
                    if(instance['코드'] == '')
                        continue
                    
                    let body = {
                        id: id,
                        code: instance['코드'],
                        description: instance['원문']
                    }
                    
                    bodyItem.set(id++, body)
                }   
            })
           
            for (let item of bodyItem){
                await elastic.createDocument('cpc', item[0], item[1])
                // console.log(item[0], item[1])
            }
            
            
        })
        
    } catch(err){
        console.log(err)
    } 

        
    
}

indexing()


// async function run () {

// }

// run().catch(console.log)
