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

userExist(users, nickname){
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

function joinRoom(nickname, room, socket){
	if(room)
	{
		if(!users[room])
			users[room] = new Array();
		users[room][nickname] = nickname;
		socket.set("room", room);
		socket.join(room);
		io.sockets.in(room).emit('update_console', 'SERVER', nickname + ' est maintenant connecté');
		console.log(nickname + ' a rejoint la room ' + room);
		// Rediriger vers la conversation de la room
	}
	else
	{
		// Envoyer message erreur
		console.log('le nom de room n\'est pas valide');
	}
}

function saveMsg(nickname, msg, channel){
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