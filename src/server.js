var flatiron = require('flatiron'),
	app = flatiron.app,
	fs = require('fs');

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
	console.log("test");
});

