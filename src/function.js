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
        if(liveTalks[channel])
		    loadMessages(channel, socket, liveTalks[channel].messages);
		console.log(users[channel]);
		// Rediriger vers la conversation de la room
	}
	else
	{
		socket.emit("update_console", 'SERVER', 'le nom de room n\'est pas valide');
		console.log('le nom de room n\'est pas valide');
	}
}

function loadMessages(channel, socket, messages){
	socket.emit("new_room", channel);

	for(var i in messages){
		socket.emit("update_console", messages[i].nickname, messages[i].msg);
	}
}

function quitRoom(nickname, channel, socket){
	if(channel)
	{
		var found;
		for(var user in users[channel]){
            if(user == nickname)
			{
				socket.leave(channel);
				found = user;
				socket.emit('update_console', 'SERVER', 'vous êtes déconnecté de ' + channel);
				console.log(nickname + ' a quitté la room ' + channel);
				// Redirection vers une autre room (/quit) ou reste sur le même si /quit anotherroom
				// var rooms = io.sockets.manager.roomClients[socket.id]; // Permet d'avoir la liste des rooms du mec
				// Do not forget socket.set("room", otherchannel);
			}
        }
		
		if(found)
		{
			delete users[room][found];
			io.sockets.in(channel).emit('update_console', 'SERVER', nickname + ' a quitté la room');
			io.sockets.in(channel).emit('update_users', users[channel]);
		}
		else{
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

function saveMsg(nickname, msg, channel, socket){
	io.sockets.in(channel).emit('update_console', nickname, msg);
	console.log(channel + ' ' + nickname + ' a envoyé :' + msg);
	var talkTimeout = setTimeout(function(){
		console.log("channel timed out");
		closeTalk(channel, socket);
	}, 5000);

	if(liveTalks[channel] != null){
		liveTalks[channel].messages.push({nickname:nickname, msg:msg});
		clearTimeout(liveTalks[channel].timeout);
		liveTalks[channel].timeout = talkTimeout;
	}else {
		liveTalks[channel] = {messages: [{nickname: nickname, msg: msg}], room: channel, timeout: talkTimeout};
	}
}

function closeTalk(channel, socket){
    db.collection('talk', function (err, collection) {
		var uri_ = findTextUri(liveTalks[channel].messages);
		if(uri_){
			collection.insert({room: channel, messages: liveTalks[channel].messages, uri: uri_},function(err, document){
                allURIs.push(uri_);
				if(savedTalks[channel] != null){
					savedTalks[channel].talks.push({uri: uri_});
				}else {
					savedTalks[channel] = {talks: [{uri: uri_}]};
				}
				console.log(savedTalks[channel]);
				liveTalks[channel].messages = [];
				socket.emit("update_console", "SERVER", "discussion sauvegardé: <a href='/talk/"+ uri_ +"'>"+ uri_ +"</a>");
			});
		}else{
			console.log('Impossible de générer l uri, aucunes phrases suppérieur à 5 mots.');
		}
    });
}