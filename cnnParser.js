var http = require('http');
var jsdom = require('jsdom').jsdom;
var deasync = require('deasync');

var doneParseUrl=false;

var waitForFunctionParseUrl= function() { return !doneParseUrl; };

var result;
function getParsedArticle(feedUrl) {
	result=null;
	var mainParagraphs = [];
	var medParagraphs = [] ;
	var secondaryParagraphs = [];

	jsdom.env({
		url:feedUrl,
		scripts: ["http://code.jquery.com/jquery.js"],
		done: function (err,window) {
			if (err) ("err: " ,err);
			var $ = window.$;
			$("section.zn-body-text .el__leafmedia--sourced-paragraph > .zn-body__paragraph").each(function(i, l) {
				mainParagraphs.push($(this).text());
			});
			$("section.zn-body-text > .l-container > .zn-body__paragraph").each(function(i, l) {
				medParagraphs.push($(this).text());
			});
			$("section.zn-body-text .zn-body__read-all > .zn-body__paragraph").each(function(i, l) {
				secondaryParagraphs.push($(this).text());
			});
			
			doneParseUrl = true;
			result={"main":mainParagraphs, "med": medParagraphs, "secondary":secondaryParagraphs};
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
