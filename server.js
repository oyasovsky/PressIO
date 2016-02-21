var express = require('express');
var bodyParser = require('body-parser')
var fs = require('fs');
var path = require('path');
var unirest = require('unirest');
var deasync = require('deasync');
var summary = require('node-summary');
var swig = require('swig');
var request = require('request');

var WATSON_API_KEY='42d81bfd30f79b25cd1b3a6b60653e0cbb16b091';
var STUPEFLIX_SECRET=['KZWWM2E37VEEJDEMPWNKVIYTGA','JA4XTDCPHZCF5L5CQLXYGNPCNI'];
var stupeflixIndex=1;

var bucketsHash = {};
var buckets = null;

var doneWikiGet = false;
var waitForFunctionCallWiki = function() { return !doneWikiGet; };

var doneWikiLoop = false;                                                                                                                                      var waitForFunctionCallLoop = function() { return !doneWikiLoop; };


var app = express();

app.use(express.static(__dirname + '/public'));
app.use("/audio", express.static("audioTmp"));

app.use(bodyParser.json());       // to support JSON-encoded bodies
app.use(bodyParser.urlencoded({     // to support URL-encoded bodies
  extended: true
}));

app.get('/', function (req, res) {
  res.redirect("/index.html");
});

buckets=loadBuckets();

app.listen(3003, function () {
  console.log('Example app listening on port 3003!');
});


app.get('/api/loadRSSContent', function(req, res) {
	var key = req.query.rss;
	console.log("key: ", key);

	var bucket = bucketsHash[key];
	var unused = [];

	var title = generateTitle(bucket);
	var ent = generateEntity(bucket, title);
	var summary = generateSummary(bucket, unused);
	var images = getImages(bucket);
	var mainParagraphs = generateMain(bucket, unused);
	var sources = generateLinks(bucket);

	var html = swig.renderFile('templates/articleTemplate.html', {
		articleTitle: title,
		articleSummary: summary,
		articleEntity: ent["text"],
		articleMap: [ent["map"]],
		images: images,
		articleMain: mainParagraphs,
		sources: sources
	});
	
	res.json({html: html, unused: unused});
	res.end();
});

app.post('/api/generateAudio', function(req, res) {

	var text = req.body.text;

	var idx = text.indexOf(("Generated From"));
        text = text.substring(0, idx);
	
	var audioTmpDir = __dirname + "/audioTmp";
 	
	if (!fs.existsSync(audioTmpDir)){
		fs.mkdirSync(audioTmpDir);
	}

	var fileName = 'article_' + new Date().getTime() + '.mp3';
	var mp3Path = path.join(audioTmpDir, fileName);
	var mp3_file = fs.createWriteStream(mp3Path); 	

	unirest.post("https://voicerss-text-to-speech.p.mashape.com/?key=9741a4decd9b45f2a57e5de2f988acac")
			.header("X-Mashape-Key", "6Pl6rUnCq9mshVk6T4oBryUhXjwqp1cJrY2jsnHPsQrtwWSfsn")
			.header("Content-Type", "application/x-www-form-urlencoded")
			.encoding(null)
			.send("c=mp3")
			.send("f=8khz_8bit_mono")
			.send("hl=en-us")
			.send("r=0")
			.send("src="+text)
			.end(function (result) {
		    		mp3_file.write(result.body);
		    		mp3_file.end();
		    		res.write(fileName);
		    		res.end();
			});
});


