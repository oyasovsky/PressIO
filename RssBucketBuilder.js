var feed = require('feed-read');
var WordPOS = require('wordpos');
var wordpos= new WordPOS();
var deasync = require('deasync');

var rssFeedsArray = [['http://rss.cnn.com/rss/edition.rss',require('./cnnParser')]];

var data = {};
var doneParseRss = false;
var waitForFunctionParseRss = function() { return !doneParseRss; };
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
			doneParseRss=false;
			console.log("Data : " +JSON.stringify(data));
			data={};
		}
	});

}

function main() {
	for (var i = 0; i <  rssFeedsArray.length; i++) {
		parseFeed(rssFeedsArray[i]);
	}
}

main();
