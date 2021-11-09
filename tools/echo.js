import WebSocket, { WebSocketServer } from 'ws';

const wss = new WebSocketServer({
	port: 4222
});

wss.on('connection', (ws) => {
	ws.on('message', (data) => {
		let text = data.toString();
		console.log('-->', text);

		switch (text) {
			case 'ping':
				text = 'pong';
				break;
			case 'pong':
				text = 'ping';
				break;
			case '>.>':
				text = '<.<';
				break;
			case '<.<':
				text = '>.>';
				break;
		}

		ws.send(text);
		console.log('<--', text);
	});
});