app.post('/api/generateVideo', function(req, res) {
	var key = decodeURI(req.body.rss);
	var bucket = bucketsHash[key];
	var text = req.body.text;


	var idx = text.indexOf(("Generated From"));
	text = text.substring(0, idx);

	var title = req.body.title;
	var images = getImages(bucket);
  	var entity = generateEntity(bucket, title);

	var map = entity["map"];
	if (map && map.length > 0) images.push(map);
	
	var definition = swig.renderFile('templates/movieTemplate.xml', {
		articleTitle: title,
		images: images,
		generatedText: text
	});

	stupeflixIndex=(stupeflixIndex + 1) %2;
	var secret=STUPEFLIX_SECRET[stupeflixIndex];
	console.log(secret);
	var headers = {"Authorization": secret};

	var task = {
		"tasks": {
		"task_name": "video.create",
		"definition": definition
		}
	};


	request.post({
		url: "https://dragon.stupeflix.com/v2/create",
		body: task,
		headers: headers,
		json: true
	}, function (error, httpObj, taskCreation) {
		if (!error && httpObj.statusCode == 200) {
		
			var done = false;
			(function loop() {
				request.get({
					url: "https://dragon.stupeflix.com/v2/status",
					qs: { tasks: taskCreation[0]["key"] },
					headers: headers,
					json: true
				}, function(error, httpObj, taskStatusAndResult) {

					if (!error && httpObj.statusCode == 200) {
						console.log("status: " + taskStatusAndResult[0]["status"]);

						if (taskStatusAndResult[0]["status"] == "success" || taskStatusAndResult[0]["status"] == "error" ) {
							done=true;
							if (taskStatusAndResult[0]["status"] == "success") {
									var link = taskStatusAndResult[0]["result"]["export"];
									res.write(link);
									res.end();
							} else {
									// error
									res.status(500).send('Oh no! Something went wrong....');
							}
						} else {
							loop();
						}
					} else {
						console.log("An error occured: ", error);
						res.status(500).send('Something broke!');
					}

				});
			}());
		} else {
                      console.log("An error occured: ", error);
                      res.status(500).send('Something broke!');                                                                      
                }

	});
});



app.get('/api/getRssTags', function(req, res) {
	res.write(buckets);
	res.end();
});

function loadBuckets() {
	var contents = fs.readFileSync("buckets.txt").toString();
	var buckets = JSON.parse(contents);

	for (var i=0; i<buckets.length; i++) {
		var obj = buckets[i];
		bucketsHash[getShortestRssTitle(obj)] = obj;
	}

	console.log("Loaded Buckets!");
	return contents;
}


function getShortestRssTitle(rssTopicArray) {
	var index=0;
	var titleLength=30000;
	for (var i=0; i<rssTopicArray.length; i++) {
		if (rssTopicArray[i].numberOfSimilarities !== undefined) continue;
		if (rssTopicArray[i].articleData.title.length < titleLength) {
			titleLength = rssTopicArray[i].articleData.title.length;
			index = i;
		}	
	}
	return (rssTopicArray[index].articleData.title);
}


function generateTitle(bucket){
	var title="";
	
	bucket.forEach(function(obj) {
		try{
			var t = obj["articleData"]["title"].replace("Watch:","");
			if (t.length > title.length) title = t;	
		} catch(e){
		}
	});
	return title;
}

