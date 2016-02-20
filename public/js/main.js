var colors = ['#1abc9c',  '#57d68d', '#5cace2', '#9b59b6', '#f1c40f', '#e67e22', '#e74e60']
angular.module('pressIO', [])
	.controller('RSSTagsController', ['$scope', function ($scope) {
    $scope.rssFeeds = [
      "David Bowie",
      "Turkey Bombing",
      "Middle East Crisis",
      "Oscar Nominations",
      "World Poverty Report"
    ];
  }]);

var pos = Math.floor(Math.random()*colors.length);

setTimeout(function() {
	console.log("timeout");
	i=pos;
	$("ul.rss-tags li").each(function() {
		console.log("color: ", colors[i]);
		$(this).css("background-color", colors[i++]);
		if (i==colors.length) i=0;
	});
}, 2000);

