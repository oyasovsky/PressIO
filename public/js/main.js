var colors = ['#1abc9c',  '#57d68d', '#5cace2', '#9b59b6', '#f1c40f', '#e67e22', '#e74e60']
angular.module('pressIO', [])
	.controller('RSSTagsController', ['$scope', '$http', function ($scope, $http) {
	$scope.rssFeeds = [
      	"David Bowie",
      	"Turkey Bombing",
      	"Middle East Crisis",
      	"Oscar Nominations",
      	"World Poverty Report"
    	];

	$scope.setColor = function(index) {
		var i = (index>=colors.length) ? index % colors.length : index;
		return colors[i]; 
	};
	
	$scope.saveAudio = function() {
		console.log("in save audio");
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


