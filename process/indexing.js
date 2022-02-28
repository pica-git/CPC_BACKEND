let elasticsearch = require('elasticsearch')
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


let readXLSX = async () => {
    let id = 0
    fs.readdir(process.cwd()+"/public/CPC", async (error, fileList) => {
        await fileList.forEach(async (cpc_file) => {
            try{
                let data = await xlsx.readFile(process.cwd()+"/public/CPC/"+ cpc_file)
                let sheetName = await data.SheetNames[0]         // @details 첫번째 시트 정보 추출
                let firstSheet = await data.Sheets[sheetName]       // @details 시트의 제목 추출
                let jsonData = xlsx.utils.sheet_to_json(firstSheet, { defval : "" })
                
                for await (let instance of jsonData)
                {
                    
                    if(instance['코드'] == '')
                        continue
                    
                    let body = {
                        code: instance['코드'],
                        description: instance['원문']
                    }
                    
                    await elastic.createDocument('cpc', id++, body)
                    console.log(body.code)
                }

            } catch(err){
                console.log(err)
            }

            
            
            
        })
        
    })
    
}



readXLSX()


// async function run () {
    
  


  

  
  
// }

// run().catch(console.log)
