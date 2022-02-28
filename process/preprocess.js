
const dfd = require("danfojs-node")
const fs = require('fs')

var cpcItems = []
var rootNode = null
var lastSection = null
var lastClass = null
var lastSubClass = null
var lastMainGroup = null
var lastSubGroup = [null,null,null,null,null,null]

class Node{
    constructor(code = null, data = null, child = null, nextNode = null, num = 1){
        this.code = code
        this.data = data
        this.child = child
        this.nextNode = nextNode
        this.num = num
    }
}

function insertSection(data){
    let node = new Node(data[0], data[2])
    if(lastSection == null){
        rootNode = node
        lastSection = node
    }
    else
        lastSection.nextNode = node
    
    lastSection = node
}

function insertClass(data){
    let node = new Node(data[0], data[2])
    if(lastSection.child == null)
        lastSection.child = node
    else
        lastClass.nextNode = node

    lastClass = node
}
function insertSubClass(data){
    let node = new Node(data[0], data[2])
    if(lastClass.child == null)
        lastClass.child = node
    else
        lastSubClass.nextNode = node

    lastSubClass = node
    
}
function insertMainGroup(data){
    let node = new Node(data[0], data[2])
    if(lastSubClass.child == null)
        lastSubClass.child = node
    else
        lastMainGroup.nextNode = node
        
    
    lastMainGroup = node
}
function insertSubGroup(data){
    let node = new Node(data[0], data[2])
    if(lastMainGroup.child == null)
        lastMainGroup.child = node
    else
        lastSubGroup[0].nextNode = node
    
    
    lastSubGroup[0] = node
}

function insertSubGroup_Above(data){
    let node = new Node(data[0], data[2])
    if(lastSubGroup[data[1]-2].child == null)
        lastSubGroup[data[1]-2].child = node
    else
        lastSubGroup[data[1]-1].nextNode = node
    
    lastSubGroup[data[1]-1] = node
}

async function structDataTree(items){
    const regex_Section = new RegExp('^[A-Z]$')
    const regex_Class = new RegExp('^[A-Z][0-9]{2}$')
    const regex_SubClass = new RegExp('^[A-Z][0-9]{2}[A-Z]$')
    const regex_MainGroup = new RegExp('^[A-Z][0-9]{2}[A-Z][0-9]{1,4}/00$')
    const regex_SubGroup = new RegExp('^[A-Z][0-9]{2}[A-Z][0-9]{1,4}/[0-9]{2,6}$')
    
    for(item of items){
        for( [idx,line] of item.entries()){
            if(regex_Section.test(line[0])){
                insertSection(line)
            }
            else if(regex_Class.test(line[0])){
                insertClass(line)
            }
            else if(regex_SubClass.test(line[0])){
                insertSubClass(line)
            }
            else if(regex_MainGroup.test(line[0])){
                insertMainGroup(line)
            }
            else if(regex_SubGroup.test(line[0])){    
                if(line[1] == 1){
                    insertSubGroup(line)
                }
                else if(line[1] > 1){
                    insertSubGroup_Above(line)
                }
            }
        }
    }

}

async function setNumberLowerClassOfTree(node){
    let numChild = 0
    let numNextNode = 0
    if(node != null){
        if(node.child != null)
        {    
            numChild = await setNumberLowerClassOfTree(node.child)
        }
        if(node.nextNode != null){
            numNextNode = await setNumberLowerClassOfTree(node.nextNode)
        }
        node.num = node.num + numChild 
        return node.num + numNextNode
    }

}

function readXLS(){
    let file_idx = 0
    fs.readdir(process.cwd()+"/public/cpc", function(error, fileList){
        fileList.forEach(async (local_xcel)=>{
            file_idx++
            if(file_idx != 10){
                let readFile = await dfd.read_excel(process.cwd()+"/public/cpc/"+local_xcel).then((readFile)=>{
                    //console.log("inside.forEach")
                    cpcItems.push(readFile.$data)
                })
            }
            else if(file_idx == 10){
                let readFile = await dfd.read_excel(process.cwd()+"/public/cpc/"+local_xcel).then((readFile)=>{
                    //console.log("inside.forEach")
                    cpcItems.push(readFile.$data)
                }).then(()=>{
                    console.log("1.readXLS()")
                    structDataTree(cpcItems).then(()=>{
                        console.log("2.structDataTree()")
                        setNumberLowerClassOfTree(rootNode).then(()=>{
                            console.log("3.setNumberLowerClassOfTree")
                            console.log("4.rootNode:", rootNode)
                        })
                    })
                })
            }
            
        
            
            // console.log(cpcItems[0][0])
        })
        
    })

    console.log("--- read success xls files ---")
    return rootNode
}

// function readXLS(){
//     fs.readdir(process.cwd()+"/public/cpc", function(error, fileList){
//         fileList.forEach(async (local_xcel)=>{
//             let readFile = await dfd.read_excel(process.cwd()+"/public/cpc/"+local_xcel).then((readFile)=>{
//                 console.log("inside.forEach")
//                 cpcItems.push(readFile.$data)
//             }).then(()=>{
//                 console.log("1.readXLS()")
//                 structDataTree(cpcItems).then(()=>{
//                     console.log("2.structDataTree()")
//                     setNumberLowerClassOfTree(rootNode).then(()=>{
//                         console.log("3.setNumberLowerClassOfTree")
//                         console.log("4.rootNode:", rootNode)
//                     })
//                 })
//             })
        
            
//             // console.log(cpcItems[0][0])
//         })
        
//     })

//     console.log("--- read success xls files ---")

// }
// async function preProcessing(){
    
//     readXLS().then(() => {
//         console.log("1.readXLS()")
//         structDataTree(cpcItems).then(()=>{
//             console.log("2.structDataTree()")
//         }).then(()=>{
//             setNumberLowerClassOfTree(rootNode).then(()=>{
//                 console.log("3.setNumberLowerClassOfTree")
//                 console.log("4.rootNode:", rootNode)
                
//             })
//         })
//     })


    
    
    
//     // await structDataTree(cpcItems)
//     // console.log("2.structDataTree()")
//     // await setNumberLowerClassOfTree(rootNode);
//     // console.log("3.setNumberLowerClassOfTree")
//     // console.log("4.rootNode:", rootNode)
    
    
//     // setTimeout(function(){
//     //     structDataTree(cpcItems)
//     // }, 4000)

//     // setTimeout(function(){
//     //     setNumberLowerClassOfTree(rootNode);
//     // }, 5000)

//     // setTimeout(function(){
//     //     console.log(rootNode)
//     // }, 6000)
    
    
// }

function preProcessing(){
    return readXLS()

}
    

module.exports = {
    preProcessing
}