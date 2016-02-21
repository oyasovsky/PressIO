var feed = require('feed-read');
var http = require('http');
var WordPOS = require('wordpos');
var wordpos= new WordPOS();
var deasync = require('deasync');
var hashes = require('hashes');
var synonyms = require('find-synonyms');

var excludeWordsSet = new hashes.HashSet();
excludeWordsSet.add('full');
excludeWordsSet.add('episode');
excludeWordsSet.add('watch');

var articlePrimaryPictureLink='';
var articleEntities='';

var rssFeedsArray = [['http://rss.cnn.com/rss/edition.rss',require('./cnnParser')]];
var consolidatedData = [];
var NUMBER_OF_SIMILARITIES_TO_MATCH=2;

var WATSON_API_KEY='d3781cd9347868503ec6d0322715621898fc5d9e';
var GOOGLE_MAP_API_KEY= 'AIzaSyD68KmxQFlbJuxJ6r2DLBBNmK4aY7z5xpo';
var WATSON_API_KEY='42d81bfd30f79b25cd1b3a6b60653e0cbb16b091';

var data = {};
var buckets = [[]].pop(); //creating enpty matrix
var doneParseRss = false;
var doneGoingOverFeeds = false;
var doneGetPrimaryPictureLink  = false;
var doneWithParsingSynonyms = false;
var doneReplaceSynonyms = false;
var articleSummary ='';
var lineToEdit='';
var verbToReplace ='';

var waitForFunctionParseRss = function() { return !doneParseRss; };
var waitForFunctionParseRssFeed = function() { return !doneGoingOverFeeds; };
var waitToImageAndEntities = function() { return !doneGetPrimaryPictureLink ; };
var waitForParsingSynonyms = function() { return !doneWithParsingSynonyms; };
var waitForReplaceSynonyms = function() { return !doneReplaceSynonyms; };

function isNumber(n) { return /^-?[\d.]+(?:e-?\d+)?$/.test(n); } 

function replaceWithSynonyms(syns) {
	var verbToReplaceWithExtra = verbToReplace.slice(0,1) + "###" +  verbToReplace.slice(1);
	var synonymsPlaceHolder = '[' + verbToReplaceWithExtra ;
 	synonymsPlaceHolder = [synonymsPlaceHolder.slice(0, synonymsPlaceHolder.length-1), "###", synonymsPlaceHolder.slice(synonymsPlaceHolder.length-1)].join('');
	synonymsPlaceHolder +=  '|';
	for (var i = 0 ; i < syns.length; i++) {
		if (syns[i] !== verbToReplace) {
			syns[i] = syns[i].replace(/\_/g,' ');
			syns[i] = syns[i].replace(/\([A-Za-z]\)/g,'');
			synonymsPlaceHolder += syns[i].slice(0,1) + "###" +  syns[i].slice(1);    
			synonymsPlaceHolder = [synonymsPlaceHolder.slice(0, synonymsPlaceHolder.length-1), "###", synonymsPlaceHolder.slice(synonymsPlaceHolder.length-1)].join('');
			if (i != syns.length -1) {
				synonymsPlaceHolder +=  '|';
			} 
		}
	}
	synonymsPlaceHolder += ']';
	var re=new RegExp(verbToReplace, 'g');
	lineToEdit = lineToEdit.replace(re,synonymsPlaceHolder );
	doneReplaceSynonyms=true;
}

var getSynonymsParsedResult = function (result) {
	for (var i = 0; i < result.verbs.length; i++) {
console.log(i);
		verbToReplace = result.verbs[i];
		synonyms(verbToReplace,5,replaceWithSynonyms);
		deasync.loopWhile(waitForReplaceSynonyms);
		doneReplaceSynonyms=false;	
	}
	doneWithParsingSynonyms=true;
}

