var http = require('http');
var jsdom = require('jsdom').jsdom;
var deasync = require('deasync');

var doneParseUrl=false;

var waitForFunctionParseUrl= function() { return !doneParseUrl; };

var result;

function getParsedArticle(feedUrl) {
    var mainParagraphs = [];
    var medParagraphs = [];
    var secondaryParagraphs = [];
    doneParseUrl=false;

    jsdom.env({
      url: feedUrl,
      scripts: ["http://code.jquery.com/jquery.js"],
      done: function (err, window) {
        var $ = window.$;
        var isMain = true;
        var isMed = false;
        var isSec = false;

	var count = 0;
        $(".article-body .article-copy p:not(.t_callout), .article-body .article-copy h3").each(function(i, l) {
        if ($(this).text().trim()==="") return true;
        if (isSec && $(this).is("h3")) return false;

        if ((isMed && $(this).is("h3")) || count > 10 ){
              	isMed = false;
              	isSec = true;
        }	

  	if ((isMain && $(this).is("h3")) || count > 5 ) {
            	isMain = false;
            	isMed = true;
        }

        if (isMain) mainParagraphs.push($(this).text());
        if (isMed) medParagraphs.push($(this).text());
        if (isSec) secondaryParagraphs.push($(this).text());
		 
	count++;

      });

        doneParseUrl=true;

        result={"main":mainParagraphs , "med":medParagraphs, "secondary":secondaryParagraphs};
    }

});
}
module.exports = {
	getParsedData: function (feedUrl) {
		doneParseUrl = false;
		getParsedArticle(feedUrl);
		deasync.loopWhile(waitForFunctionParseUrl);
		return result;
	}
};
