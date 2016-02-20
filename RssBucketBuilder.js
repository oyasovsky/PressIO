var feed = require('feed-read');
var rssFeedsArray = [['http://rss.cnn.com/rss/edition.rss',require('./cnnParser')]];

function paragraphsFormater(pharagraphs) {
	return pharagraphs;
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
			var paragraphs = parser.getParsedData(articles[j].link);
			paragraphs=paragraphsFormater(paragraphs);
			console.log(paragraphs);
		}
	});

}

function main() {
	for (var i = 0; i <  rssFeedsArray.length; i++) {
		parseFeed(rssFeedsArray[i]);
	}
}

main();