function fixWrongParingAndReplaceWithSynonyms(paragraph) {
	for (var i = 0 ; i < paragraph.length; i++) {
		paragraph[i]=paragraph[i].replace(/\(CNN\)/g,'');
		paragraph[i]=paragraph[i].replace(/\n/g,'');
		paragraph[i]=paragraph[i].replace(/\"/g,'');
		while (paragraph[i].indexOf('""') != -1) {
			paragraph[i]=paragraph[i].replace(/\'\"/g,'"');
		}
		lineToEdit=paragraph[i];
		wordpos.getPOS(lineToEdit,getSynonymsParsedResult);
		deasync.loopWhile(waitForParsingSynonyms);
		paragraph[i]=lineToEdit;
		lineToEdit='';
		doneWithParsingSynonyms=false;
	}
	return paragraph;
}

function removeTripleNumberSign(paragraph) {
	fixedParagraph = [];
	for (var i = 0 ; i < paragraph.length; i++) {
		var re = new RegExp('###','g');
		fixedParagraph[i] = paragraph[i].replace(re,'');
	}
	return fixedParagraph;
}

function paragraphsFormater(paragraphs) {
	paragraphs.main = fixWrongParingAndReplaceWithSynonyms( paragraphs.main);	
	paragraphs.med = fixWrongParingAndReplaceWithSynonyms( paragraphs.med);
	paragraphs.secondary = fixWrongParingAndReplaceWithSynonyms( paragraphs.secondary);	

	paragraphs.main = removeTripleNumberSign(paragraphs.main);
	paragraphs.med = removeTripleNumberSign(paragraphs.med);
	paragraphs.secondary  = removeTripleNumberSign(paragraphs.secondary);

	return paragraphs;
}

function returnSortedLowerCaseArray(rawArray) {
	return rawArray.map(function(x) { return x.toLowerCase(); }).sort();
}

function deleteSimilarWords(array1,array2) {
	deleteIndex =[];
	for (var i = 0; i < array1.length; i++) {
		for (var k = 0; k < array2.length; k++) {
			if (array1[i] === array2[k]) deleteIndex.push(k);
		}
	}

	for (var j = deleteIndex.length - 1; j >= 0; j--) {
		array2.splice(deleteIndex[j], 1);
	}

	return array2;

}
function deleteWrongWords(array) {
	var result = [];
	for (var i = array.length - 1; i >= 0; i--) {
		if (array[i].length > 1) {
			result.push(array[i]);
		}
	}
	return result;
}

function refineArray(result) {
	result.verbs = deleteSimilarWords(result.nouns,result.verbs);
	result.adjectives = deleteSimilarWords(result.nouns,result.adjectives);
	result.adverbs = deleteSimilarWords(result.nouns,result.adverbs);
	result.rest = deleteSimilarWords(result.nouns,result.rest);

        result.adjectives = deleteSimilarWords(result.verbs,result.adjectives);
        result.adverbs = deleteSimilarWords(result.verbs,result.adverbs);   
        result.rest = deleteSimilarWords(result.verbs,result.rest); 

        result.adverbs = deleteSimilarWords(result.adjectives,result.adverbs);
        result.rest = deleteSimilarWords(result.adjectives,result.rest); 

        result.adverbs = deleteSimilarWords(result.rest,result.adverbs);

	result.nouns= deleteWrongWords(result.nouns);
	result.verbs= deleteWrongWords(result.verbs);
	result.adverbs= deleteWrongWords(result.adverbs);
	result.adjectives= deleteWrongWords(result.adjectives);
	result.rest= deleteWrongWords(result.rest);

	return result;
}


var getRssParsedResult = function(result) {
	result.nouns=returnSortedLowerCaseArray(result.nouns);
	result.verbs=returnSortedLowerCaseArray(result.verbs);
	result.adjectives=returnSortedLowerCaseArray(result.adjectives);
	result.adverbs=returnSortedLowerCaseArray(result.adverbs);
	result.rest=returnSortedLowerCaseArray(result.rest);
	data = refineArray(result);
	doneParseRss=true;
}

function parseFeed(rssFeed) {
	var feedUrl = rssFeed[0];
	var parser = rssFeed[1];
	feed(feedUrl,function(err,rawArticles) {
		if (err) throw err;
		//check for duplicated articles
		var articles=[];
		for (var i = 0 ; i < rawArticles.length; i++) {
			var duplicateArticle=false;
			for (var k = 0 ; k < articles.length; k++) {
				if (rawArticles[i].title === articles[k].title) {
					duplicateArticle=true;
					break;
				}	
			}
			if (!duplicateArticle) {
				articles.push(rawArticles[i]);
			}
		}
		for (var j = 0 ; j < articles.length ; j++ ) {	
			if (articles[j].link.indexOf('/video/') != -1 ) continue;
			//Parse title
			wordpos.getPOS(articles[j].title,getRssParsedResult);
			deasync.loopWhile(waitForFunctionParseRss);	
			var paragraphs = parser.getParsedData(articles[j].link);
			paragraphs=paragraphsFormater(paragraphs);
			consolidatedData.push({"source":feedUrl, "articleData":articles[j],"parsedData":data,"pharagraps":paragraphs});
			doneParseRss=false;
			data={};
		}
		doneGoingOverFeeds=true;
	});

}


function findNumberOfSimilarObject(array1,array2) {
	var array1Index = 0;
	var array2Index = 0;
	var numberOfSimilarities = 0;
	while (array1Index < array1.length && array2Index < array2.length) {
		if (excludeWordsSet.contains(array1[array1Index]) || isNumber(array1[array1Index])) {
			array1Index++;
			continue;
		}		
                if (excludeWordsSet.contains(array2[array2Index]) || isNumber(array2[array2Index])) {                                                      
                        array1Index++;                                        
                        continue;                                             
                }
		if (array1[array1Index] == array2[array2Index]) {
			array1Index++;
			array2Index++;
			numberOfSimilarities++;
		} else {
			if (array1[array1Index] > array2[array2Index]) {
				array2Index++;
			} else {
				array1Index++;
 			}
		}
	}
	return numberOfSimilarities;
}

function advancedBucketSort() {
	for (var k = 0 ; k < consolidatedData.length; k++) {
		var mostSimilarIndex = -1;
		var maxOfGlobalIdenticals = 0;
		for (var i = 0  ; i < buckets.length ; i++) {
			var maxOfLocalIdenticals = 0;
			for (var j = 0 ; j < buckets[i].length; j++) {
				var numOfLocalIdenticals = findNumberOfSimilarObject(consolidatedData[k].parsedData.nouns,buckets[i][j].parsedData.nouns);
				numOfLocalIdenticals = findNumberOfSimilarObject(consolidatedData[k].parsedData.verbs,buckets[i][j].parsedData.verbs);
				numOfLocalIdenticals = findNumberOfSimilarObject(consolidatedData[k].parsedData.adverbs,buckets[i][j].parsedData.adverbs);
				numOfLocalIdenticals = findNumberOfSimilarObject(consolidatedData[k].parsedData.adjectives,buckets[i][j].parsedData.adjectives);
				numOfLocalIdenticals = findNumberOfSimilarObject(consolidatedData[k].parsedData.rest,buckets[i][j].parsedData.rest);
				if (numOfLocalIdenticals > maxOfLocalIdenticals) {
					maxOfLocalIdenticals = numOfLocalIdenticals;
				}
			}
			if (maxOfLocalIdenticals > maxOfGlobalIdenticals) {
				maxOfGlobalIdenticals=maxOfLocalIdenticals ;
				mostSimilarIndex = i;
			}
		}
		if (mostSimilarIndex != -1 && maxOfGlobalIdenticals >= NUMBER_OF_SIMILARITIES_TO_MATCH) {
			buckets[mostSimilarIndex].push(consolidatedData[k]);
		} else {
			buckets.push([consolidatedData[k]]);
		}
	}
}

function returnMap(name,zoom) {
	return "https://maps.googleapis.com/maps/api/staticmap?center=" + encodeURIComponent(name) + "&zoom=" + zoom + "&size=300x300&maptype=roadmap&key=" + GOOGLE_MAP_API_KEY;
}

function getArticleImageAndEntities(url) {
	var options = {
		host: "gateway-a.watsonplatform.net",
		port: 80,
		path: '/calls/url/URLGetCombinedData?apikey=' + WATSON_API_KEY + '&url=' + url + '&outputMode=json&extract=entity,image-kw',
		method: 'GET'
	};

	articlePrimaryPictureLink='';
	articleEntities = '';
	var body ='';
	http.request(options,function(res) {
		res.setEncoding('utf8');
		res.on('data', function (chunk) {
			body+=chunk;
		});
		res.on('end', function() {
			articleJson=JSON.parse(body);
			articlePrimaryPictureLink = articleJson.url;
			articleEntities = articleJson.entities;
			for (var i in articleEntities) {				
				if (articleEntities[i].type === "Country") {
					articleEntities[i].map = returnMap(articleEntities[i].text, 4);
				} else {
					if (articleEntities[i].type === "City") {
						articleEntities[i].mapLink = returnMap(articleEntities[i].text, 12);
					}
				}
			}
			doneGetPrimaryPictureLink=true;
		});
	}).end();
}

function returnArticleExtraData(url) {
	doneGetPrimaryPictureLink = false;

	getArticleImageAndEntities(url);
	deasync.loopWhile(waitToImageAndEntities);	
	return { "image" : articlePrimaryPictureLink, "entities":articleEntities};
}

function addStuffToBuckets() {
	for (var i = 0; i < buckets.length; i++) {
		for (var j = 0; j < buckets[i].length; j++) {
			articleSummary = '';	
			var returnData= returnArticleExtraData(buckets[i][j].articleData.link);
			buckets[i][j].imageLink=returnData.image;
			buckets[i][j].entities = returnData.entities;
		}
		buckets[i].push({"numberOfSimilarities" : buckets[i].length});
	}
}

function main() {
	for (var i = 0; i <  rssFeedsArray.length; i++) {
		parseFeed(rssFeedsArray[i]);
		deasync.loopWhile(waitForFunctionParseRssFeed);
		doneGoingOverFeeds=false;
	}
	advancedBucketSort();
	addStuffToBuckets();
	console.log(JSON.stringify(buckets));
}

main();
