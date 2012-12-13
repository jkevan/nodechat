String.prototype.replaceAll = function(stringToFind,stringToReplace)
{
	var temp = this;
	var index = temp.indexOf(stringToFind);
	while(index != -1)
	{
		temp = temp.replace(stringToFind,stringToReplace);
		index = temp.indexOf(stringToFind);
	}
	return temp;
}

findTextUri = function(messages){
	var tabMessages = messages;
	for(var i in tabMessages)
	{
		if((tabMessages[i].msg.split(" ").length - 1) >= 5)
		{
			var uri_ = tabMessages[i].msg + '_' + tabMessages[i].nickname;
			uri_ = uri_.replaceAll(" ","-")
			return	encodeURIComponent(uri_);
		}
	}
	return "";
}

function userExist(users, nickname){
	for(var room in users)
	{
		for(var user in room)
		{
			if(user == nickname)
				return true;
		}
	}
	return false;
}

String.prototype.startsWith = function(prefix) {
	return this.indexOf(prefix) === 0;
}

function joinRoom(nickname, channel, socket){
	if(channel)
	{
		console.log('--------------' + channel);
		if(!users[channel])
			users[channel] = new Array();
		users[channel][users[channel].length] = nickname;
		socket.set("room", channel);
		socket.join(channel);
		io.sockets.in(channel).emit('update_console', 'SERVER', nickname + ' est maintenant connecté');
		socket.emit('update_console', 'SERVER', 'vous êtes connecté sur ' + channel);
		io.sockets.in(channel).emit('update_users', users[channel]);
		console.log(nickname + ' a rejoint la room ' + channel);
		
		db.collection('talk', function (err, collection) {
            collection.findOne({room:channel}, function(err, document){ // Voir pour changer ID
                if(document != null){
                    var oldMessages = document.messages;
                    for(var i in oldMessages){
                        socket.emit("update_console", oldMessages[i].nickname, oldMessages[i].msg);
                    }
                }
            });
        });
		console.log(users[channel]);
		// Rediriger vers la conversation de la room
	}
	else
	{
		socket.emit("update_console", 'SERVER', 'le nom de room n\'est pas valide');
		console.log('le nom de room n\'est pas valide');
	}
}

function quitRoom(nickname, channel, socket){
	if(channel)
	{
		if(users[channel][nickname])
		{
			socket.leave(channel);
			delete users[room][nickname];
			io.sockets.in(channel).emit('update_console', 'SERVER', nickname + ' a quitté la room');
			io.sockets.in(channel).emit('update_users', users[channel]);
			socket.emit('update_console', 'SERVER', 'vous êtes déconnecté de ' + channel);
			console.log(nickname + ' a quitté la room ' + channel);
			// Redirection vers une autre room (/quit) ou reste sur le même si /quit anotherroom
			// var rooms = io.sockets.manager.roomClients[socket.id]; // Permet d'avoir la liste des rooms du mec
			// Do not forget socket.set("room", otherchannel);
		}
		else
		{
			socket.emit("update_console", 'SERVER', 'Vous ne faite pas partie de cette room');
			console.log(nickname + ' ne fais pas partie de la room ' + channel);
		}
	}
	else
	{
		socket.emit("update_console", 'SERVER', 'le nom de room n\'est pas valide');
		console.log('le nom de room n\'est pas valide');
	}
}

function saveMsg(nickname, msg, channel){
	io.sockets.in(channel).emit('update_console', nickname, msg);
	console.log(channel + ' ' + nickname + ' a envoyé :' + msg);
    db.collection('talk', function (err, collection) {
        collection.findOne({room: channel}, function(err, document){
            if(document == null){
                collection.insert({messages: [{nickname: nickname, msg: msg}],
                    closed: false, room: channel, uri: ''});
				console.log('IN '+ channel + ' ' + nickname + 'a envoyé ' + msg);
            }else {
                collection.update({room: channel}, {$push: {messages:
                {nickname:nickname, msg:msg}}}, {safe: true},  function(err, doc){
					console.log('UP '+ channel + ' ' + nickname + 'a envoyé ' + msg);
                });
            }
        });
    });
}

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
				else{
					console.log('Impossible de générer l uri, aucunes phrases suppérieur à 5 mots.');
				}
            }
        });
    });
}