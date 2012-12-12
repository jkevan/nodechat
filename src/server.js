var flatiron = require('flatiron'),
	app = flatiron.app,
	fs = require('fs'),
    mongo = require('mongodb'),
    Server = mongo.Server,
    Db = mongo.Db;

var server = new Server('localhost', 27017, {auto_reconnect: true});
var db = new Db('nodechat', server);
var users = new Array();

eval(fs.readFileSync('function.js', encoding="ascii"));

app.use(flatiron.plugins.http, {
	// HTTP options
});

app.router.get('/', function () {
	var self = this;
	fs.readFile('html/home.html',
		function (err, data) {
			if (err) {
				self.res.writeHead(500, { 'Content-Type': 'text/plain' });
				return self.res.end('Error loading home.html');
			}

			self.res.writeHead(200);
			self.res.end(data);
		});
});

function closeTalk(channel){
    db.collection('talk', function (err, collection) {
        collection.findOne({room: channel}, function(err, document){
            if(document != null){
				var uri_ = findTextUri(document.messages);
				if(uri_)
				{
					collection.update({room: channel}, {closed: true, uri:uri_}, {safe: true},  function(err, doc){
						console.log('Fermeture de la room '+ channel);
						console.log('l uri de ' + channel + ' est ' + uri_);
					});
					io.sockets.in(channel).emit("update_console", "SERVER", "La room " + channel + " est close. Retrouvez l'historique de la discussion à l'adresse suivante : <a href=\"/room/" + uri_ + "\">/room/" + uri_+ "</a>");
				}
				else
					console.log('Impossible de générer l uri, aucunes phrases suppérieur à 5 mots.');
            }
        });
    });
}

app.start(8080);
io = require('socket.io').listen(app.server);

io.sockets.on('connection', function (socket) {

    socket.on('add_user', function(nickname, channel){
        socket.set("nickname", nickname);
		joinRoom(nickname, channel, socket);
        db.collection('talk', function (err, collection) {
            collection.findOne({room:channel}, function(err, document){ // Voir pour changer ID
                if(document != null){
                    var oldMessages = document.messages;
                    for(var i in oldMessages){
                        socket.emit("update_console", oldMessages[i].nickname, oldMessages[i].msg);
                    }
					console.log('add_user ' + channel);
					//sockets.emit("update_console", "SERVER", "vous êtes connecté");
					io.sockets.in(channel).emit("update_console", "SERVER", nickname + " est connecté");
                    //io.sockets.emit('update_users', io.sockets.clients(channel));
                }
            });
        });
    });

    socket.on('send_msg', function(data, room){
        socket.get('nickname', function(err, nickname){
            if(!err){
				if(data.startsWith("/join"))
				{
					joinRoom(nickname, data.split(" ", 2), socket);
				}
				else if(data.startsWith("/quit"))
				{
					socket.get('room', function(err, room){
						console.log('P'+room+"P");
					});
					var ch = data.split(" ", 2);
					if(ch[1])
					{
						
						console.log(nickname + ' a quitter la room ' + ch[1]);
						var rooms = io.sockets.manager.roomClients[socket.id];
						console.log('before');
						for(var i in rooms){
							console.log(''+i);
						}
						socket.leave(ch[1]);
						console.log('after');
						for(var i in rooms){
							console.log(''+i);
						}
					}
					else
					{
						console.log(nickname + ' a quitter la room ' + room);
						var rooms = io.sockets.manager.roomClients[socket.id];
						console.log('before :' + rooms +':');
						for(var i in rooms){
							console.log(':'+i+':');
						}
						socket.leave(room);
						console.log('after :' + rooms +':');
						for(var i in rooms){
							console.log(':'+i+':');
						}
						//socket.leave(room);
						//console.log(nickname + ' a quitter la room ' + room);
					}
				}
				else
				{
					saveMsg(nickname, data, room);
					io.sockets.in(room).emit('update_console', nickname, data);
					console.log('send msg' + room);
				}
					//closeTalk(room);
            }else{
                console.log(err);
				console.log('fail');
            }
        });
    });

   app.router.get('/room/:uri_', function (uri_) {
	var self = this;
	fs.readFile('html/talk.html',
		function (err, data) {
			if (err) {
				self.res.writeHead(500, { 'Content-Type': 'text/plain' });
				return self.res.end('Error loading talk.html');
			}

			self.res.writeHead(200);
			self.res.end(data);
		});
});

 socket.on('disconnect', function(){
        socket.get('nickname', function(err, nickname){
            if(!err){
               // delete users[nickname];
                io.sockets.emit('update_users', users);
                socket.broadcast.emit('update_console', 'SERVER', nickname
                    + ' s\'est déconnecté');
            }else {
                console.log(err);
            }
        });
    });

});