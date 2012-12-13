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

app.start(8080);
io = require('socket.io').listen(app.server);

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
					joinRoom(nickname, data.split(" ", 2), socket);
				}
				else if(data.startsWith("/quit"))
				{
					quitRoom(nickname, data.split(" ", 2), socket);			
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
		socket.get('room', function(err, room){
			if(!err){
				socket.get('nickname', function(err, nickname){
					if(!err){
						if(users[room][nickname])
						{
							delete users[room][nickname]; // Refaire en supprimant le mec de toutes les rooms
						}
						socket.broadcast.emit('update_console', 'SERVER', nickname + ' s\'est déconnecté');
					}
					else{
						console.log(err);
					}
				});
			}
			else{
				console.log(err);
			}
		});
	});
});

 //closeTalk(room); // Voir Timer pas de message genre un timer avec callback par room