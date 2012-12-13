﻿String.prototype.replaceAll = function(stringToFind,stringToReplace)
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
		if(!users[channel])
			users[channel] = new Array();
		users[channel][users[channel].length] = nickname;
		socket.set("room", channel);
		socket.join(channel);
		io.sockets.in(channel).emit('update_console', 'SERVER', nickname + ' est maintenant connecté', channel);
		socket.emit('update_console', 'SERVER', 'vous êtes connecté sur ' + channel, channel);
		io.sockets.in(channel).emit('update_users', users[channel], channel);
		console.log(nickname + ' a rejoint la room ' + channel);
		manageChannel('add', channel, socket);
        if(liveTalks[channel])
		    loadMessages(channel, socket, liveTalks[channel].messages);
		console.log(users[channel]);
	}
	else
	{
		socket.emit("update_console", 'SERVER', 'le nom de room n\'est pas valide', channel);
		console.log('le nom de room n\'est pas valide');
	}
}

function manageChannel(action, channel, socket){
	socket.emit("manage_channel", action, channel);
	io.sockets.in(channel).emit('update_users', users[channel], channel);
}

function loadMessages(channel, socket, messages){
	for(var i in messages){
		socket.emit("update_console", messages[i].nickname, messages[i].msg, channel);
	}
}

function quitRoom(nickname, channel, socket, currentRoom){
	if(channel)
	{
		var found;
		for(var i = 0; i<users[channel].length;i++){
            if(users[channel][i] == nickname)
			{
				socket.leave(channel);
				found = i;
				manageChannel('del', channel, socket);
				socket.emit('update_console', 'SERVER', 'vous êtes déconnecté de ' + channel, channel);
				console.log(nickname + ' a quitté la room ' + channel);
			}
        }
		
		if(found != null)
		{
			delete users[channel][found];
			io.sockets.in(channel).emit('update_console', 'SERVER', nickname + ' a quitté la room', channel);
			io.sockets.in(channel).emit('update_users', users[channel], channel);
		}
		else{
			socket.emit("update_console", 'SERVER', 'Vous ne faite pas partie de cette room', channel);
			console.log(nickname + ' ne fais pas partie de la room ' + channel);
		}
	}
	else
	{
		socket.emit("update_console", 'SERVER', 'le nom de room n\'est pas valide', channel);
		console.log('le nom de room n\'est pas valide');
	}
}

function saveMsg(nickname, msg, channel, socket){
	io.sockets.in(channel).emit('update_console', nickname, msg, channel);
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
				if(savedTalks[channel] != null){
					savedTalks[channel].talks.push({uri: uri_});
				}else {
					savedTalks[channel] = {talks: [{uri: uri_}]};
				}
				console.log(savedTalks[channel]);
				liveTalks[channel].messages = [];
				socket.emit("update_console", "SERVER", "discussion sauvegardé: <a href='/talk/"+ uri_ +"'>"+ uri_ +"</a>", channel)
			});
		}else{
			console.log('Impossible de générer l uri, aucunes phrases suppérieur à 5 mots.');
		}
    });
}