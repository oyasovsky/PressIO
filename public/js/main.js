var colors = ['#1abc9c',  '#57d68d', '#5cace2', '#9b59b6', '#f1c40f', '#e67e22', '#e74e60']
angular.module('pressIO', [])
	.controller('RSSTagsController', ['$scope', '$http', function ($scope, $http) {
	$scope.rssFeeds = [
      	"David Bowie",
      	"Turkey Bombing",
      	"Middle East Crisis",
      	"Oscar Nominations",
      	"World Poverty Report",
	"aaaa",
	"bbbb",
	"ccccc"
    	];

	$scope.hiddenTopics = $scope.rssFeeds.length > 6;
	$scope.moreTagText = "Show More...";

	$scope.setColor = function(index) {
		var i = (index>=colors.length) ? index % colors.length : index;
		return colors[i]; 
	};

	$scope.setRssClass = function(index) {
		if ((index<6) || !$scope.hiddenTopics) return "rssVisible";
		return "rssHidden";
	};
	
	
	$scope.toggleHiddenTopics = function() {
		$scope.hiddenTopics = !$scope.hiddenTopics;
		$scope.moreTagText = $scope.hiddenTopics ? "Show More.." : "Show Less..."; 
	};

	$scope.saveAudio = function(tinymce) {
		var content = tinymce.get('article').getContent();
		var element = $("<div>"+content+"</div>");
	
		var text = element.text();
		var data = $.param({
			text: text;
		});

	
		$http({
			url: "/api/generateAudio",
			method: "POST",
			headers: { 'Content-Type': 'application/x-www-form-urlencoded'},
			data: data
		}).success(function(response, status, headers, config){			
			console.log("here");
					
		});

	};

	$scope.saveVideo = function() {
		console.log("in save video");
	};

  }]);

function ajaxExportAudio() {
	var scope = angular.element(
	document.getElementById("main")).scope();
	scope.$apply(function () {
		scope.saveAudio();
	});
}

function ajaxExportVideo() {
	var scope = angular.element(                                                                                                                                                         
        document.getElementById("main")).scope();
        scope.$apply(function () {
                scope.saveVideo();
        });
}


