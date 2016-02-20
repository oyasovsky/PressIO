var express = require('express');
var bodyParser = require('body-parser')
var fs = require('fs');
var path = require('path');
var unirest = require('unirest');

var WATSON_API_KEY='42d81bfd30f79b25cd1b3a6b60653e0cbb16b091';

var bucketsHash = {};
var buckets = null;

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


app.post('/api/generateAudio', function(req, res) {

	var text = req.body.text;	
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
