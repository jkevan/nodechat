var flatiron = require('flatiron'),
	app = flatiron.app;

app.use(flatiron.plugins.http, {
	// HTTP options
});

app.router.get('/', function () {
	this.res.writeHead(200, { 'Content-Type': 'text/plain' })
	this.res.end('flatiron ' + flatiron.version);
});

app.router.get('/talk/:id', function (id) {
	this.res.writeHead(200, { 'Content-Type': 'text/plain' })
	this.res.end('talk: ' + id);
});

app.start(8080);