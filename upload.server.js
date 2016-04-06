var express = require("express");
var formidable = require('formidable');
var fs = require('fs');
var qs = require('querystring');
var util = require('util');
var wget = require('./lib/getfile');
var serveIndex = require('serve-index');

var config = JSON.parse(fs.readFileSync('config.json', 'utf8'));

var uploads = {};

function decodeBase64Chunk(dataString) {
	var matches = dataString.match(/^data:([A-Za-z-+\/]*);base64,(.+)$/);
	var response = {};
	if (matches === null || matches.length !== 3) {
		return new Error('Invalid input string');
	}
	response.type = matches[1];
	response.data = new Buffer(matches[2], 'base64');
	return response;
}

function deleteFile(filename) {
	fs.unlink(config.uploadDirectory + "/" + filename, function(err) {
		if (err) {
			console.log("Error deleting", filename);
		} else {
			console.log(filename, "has been deleted.");
		}
	});
}

var app = express();
var server = require("http").createServer(app);

app.use("/", express.static(__dirname + '/public'));

app.get("/", function(req, res) {
	res.sendFile(__dirname + "/public/index.html");
});

app.use('/uploads', express.static(__dirname + '/' + config.uploadDirectory));
app.use('/uploads', serveIndex(__dirname + '/' + config.uploadDirectory));

app.post("/upload", function(req, res) {
	var form = new formidable.IncomingForm();
	form.parse(req, function(err, fields, files){
		if (err) {
			console.error(err.message);
			return;
		}
		res.writeHead(200, {'content-type': 'text/plain'});
		if(fields.name) {

			var uploadComplete = false;
			var onFileUploadedCallback = function(filename) {
				//delete uploads[filename];
			}

			if(!uploads[fields.name]) { // new upload
				console.log('New upload: ', fields.name);

				uploads[fields.name] = {
					chunk: 0,
					size: fields.size,
					content: '',
					chunks: [],
					writtenChunks: [],
					total: fields.size / 272144,
					completed: false
				};

				fs.unlink(config.uploadDirectory + "/" + fields.name, function(err){
				});

				res.end('chunk' + uploads[fields.name].chunk);

			} else {
				console.log(fields.name, 'got chunk', fields.chunk);
				if (uploads[fields.name].completed) {
					console.log('File already uploaded:', fields.name);
					res.end('already uploaded');
				} else if (fields.data !== undefined || fields.chunk === (uploads[fields.name].chunk+1)) {
					// Decode base64
					var binaryChunk = decodeBase64Chunk(fields.data);
					// Pushing buffer
					//uploads[fields.name].chunks.push(binaryChunk.data);
					// Writing to file
					fs.writeFile(config.uploadDirectory + "/" + fields.name, binaryChunk.data, {flag: "a"}, function() {
						// Mark chunk as downloaded
						uploads[fields.name].chunk++;

						if(uploads[fields.name].chunk < uploads[fields.name].total) {
							//console.log('requesting ', uploads[fields.name].chunk, ' out of ', ~~uploads[fields.name].total);
							res.end('chunk' + uploads[fields.name].chunk);
						}
						else {
							console.log('Upload complete:', fields.name);
							uploadComplete = true;
							uploads[fields.name].completed = true;
							if (config.fileTTL !== undefined && config.fileTTL !== 0) {
								// Delete uploaded file after specified time
								uploads[fields.name].timeout = setTimeout(function () {
									deleteFile(fields.name);
									uploads[fields.name] = undefined;
								}, config.fileTTL * 1000); // Seconds
							}
							// End transmission
							res.end('upload complete');
						}

						if (uploadComplete && onFileUploadedCallback !== undefined) {
							onFileUploadedCallback(fields.name);
							//console.log("Written chunks: " + uploads[fields.name].writtenChunks.join());
						}
						//uploads[fields.name].writtenChunks.push(fields.chunk);
					});
				} else {
					console.log("Error on chunk: " + fields.chunk);
					if (fields.data === undefined) {
						res.end('chunk' + uploads[fields.name].chunk);
					}
				}
			}
		}
	});
});

app.post("/loadfromurl", function(req, res) {
	var form = new formidable.IncomingForm();
	form.parse(req, function(err, fields, files){
		if (err) {
			console.error(err.message);
			return;
		}
		res.writeHead(200, {'content-type': 'text/plain'});
		if(fields.url) {
			var myfilename = fields.url.match(/(?:[^\/][\d\w\.-]+)$/)[0];

			console.log("Downloading file from URL: " + myfilename + " (" + fields.url + ")" );

			var username = fields.username;
			var password = fields.password;

			var options = {
				username: username,
				password: password
				/*protocol: 'https',
				host: 'raw.github.com',
				path: '/Fyrd/caniuse/master/data.json',
				method: 'GET'*/
			};
			//options.gunzip = false;
			//options.proxy = {};
			//options.proxy.protocol = 'http';
			//options.proxy.host = 'someproxy.org';
			//options.proxy.port = 1337;
			//options.proxy.proxyAuth = '{basic auth}';
			//options.proxy.headers = {'User-Agent': 'Node'};

			var download = wget.download(fields.url, config.uploadDirectory + "/" + myfilename, options);
			download.on('error', function(err) {
				console.log(err);
			});
			download.on('end', function(output) {
				//checkUploadedFile(myfilename);
				console.log(myfilename, "uploaded!");
			});
			download.on('progress', function(progress) {
				// code to show progress bar
			});

		}
		res.end();
	});
});

server.listen(config.port, "0.0.0.0", function(){
	console.log("SerbenBox running on port", config.port);
	console.log("");
});
