var feed = require('feed-read');
var WordPOS = require('wordpos');
var wordpos= new WordPOS();
var deasync = require('deasync');
var hashes = require('hashes');

var excludeWordsSet = new hashes.HashSet();
excludeWordsSet.add('full');
excludeWordsSet.add('episode');
excludeWordsSet.add('watch');


var rssFeedsArray = [['http://rss.cnn.com/rss/edition.rss',require('./cnnParser')]];
var consolidatedData = [];
var NUMBER_OF_SIMILARITIES_TO_MATCH=2;

var data = {};
var buckets = [[]].pop(); //creating enpty matrix
var doneParseRss = false;
var doneGoingOverFeeds = false;

var waitForFunctionParseRss = function() { return !doneParseRss; };
var waitForFunctionParseRssFeed = function() { return !doneGoingOverFeeds; };

function isNumber(n) { return /^-?[\d.]+(?:e-?\d+)?$/.test(n); } 

function paragraphsFormater(pharagraphs) {
	return pharagraphs;
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

function main() {
	for (var i = 0; i <  rssFeedsArray.length; i++) {
		parseFeed(rssFeedsArray[i]);
		deasync.loopWhile(waitForFunctionParseRssFeed);
		doneGoingOverFeeds=false;
	}
	advancedBucketSort();
	console.log(JSON.stringify(buckets));
}

main();
