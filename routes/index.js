var Q = require("q"),
	qHttp = require("q-io/http"),

	getTransportUrl = function(from, to) {
		var url = "http://transport.opendata.ch/v1/connections?",
			today = new Date(),
			date = [today.getFullYear(), today.getMonth() + 1, today.getDate()].join("-"),
			time = [today.getHours(), today.getMinutes()].join(":");
		// build transport request 
		url += [
			"from=" + from,
			"to=" + to,
			"time=" + time,
			"date=" + date
		].join("&");

		return url;
	},

	getConnection = function(connection) {
		var now = new Date(),
			departure = connection.from.departure,
			parsedDep = /(\d+)-(\d+)-(\d+)T(\d+)\:(\d+)\:(\d+)/.exec(departure);
		parsedDep.shift();
		parsedDep.map(parseFloat);
		var departureDate = new Date(parsedDep[0], parsedDep[1] - 1, parsedDep[2], parsedDep[3], parsedDep[4], parsedDep[5]),
			delay = Math.floor((departureDate.getTime() - now.getTime()) / 1000 / 60);
		if (delay < 1) {
			return;
		}
		var minutes = departureDate.getMinutes(),
			departureTime = departureDate.getHours() + ":" + (minutes < 10 ? "0" + minutes : minutes);
		return {
			platform: connection.from.platform,
			delay: delay,
			time: departureTime
		};
	},

	getConnections = function(transport) {
		var validConnections = [],
			connections = transport.connections;
		for (var i = 0, l = connections.length; i < l; i++) {
			var connection = getConnection(connections[i]);
			if (connection) {
				validConnections.push(connection);
			}
		}
		return {
			destination: transport.to.name,
			connections: validConnections
		};
	};

/*
 * GET home page.
 */
exports.index = function(req, res) {
	Q.all([
		qHttp.read(getTransportUrl("Morges", "Lausanne")).then(function(body) {
			return JSON.parse(body);
		}), qHttp.read(getTransportUrl("Lausanne", "Morges")).then(function(body) {
			return JSON.parse(body);
		})
	]).then(function(ways) {
		var transports = null;
		try {
			transports = [getConnections(ways[0]), getConnections(ways[1])];
		} catch (e) {
			transports = "" + e;
		}
		res.render('index', {
			transports: transports,
			debug: JSON.stringify({
				origin: ways,
				results: transports,
				now: new Date()
			})
		});
	});
};