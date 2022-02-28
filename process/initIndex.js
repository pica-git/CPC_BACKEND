const elastic = require('./elastic')

let run = async () => {
  await elastic.getIndex('cpc')

  await elastic.deleteIndex('cpc')
  
  await elastic.createIndex('cpc')
  
  await elastic.closeIndex('cpc')
  
  await elastic.putAnalyzerSettings('cpc', 
  'my_tokenizer',
  {
    my_tokenizer:{
      type: "pattern",
      pattern: "[\\W\\s_]+"
    }

  }, 
  ["lowercase", "porter2_stemmer", "unique", "stopwords"],
  {
    porter2_stemmer:{
      type: 'stemmer',
      name: 'porter2'
    },
    stopwords:{
      type: 'stop',
      stopwords: '_english_'
    }
  },
  'bracket_filter',
  {
    bracket_filter:{
      type: "pattern_replace",
      pattern: "\\([^)]+\\)",
      replacement: ""
    }
  })
  await elastic.putAnalyzerMappings('cpc','my_analyzer')

  await elastic.openIndex('cpc')


}
run()
