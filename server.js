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
