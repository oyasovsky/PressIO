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



    jsdom.env({
      url: feedUrl,
      scripts: ["http://code.jquery.com/jquery.js"],
      done: function (err, window) {
        var $ = window.$;

        $(".story-body__inner .story-body__introduction").each(function(i, l) {
            mainParagraphs.push($(this).text());
        });

        var isMain = true;
        var isMed = false;
        var isSec = false;

        
        $("#article-entry > p").each(function(i, l) {

            if ($(this).text().trim()=="" || (i >= 1)) {
                isMain = false;
                isMed = true
            }
         if (i >= 4) {
          isMed = false;
          isSec = true;
      }         
      
      if (isMain) mainParagraphs.push($(this).text());
      if (isMed) medParagraphs.push($(this).text());
      if (isSec) secondaryParagraphs.push($(this).text());

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
