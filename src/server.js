﻿var flatiron = require('flatiron'),
	app = flatiron.app,
	fs = require('fs'),
    mongo = require('mongodb'),
	http = require('http'),
    Server = mongo.Server,
    plates = require('plates'),
    Db = mongo.Db,
    connect = require('connect');

var server = new Server('localhost', 27017, {auto_reconnect: true});
var db = new Db('nodechat', server);
var users = new Array();
var liveTalks = new Array();
var savedTalks = new Array();
var allURIs = new Array();

eval(fs.readFileSync('function.js', encoding="ascii"));
eval(fs.readFileSync('templates.js', encoding="ascii"));

app.use(flatiron.plugins.http, {
    before: [
        connect.static('static/')
    ]});

app.router.get('/', function () {
	var self = this;
	fs.readFile('html/home.html',
		function (err, data) {
			if (err) {
				self.res.writeHead(500, { 'Content-Type': 'text/plain' });
				return self.res.end('Error loading home.html');
			}

			var lastTalks = "";
			for(var i = allURIs.length - 1; i >= (allURIs.length - 11); i --){
				if(allURIs[i])
				{
					lastTalks += "<a href='/talk/" + allURIs[i] + "'>> " + allURIs[i] +  "</a><br>"
				}
			}

			self.res.writeHead(200);
			self.res.end(plates.bind(data.toString(), {lastTalks: lastTalks}));
		});
});

app.router.get('/talk/:uri_', function (uri) {
	var self = this;
	fs.readFile('html/talk.html',
		function (err, data) {
			if (err) {
				self.res.writeHead(500, { 'Content-Type': 'text/plain' });
				return self.res.end('Error loading talk.html');
			}

			db.collection('talk', function (err, collection) {
				collection.findOne({uri: uri}, function(err, document){
					if(err){
						console.log(err)
					}else{
                        var uri_next_index = allURIs.indexOf(uri) != -1 ? allURIs.indexOf(uri) + 1 : null;
                        var uri_prev_index = allURIs.indexOf(uri) != -1 ? allURIs.indexOf(uri) - 1 : null;
						var htmlMessages = "";
						for(var i in document.messages){
							document.messages[i].nickname = "> " + document.messages[i].nickname;
							htmlMessages += plates.bind(messageTemplate, document.messages[i]);
						}

                        var result = plates.bind(talkTemplate, {messages: htmlMessages});
                        if(allURIs[uri_next_index]){
                            var nextMap = plates.Map();
                            nextMap.where('href').is('href').insert("uri");
                            var nextLink = plates.bind(talkLinkTemplate, {link: "discussion suivante"});
                            nextLink = plates.bind(nextLink, {uri: "/talk/" + allURIs[uri_next_index]}, nextMap);
                            result = plates.bind(result, {next: nextLink});
                        }
                        if(allURIs[uri_prev_index]){
                            var prevMap = plates.Map();
                            prevMap.where('href').is('href').insert("uri");
                            var prevLink = plates.bind(talkLinkTemplate, {link: "discussion précédente"});
                            prevLink = plates.bind(prevLink, {uri: "/talk/" + allURIs[uri_prev_index]}, prevMap);
                            result = plates.bind(result, {prev: prevLink});
                        }

						self.res.writeHead(200);
						self.res.end(result);
					}
				});
			});
		});
});

app.start(8080);
io = require('socket.io').listen(app.server, {log:false});

db.collection('talk', function (err, collection) {
    collection.find().toArray(function(err, documents){
        for (var i in documents){
            allURIs.push(documents[i].uri);
        }
        //2minutes
		setInterval(importTweet, 60000* 2);
        io.sockets.on('connection', function (socket) {
            socket.on('add_user', function(nickname, channel){
				socket.set("nickname", nickname);
				joinRoom(nickname, channel, socket);
            });

			socket.on('send_msg', function(data, room){
				socket.get('nickname', function(err, nickname){
					if(!err){
						if(data.startsWith("/join"))
						{
							joinRoom(nickname, data.split(" ", 2)[1], socket);
						}
						else if(data.startsWith("/quit"))
						{
							quitRoom(nickname, data.split(" ", 2)[1], socket, room);			
						}
						else
						{
							saveMsg(nickname, data, room);
						}
					}
					else{
						console.log(err);
					}
				});
			});
			
			socket.on('switch_channel', function(channel){
				if(liveTalks[channel])
					loadMessages(channel, socket, liveTalks[channel].messages);
				io.sockets.in(channel).emit('update_users', users[channel], channel);
			});

            socket.on('disconnect', function(){
                socket.get('room', function(err, room){
                    if(!err){
                        socket.get('nickname', function(err, nickname){
                            if(!err && nickname != null){
                                if(users[room][nickname])
                                {
                                    delete users[room][nickname]; // Refaire en supprimant le mec de toutes les rooms
                                }
                                socket.broadcast.emit('update_console', 'SERVER', nickname + ' s\'est déconnecté');
                            }
                            else{
                                if(err)
                                    console.log(err);
                                if(nickname == null)
                                    console.log("tentative de connection avec un nickname null")
                            }
                        });
                    }
                    else{
                        console.log(err);
                    }
                });
            });
        });
    });
});
