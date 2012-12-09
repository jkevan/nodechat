var flatiron = require('flatiron'),
	app = flatiron.app,
	fs = require('fs'),
    mongo = require('mongodb'),
    Server = mongo.Server,
    Db = mongo.Db;

var server = new Server('localhost', 27017, {auto_reconnect: true});
var db = new Db('nodechat', server);
var users = {};

function saveMsg(nickname, msg){
    db.collection('talk', function (err, collection) {
        collection.findOne({closed: false}, function(err, document){
            if(document == null){
                collection.insert({messages: [{nickname: nickname, msg: msg}],
                    closed: false});
            }else {
                collection.update({closed: false}, {$push: {messages:
                {nickname:nickname, msg:msg}}}, {safe: true},  function(err, doc){
                    //debug
                    /*collection.findOne({closed: false}, function(err, document){
                        console.log(document);
                    });*/
                });
            }
        });
    });
}

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

app.router.get('/talk/:id', function (id) {
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

app.start(8080);
io = require('socket.io').listen(app.server);

io.sockets.on('connection', function (socket) {

    socket.on('add_user', function(nickname){
        socket.set("nickname", nickname);
        users[nickname] = nickname;
        db.collection('talk', function (err, collection) {
            collection.findOne({closed: false}, function(err, document){
                if(document != null){
                    var oldMessages = document.messages;
                    for(var i in oldMessages){
                        socket.emit("update_console", oldMessages[i].nickname, oldMessages[i].msg);
                    }
                    socket.emit("update_console", "SERVER", "vous êtes connecté");
                    socket.broadcast.emit("update_console", "SERVER", nickname + " est connecté");
                    io.sockets.emit('update_users', users);
                }
            });
        });
    });

    socket.on('send_msg', function(data){
        socket.get('nickname', function(err, nickname){
            if(!err){
                saveMsg(nickname, data);
                io.sockets.emit('update_console', nickname, data);
            }else{
                console.log(err);
            }
        });
    });

    socket.on('disconnect', function(){
        socket.get('nickname', function(err, nickname){
            if(!err){
                delete users[nickname];
                io.sockets.emit('update_users', users);
                socket.broadcast.emit('update_console', 'SERVER', nickname
                    + ' s\'est déconnecté');
            }else {
                console.log(err);
            }
        });
    });
});

