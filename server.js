var express = require('express');
var bodyParser = require('body-parser')
var fs = require('fs');
var path = require('path');

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
	var audioTmpDir = __dirname + "audioTmp";
 	
	if (!fs.existsSync(audioTmpDir)){
		fs.mkdirSync(audioTmpDir);
	}

	var fileName = 'article_' + new Date().getTime() + '.mp3';
	var mp3Path = path.join(audioTmpDir, fileName);
	var mp3_file = fs.createWriteStream(mp3Path); 	

});
