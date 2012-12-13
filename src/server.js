var flatiron = require('flatiron'),
	app = flatiron.app,
	fs = require('fs'),
    mongo = require('mongodb'),
    Server = mongo.Server,
    Db = mongo.Db;

var server = new Server('localhost', 27017, {auto_reconnect: true});
var db = new Db('nodechat', server);
var users = new Array();
var liveTalks = new Array();
var savedTalks = new Array();

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
						var htmlMessages;
						for(var i in document.messages){
							htmlMessages += "<b>" + document.messages[i].nickname + ":</b>" + document.messages[i].msg + "<br>";
						}
						self.res.writeHead(200);
						self.res.end("<html><head></head><body>"+ htmlMessages +"</body></html>");
					}
				});
			});
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
					joinRoom(nickname, data.split(" ", 2)[1], socket, liveTalks[data.split(" ", 2)[1]].messages);
				}
				else if(data.startsWith("/quit"))
				{
					quitRoom(nickname, data.split(" ", 2)[1], socket);			
				}
				else
				{
					saveMsg(nickname, data, room, socket);
				}
            }
			else{
                console.log(err);
            }
        });
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