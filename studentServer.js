// express is the server that forms part of the nodejs program
var express = require('express');
var path = require("path");
var app = express();

// body-parser to process the uploaded data
var bodyParser = require('body-parser');
app.use(bodyParser.urlencoded({
extended: true
}));
app.use(bodyParser.json());

app.use(function(req, res, next) {
res.header("Access-Control-Allow-Origin", "*");
res.header("Access-Control-Allow-Headers", "X-Requested-With");
next();
});

// Import the required database connectivity code and set up a database connection
var fs = require('fs');
var pg = require('pg');
var configtext =
""+fs.readFileSync("/home/studentuser/certs/postGISConnection.js");
// now convert the configruation file into the correct format -i.e. a name/value pair array
var configarray = configtext.split(",");
var config = {};
for (var i = 0; i < configarray.length; i++) {
	var split = configarray[i].split(':');
	config[split[0].trim()] = split[1].trim();
}
var pool = new pg.Pool(config);

// simple app.get to test out the connection
app.get('/postgistest', function (req,res) {
	pool.connect(function(err,client,done) {
		if(err){
			console.log("not able to get connection "+ err);
			res.status(400).send(err);
		}
		client.query('SELECT name FROM london_poi' ,function(err,result) {
			done();
			if(err){
				console.log(err);
				res.status(400).send(err);
			}
			res.status(200).send(result.rows);
		});
	});
});

// code to actually do the POST request to studentServer.js
app.post('/uploadData',function(req,res){
// note that we are using POST here as we are uploading data
// so the parameters form part of the BODY of the request rather than the RESTful API
console.dir(req.body);
pool.connect(function(err,client,done) {
if(err){
console.log("not able to get connection "+ err);
res.status(400).send(err);
}
var name = req.body.name;
var surname = req.body.surname;
var module = req.body.module;
var portnum = req.body.port_id;
var language = req.body.language;
var modulelist = req.body.modulelist;
var lecturetime = req.body.lecturetime;
var geometrystring = "st_geomfromtext('POINT("+req.body.longitude + " "+
req.body.latitude + ")')";
var querystring = "INSERT into formdata (name,surname,module, port_id,language, modulelist, lecturetime, geom) values ($1,$2,$3,$4,$5,$6,$7,";
var querystring = querystring + geometrystring + ")";
console.log(querystring);
client.query( querystring,[name,surname,module, portnum, language, modulelist, lecturetime],function(err,result) {
done();
if(err){
console.log(err);
res.status(400).send(err);
}
res.status(200).send("row inserted");
});
});
});

// add an http server to serve files to the Edge browser
// due to certificate issues it rejects the https files if they are not
// directly called in a typed URL
var http = require('http');
var httpServer = http.createServer(app);
httpServer.listen(4480);
app.get('/',function (req,res) {
res.send("hello world from the HTTP server");
});

// adding functionality to log the requests
app.use(function (req, res, next) {
var filename = path.basename(req.url);
var extension = path.extname(filename);
console.log("The file " + filename + " was requested.");
next();
});

// serve static files - e.g. html, css
// this should always be the last line in the server file
app.use(express.static(__dirname));