function generateEntity(bucket, inputTitle) {
	doneWikiGet = false;
	var title="";
	var text="";
	var entity = {};
	
	var objsCount=0;


	bucket.forEach(function(obj) {
		objsCount++;
		if (obj["articleData"] && !doneWikiGet) {
			var t = obj["articleData"]["title"].replace("Watch:",''); 
			

			if (inputTitle===t) {
				var src=obj["entities"];

				var entityCount = 0;
				for (var s in src) {
					doneWikiLoop=false;
					if (!doneWikiGet) {
						if (src[s]["disambiguated"] && src[s]["disambiguated"]["name"]) {
							title = src[s]["disambiguated"]["name"];
						} else {
							title = src[s]["text"];
						}
				
						if (src[s].map) {
							entity["map"]=src[s].map;
						}
						
						if (!entity["text"] || entity["text"].trim===""){
							unirest.get("https://en.wikipedia.org/w/api.php")
								.query("format=json")
								.query("action=query")
								.query("prop=extracts")
								.query("exintro=")
								.query("explaintext=")
								.query("titles="+encodeURI(title))
								.end(function (result) {
									var json = result.body;

									if (json["query"] && json["query"]["pages"]) {
										var pages = json["query"]["pages"];
										for (var p in pages) {
											text = pages[p]["extract"];
										}

										if (text && text.trim()!="" && text.indexOf("This is a redirect") == -1) {
											var indx = text.indexOf("^");
											if (indx >=0) text = text.substring(0, indx);

										}
										
										try {
											summary.getSortedSentences(text, 4, function(err, sorted_sentences) {
												if (err) {
													console.log("There was an error.", err);
													entity["text"] = text;
												} else {
													var obj = JSON.parse(JSON.stringify(sorted_sentences));
													var tmp = "";
													obj.forEach(function(t) {
														t = t.replace(/^"+/, '').replace('""','');
														tmp+=t;
													});
													entity["text"]=tmp;
												}
	
											});
										} catch(e) {
											entity["text"] = text;
										}


										if (entityCount>4 || entity["map"]) doneWikiGet = true;
										doneWikiLoop = true;
										return true;
									}
									doneWikiLoop = true;
								});
						} else {
							doneWikiLoop = true;
							if (entityCount>4 || entity["map"]) doneWikiGet = true;
						}
					
						deasync.loopWhile(waitForFunctionCallLoop);
					}
					entityCount+=1;
				}
			}
		} else {
			doneWikiLoop=true;
		}	
	});
	
	if (objsCount == Object.keys(bucket).length) doneWikiGet=true;
	deasync.loopWhile(waitForFunctionCallWiki);
	return entity;

}

function generateSummary(bucket, unused) {
	var title = [];
	var append = true;
	bucket.forEach(function(obj) {
	
	try {

		var c = obj["articleData"]["content"];
	
		if (c.indexOf("<") >= 0) {
			c = c.substring(0 , c.indexOf("<")); 	
		}


		if (append) {
			title.push(c);
		} else {
		
			unused.push(c);	
		}
		append = (Math.random() < 0.5 ? true : false) || title.length < 5;

	} catch(e){}
	});

	return title;
}

function getImages(bucket) {
	console.log(bucket);
	var images = [];
	bucket.forEach(function(obj) {
		var src = obj["imageLink"];
		var result = containsAny(src, ["png", "gif", "jpg", "jpeg"]);
	
		if (src && src.trim() != ""
			&& src.indexOf("/ads/")<0 && src.indexOf("viewad")<0
			&& result!=null) {
		
			images.push(src);
		}
		
	});

	return images;
}

function generateMain(bucket, unused) {
	var text = [];

	var theChosenOne = Math.floor(Math.random()*(bucket.length-1));
	for (var idx=0; idx<bucket.length-1; idx++){
		var obj = bucket[idx];
		
		var p = obj["paragraphs"]["main"];
		if ( typeof p === "string") {
			p = p.replace(/'/g, '"');
			p = JSON.parse(p);
		}

		if (idx === theChosenOne) {
			text.push(p);
		} else {
			unused.push(p);
		}
	}


	var i=0;
	var found=false;

	while (!found && i<10) {
		theChosenOne = Math.floor(Math.random()*(bucket.length-1));
		var obj = bucket[theChosenOne];
		var med = obj["paragraphs"]["med"];
		if (med.length > 0) {
			found=true;
			for (var idx=0; idx<bucket.length-1; idx++) {
				var obj = bucket[idx];
				var p = obj["paragraphs"]["med"];
				if (typeof p == "string"){
                        		p = p.replace(/'/g, '"');
                        		p = JSON.parse(p);  
                		}	
				if (idx === theChosenOne) {
                        		text.push(p);                                                                                                                          
                		} else {
                        		unused.push(p);                                                                                                                        
                		}
			}
		} else {
			i++;
		}
	}

	var obj = bucket[Math.floor(Math.random()*(bucket.length-1))];
	var fullTextArr = obj["paragraphs"]["secondary"];
	if (typeof fullTextArr == "string") {
		fullTextArr = fullTextArr.replace(/'/g, '"');
	}

	var fulltext = "";
	fullTextArr.forEach(function(t) { 
		fulltext += JSON.stringify(t);
	});

	var sentences;
	var tries=0;
	while (sentences == null && tries < 10) {
		var sentenceNum = Math.floor(Math.random() * (11)) + 5;
		summary.getSortedSentences(fulltext, sentenceNum, function(err, sorted_sentences) {

			if (err) {
				console.log("There was an error.", err);
			}

			if (sorted_sentences) {
				sentences = sorted_sentences;
			} else {
				return true;
			}

			var obj = JSON.parse(JSON.stringify(sentences));
		    	obj.forEach(function(t) {
				t = t.replace(/^"+/, '').replace('""','');
				var ignore = t.indexOf("Join us on Facebook");
				if (ignore > 0) {
					t = t.substring(0,ignore);
				}
			
				text.push(t);
			});

		});

		tries++;

	}

	if (sentences == null) {
		// return original text
		text = obj["paragraphs"]["secondary"];
	}

	return text;

}


function generateLinks(bucket) {
	var links = [];

	bucket.forEach(function(obj) { 
		var data = obj["articleData"];
		if (!data) return true;

		links.push(obj["articleData"]["link"])
	});

	return links;
}
//-- Helper funcitons

function containsAny(str, substrings) {
	if (!str) return null;
    for (var i = 0; i != substrings.length; i++) {
       var substring = substrings[i];
       if (str.indexOf(substring) != - 1) {
         return substring;
       }
    }
    return null; 
}
