let msgBox = document.getElementById("MsgBox"),
    input = document.getElementById("input"),
    bufferButtons = document.getElementById("bufferButtons");
let currentBuffer = ''; // Currently focused buffer name
let buffers = {}; // Contains all buffers
let channels = {}; // Contains channel lists per server
let nick = {}; // Contains the nick for each server
let socket = new_socket();

function scrollMsgBox() {
	msgBox.scrollTop = msgBox.scrollTopMax;
}
function addMessage(text) {
	msgBox.value += text.trim() + '\r\n';
}
function clearInput() {
	input.value = '';
}
input.addEventListener("keyup", (event) => {
	if (event.keyCode === 13) // enter
		submit();
});

function new_socket() {
	let socket = new WebSocket("ws://localhost:4222");
	socket.onmessage = processEvent;

	return socket;
}

function processEvent(event) {
	let message = parseMessage(event.data);
	if (!message)
		return;

	console.log(message);

	switch (message.command) {
	case 'RECV':
		return processRecv(message);
	case 'CONNECT':
		return processConnect(message);
	case 'JOIN':
		return processJoin(message);
	case 'PART':
		return processPart(message);
	case 'NICK':
		return processNick(message);
	}
}

function parseMessage(text) {
        let m = text.trim().match(/^([A-Z]+)\s+(?:\'(.+)\')?(?:\.?(#[^\.\s]+))?(?:\.?([^\.\s]+))?(?:\s*\|\s*(.+))?$/);
        if (m)
                return {
                        'command': m[1],
                        'server': m[2],
                        'channel': m[3],
                        'user': m[4],
                        'data': m[5]
                };
        else
                return null;
}

function createMessage(msg) {
	let text = msg.command;
	if (text && msg.server) {
		text += ` '${msg.server}'`;
		if (msg.channel)
			text += `.${msg.channel}`;
		if (msg.user)
			text += `.${msg.user}`;
		if (msg.data)
			text += ` | ${msg.data}`;
		text += "\r\n";
	}

	return text;
}

function processRecv(msg) {
	if (!msg.server || !msg.channel)
		return;

	let name = `${msg.server}.${msg.channel}`;
	let text = `${msg.user}: ${msg.data}\r\n`;
	if (buffers[name] || buffers[name] === '')
		buffers[name] += text;
	else {
		buffers[name] = text;
		addChannel(msg.server, msg.channel);
	}
	if (name === currentBuffer) {
		addMessage(text);
		scrollMsgBox();
	}
}

function processConnect(msg) {
	if (msg.server)
		addServer(msg.server);
}

function processJoin(msg) {
	if (msg.server && msg.channel)
		addChannel(msg.server, msg.channel);
}

function processPart(msg) {
	if (msg.server && msg.channel && (!msg.user || msg.user === nick[msg.server]))
		removeChannel(msg.server, msg.channel);
	else if (msg.server && msg.channel && msg.user) {
		let text = `PART ${msg.user} (${msg.data})`;
		let name = `${msg.server}.${msg.channel}`
		if (currentBuffer === name)
			addMessage(text);
		if (buffer[name] || buffer[name] === '')
			buffer[name] += text + '\r\n';
	}
}

function processNick(msg) {
	if (msg.server && msg.user === nick[msg.server] && msg.data)
		nick[msg.server] = data;
	else if (msg.server && msg.user && !msg.data)
		nick[msg.server] = msg.user;
}

function submit() {
	if (input.value === '')
		return;
	if (socket.readyState > 1)
		socket = new_socket();

	let text = input.value;
	let words = currentBuffer.split('.');
	let server = words[0], channel = words[1];
	if (channel && text[0] === '%') {
		let msg = `TOJESI '${server}'.${channel} | ${text}\r\n`;
		console.log('Sending to jesi: ' + msg);
		socket.send(msg);
	} else if (channel) {
		socket.send(`SEND '${server}'.${channel} | ${text}\r\n`);
		//addMessage(`${nick[server]}: ${text}`);
	} else if (server) {
		let msg = parseMessage(text);
		if (msg) {
			msg.server = server;
			msgText = createMessage(msg);
			console.log(`socket <-- ${msgText}`);
			socket.send(msgText);
			addMessage(`<-- ${text}`);
		}
	}

	scrollMsgBox();
	clearInput();
}

function addServer(name) {
	if (document.getElementById(name))
		return;

	let html = `<div id="${name}"><input class="serverButton" type="button" value="${name}" onclick="switchBuffer('${name}')"/></div>`;
	bufferButtons.innerHTML += html;
	buffers[name] = '';
	channels[name] = [];
	switchBuffer(name);
}

function removeServer(name) {
	let serverDiv = document.getElementById(name);
	if (serverDiv)
		bufferButtons.removeChild(serverDiv);
}

function addChannel(server, channel) {
	let serverDiv = document.getElementById(server);
	let name = `${server}.${channel}`;
	if (!serverDiv || document.getElementById(name))
		return;

	let html = `<input id="${name}" type="button" value="${channel}" onclick="switchBuffer('${name}')"/>`;
	serverDiv.innerHTML += html;
	buffers[name] = '';
	channels[server].push(channel);
}

function removeChannel(server, channel) {
	let name = `${server}.${channel}`;
	let parent = document.getElementById(server);
	let child = document.getElementById(name);

	if (parent && child)
		parent.removeChild(child);
}

function switchBuffer(name) {
	if (currentBuffer) {
		buffers[currentBuffer] = msgBox.value;
		document.getElementById(currentBuffer).className = '';
	}

	if (buffers[name] || buffers[name] === '') {
		let button = document.getElementById(name);
		msgBox.value = buffers[name];
		if (!button.className)
			button.className = 'active';
		currentBuffer = name;
		document.getElementById('currentBuffer').innerHTML = `<p>${currentBuffer}</p>`;
		input.focus();
	}
}
