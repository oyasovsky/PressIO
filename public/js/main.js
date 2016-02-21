var colors = ['#1abc9c',  '#57d68d', '#5cace2', '#9b59b6', '#f1c40f', '#e67e22', '#e74e60'];

window.AudioContext = window.AudioContext||window.webkitAudioContext;
  context = new AudioContext();

(function(){
	
app = angular.module('pressIO', [] );
	
app.controller('RSSTagsController', ['$scope', '$http', '$window', function ($scope, $http, $window) {
	$scope.rssFeeds = [];

	$scope.hiddenTopics = $scope.rssFeeds.length > 6;
	$scope.moreTagText = "Show More...";
	$scope.audioSrc = "";
	$scope.videoSrc = "";

	$scope.showAudioModal = false;
	$scope.toggleAudioModal = function(){
        	$scope.showAudioModal = !$scope.showAudioModal;
    	};

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

	$scope.updateRssTags = function updateRssTags() {
		$http({
                    url: "/api/getRssTags",
                    method: "GET"
                }).success(function(response, status, headers, config){
			var rssArray = response;

			rssArray.sort(function(a,b){
				for (var i = 0; i < a.length; i++) {
					if (a[i].numberOfSimilarities) {
						break;
					}
				}
				for (var k = 0; k < b.length; k++) {
					if (b[k].numberOfSimilarities) {
						break;
					}
				}

				if (a[i].numberOfSimilarities === undefined) return -1;
				if (b[k].numberOfSimilarities === undefined) return 1;
				return  (b[k].numberOfSimilarities) - (a[i].numberOfSimilarities);
			});

			for (var i=0 ; i<rssArray.length; i++){
				$scope.rssFeeds[i] = { "text":getShortestRssTitle(rssArray[i]), "sources" :rssArray[i][rssArray[i].length-1].numberOfSimilarities };
			}

			$scope.hiddenTopics = $scope.rssFeeds.length > 6;
	
		}).error(function(error) {
			console.log("An error occured: ", error);
			$scope.error=error;
		});
	};


	$scope.loadRSSContent = function loadRSSContent(rss) {
		$("#metaSelectedRss").text(rss.text);
		$scope.hiddenTopics = true;
		$scope.moreTagText = "Show More...";
		tinymce.get("article").setContent("");
		$http({
			url: "/api/loadRssContent?rss=" + encodeURI(rss.text),
			method: "GET"
		}).success(function(response, status, headers, config){	
			console.log("response: ", response);

			tinymce.get('article').setContent(response.html);
		});	
	};

	$scope.saveAudio = function(tinymce) {
		$("#modalAudio .loader").show();
		$("#modalAudio .errors").text("");
		$("#modalAudio .errors").hide();
		$("#modalAudio .main").hide();

		$scope.toggleAudioModal();
		var content = tinymce.get('article').getContent();
		var element = $("<div>"+content+"</div>");
	
		var text = element.text();
		var data = $.param({
			text: text
		});

	
		$http({
		    url: "/api/generateAudio",
		    method: "POST",
		    headers: { 'Content-Type': 'application/x-www-form-urlencoded'},
		    data: data
		}).success(function(response, status, headers, config){	
			var fileName = response;
			$scope.audioSrc = "http://" + window.location.host + "/audio/"+ fileName;
			$("#modalAudio .loader").hide();
			$("#modalAudio .main").show();
		}).error(function(error) {
			console.log("An error occured: ", error);
			$scope.error=error;
			$("#modalAudio .loader").hide();
		    	$("#modalAudio .errors").text("Sorry, something went wrong! Please try again in another time.")
			$("#modalAudio .errors").show();
		});

	};

	$scope.saveVideo = function() {
		$("#modalVideo .loader, #modalVideo .loader-text").show();
		$("#modalVideo .errors").text("")
		$("#modalVideo .errors").hide();
		$("#modalVideo .main").hide();

		$scope.toggleVideoModal();
		var content = tinymce.get('article').getContent();
		var element = $("<div>" + content + "</div>");
		var title = $(element.find("h1")[0]).text();

		var text = element.text();	
		var data = $.param({
			rss: encodeURI($("#metaSelectedRss"),text()),
			title: title,
			text: text
		});

		$http({
		    url: "/api/generateVideo",
		    method: "POST",
		    headers: { 'Content-Type': 'application/x-www-form-urlencoded'},
		    data: data
		}).success(function(response, status, headers, config){
		
			var filename=response;
			$scope.videoSrc = filename;
			$("#modalVideo .loader, #modalVideo .loader-text").hide();
			$("#modalVideo .main").show();
		

		}).error(function(error) {
			console.log("An error occured: ", error);
			$scope.error=error;

			$("#modalVideo .loader, #modalVideo .loader-text").hide();
		    	$("#modalVideo .errors").text("Sorry, something went wrong! Please try again in another time.")
			$("#modalVideo .errors").show();
		});

	};

  }]);

app.config(['$compileProvider', function ($compileProvider) {
	$compileProvider.urlSanitizationWhitelist(/^\s*(https?|ftp|mailto|file|blob):/);
}]);


app.directive('modal', function () {
    return {
      template: '<div class="modal fade">' + 
          '<div class="modal-dialog">' + 
            '<div class="modal-content">' + 
              '<div class="modal-header">' + 
                '<button type="button" class="close" data-dismiss="modal" aria-hidden="true">&times;</button>' + 
                '<h4 class="modal-title">{{ title }}</h4>' + 
              '</div>' + 
              '<div class="modal-body" ng-transclude></div>' + 
            '</div>' + 
          '</div>' + 
        '</div>',
      restrict: 'E',
      transclude: true,
      replace:true,
      scope:true,
      link: function postLink(scope, element, attrs) {
        scope.title = attrs.title;

        scope.$watch(attrs.visible, function(value){
          if(value === true)
            $(element).modal('show');
          else
            $(element).modal('hide');
        });

        $(element).on('shown.bs.modal', function(){
          scope.$apply(function(){
            scope.$parent[attrs.visible] = true;
          });
        });

        $(element).on('hidden.bs.modal', function(){
          scope.$apply(function(){
            scope.$parent[attrs.visible] = false;
          });
        });
      }
    };
  });

})();

function ajaxExportAudio(tinymce) {
	var scope = angular.element(
	document.getElementById("main")).scope();
	scope.$apply(function () {
		scope.saveAudio(tinymce);
	});
}

function ajaxExportVideo(tinymce) {
	var scope = angular.element(                                                                                                                                                         
        document.getElementById("main")).scope();
        scope.$apply(function () {
                scope.saveVideo(tinymce);
        });
}

function getShortestRssTitle(rssTopicArray) {
	var index=0;
	var titleLength=30000;
	for (var i = 0; i < rssTopicArray.length; i++) {
		if (rssTopicArray[i].numberOfSimilarities !== undefined) continue;
		if (rssTopicArray[i].articleData.title.length < titleLength) {
			titleLength = rssTopicArray[i].articleData.title.length;
			index=i;
		}
	}
	return (rssTopicArray[index].articleData.title);
}
