var express = require('express');
var fs = require('fs');

var app = express();

app.use(express.static(__dirname + '/public'));
app.use("/audio", express.static("audioTmp"));


app.get('/', function (req, res) {
  res.redirect("/index.html");
});

app.listen(3003, function () {
  console.log('Example app listening on port 3003!');
});


app.post("/api/generateAudio", function(req, res) {

	var text = req.body.text;
	var audioTmpDir = __dirname + "audioTmp";
 	
	if (!fs.existsSync(audioTmpDir)){
		fs.mkdirSync(audioTmpDir);
	}

	

});
