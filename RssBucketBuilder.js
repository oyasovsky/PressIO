var feed = require('feed-read');
var rssFeedsArray = ['http://rss.cnn.com/rss/edition.rss'];

function parseFeed(url) {
	feed(url,function(err,rawArticles) {
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
		
		console.log(articles);
	});

}

function main() {
	for (var i = 0; i <  rssFeedsArray.length; i++) {
		parseFeed(rssFeedsArray);
	}
}

main();
