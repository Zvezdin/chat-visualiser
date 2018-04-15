const querystring = require('querystring');
const http = require('https');
const fs = require("fs");
const ArgumentParser = require("argparse").ArgumentParser;
const assert = require('assert').strict;

var authenticationData = {};

var debug = false;

var getMessages = function(thread_id, offset, startTime, endTime, limit){
	return new Promise(function(resolve, reject){
		var dataObject = {
			'fb_dtsg': authenticationData.fb_dtsg,
			'batch_name': 'MessengerGraphQLThreadFetcher',
		};
		
		let queryObject = {
			"o0":{
			"doc_id":"1763598403704584",
			"query_params":{
					"id":thread_id,
					"message_limit":limit,
					"load_messages":true,
					"load_read_receipts":true,
					"before":startTime
				}
			}
		};
		
		dataObject['queries'] = JSON.stringify(queryObject);

		var data = querystring.stringify(dataObject);

		var options = {
			host: 'www.messenger.com',
			port: 443,
			path: '/api/graphqlbatch/',
			method: 'POST',
			headers: {
				'authority': 'www.messenger.com',
				'method': 'POST',
				'path': '/api/graphqlbatch/',
				'scheme': 'https',
				'accept': '*/*',
				'accept-encoding': 'utf16',
				'accept-language': 'en-US,en;q=0.8',
				'content-type': 'application/x-www-form-urlencoded',
				'content-length': Buffer.byteLength(data),
				'cookie': authenticationData.cookie,
				'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/59.0.3071.86 Safari/537.36',
			},
		};

		var response = {};
		var responseString = "";

		var req = http.request(options, function(res) {

			res.on('data', function (chunk) {
				if(debug) console.log("Got a chunk!");
				responseString += chunk;
			});

			res.on('end', function() {
				//the response is two JSON objects. Make it an array so it gets parsed

				try{
					let res = JSON.parse(responseString);
				} catch(e) {
					let msgParts = e.message.split(' ');
					let pos = +msgParts[msgParts.length-1];

					String.prototype.splice = function(idx, rem, str) {
						return this.slice(0, idx) + str + this.slice(idx + Math.abs(rem));
					};

					//insert a comma between these objects
					//and make it an array of objects
					responseString = '[' + responseString.splice(pos, 0, ",") + ']';

					let parsed = JSON.parse(responseString);

					metadata = parsed[1];
					
					res = parsed[0];

					assert(metadata['error_results'] == 0);
					assert(metadata['skipped_results'] == 0);
				}

				resolve(res);
			});
		});

		req.on('error', (e) => {
			reject(e);
		});

		req.write(data);
		req.end();
	});
}

var saveAllMessages = async function(filename, thread_type, thread_id, startTime, endTime){
	if(startTime == undefined) startTime = new Date().getTime();
	if(endTime == undefined) endTime = 0;

	var offset = 0;

	var limit = 2000;

	var actions = [];

	let lastEnd = startTime;

	while(true){
		let response = await getMessages(thread_id, offset, lastEnd, endTime, limit);

		if(debug) console.log(response);

		let thread = response.o0.data.message_thread;

		assert(thread.thread_key.thread_fbid == null || thread.thread_key.other_user_id == null);
		assert(thread.thread_key.other_user_id === thread_id || thread.thread_key.thread_fbid === thread_id);

		let messages = thread.messages.nodes;

		//if this is our first message series, push the most recent message, which we usually ignore
		if(actions.length == 0){
			actions.push(messages[messages.length-1]);
		}
		
		//reverse iteration (new -> old), but skip the newest
		for(i=messages.length-2; i>=0; i--){
			actions.push(messages[i]);

			if(debug && typeof messages[i].message != 'undefined') console.log(new Date(+messages[i].timestamp_precise) + " \t" + messages[i].message.text);
		}

		if(actions[actions.length-1].timestamp_precise < endTime || messages.length < limit){

			//save the user ID as well
			var user = authenticationData.cookie.substr(authenticationData.cookie.indexOf("c_user") + 7, 15);

			var data = {'actions': actions, 'user': user};

			console.log("Saving the data as "+data);

			fs.writeFile(filename, JSON.stringify(data), function(err){
				if(err != undefined) console.error(err);

				console.log("Finished saving "+filename+". Stats: "+actions.length+" chat messages in series of "+limit+" for "+(new Date().getTime() - startTime)+" ms");
			});

			return;
		}

		if(debug) console.log("LOADING OTHER MESSAGES");

		lastEnd = actions[actions.length-1].timestamp_precise;
	}
};

var id, type = "user_ids", filename;

var filename;

var execute = true;

function main() {
	var parser = new ArgumentParser({
		version: '0.1.0',
		addHelp:true,
		description: 'AutomaticChatDownloaderPrivacyIntrusion9001'
	});

	parser.addArgument(
		[ 'id' ],
		{
			help: 'User/group id which to download',
			type: String,
		},
	);

	parser.addArgument(
		[ '--type' ],
		{
			help: 'Download blockchain data with for a block range of given start and end block number',
			choices: ["user", "group"],
			defaultValue: "user",
			type: String,
		},
	);

	parser.addArgument(
		['--debug'],
		{
			help: 'Shows debug log',
			defaultValue: false,
			action: "storeTrue",
		},
	);

	parser.addArgument(
		['--getone'],
		{
			help: 'Loads only one batch of messages',
			defaultValue: false,
			action: "storeTrue",
		},
	);

	parser.addArgument(
		['--filename'],
		{
			help: 'Location to save downloaded data',
			defaultValue: undefined,
			type: String,
		},
	)


	var args = parser.parseArgs();
	
	let type;

	if(args.type == "user") type = "user_ids";
	else type = "thread_fbids";

	let filename;

	if(filename == undefined) filename = "downloaded_data/history_"+type+"_"+args.id+".json";

	authenticationData = JSON.parse(fs.readFileSync('data.json'));

	if(authenticationData.cookie == undefined || authenticationData.fb_dtsg == undefined){
		console.error("Error: No authentication data! Please provide your cookie and fb_dtsg in data.json (see example_data.json for example)");
		execute = false;
	}

	debug = args.debug;

	saveAllMessages(filename, type, args.id);

}

main();