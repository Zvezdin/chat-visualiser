var querystring = require('querystring');
var http = require('https');
var fs = require("fs");

var authenticationData = {};

var debug = false;

var getMessages = function(thread_type, thread_id, offset, startTime, endTime, limit, callback){

    var dataObject = {
        '__a':'1',
        'fb_dtsg': authenticationData.fb_dtsg,
    };

    dataObject['messages['+thread_type+']['+thread_id+'][timestamp]'] = startTime;
    dataObject['messages['+thread_type+']['+thread_id+'][limit]'] = limit;

    var data = querystring.stringify(dataObject);

    var options = {
        host: 'www.messenger.com',
        port: 443,
        path: '/ajax/mercury/thread_info.php?dpr=1',
        method: 'POST',
        headers: {
            'authority': 'www.messenger.com',
            'method': 'POST',
            'path': '/ajax/mercury/thread_info.php?dpr=1',
            'scheme': 'https',
            'accept': '*/*',
            'accept-encoding': 'utf16',
            'accept-language': 'en-US,en;q=0.8',
            'Content-Type': 'application/x-www-form-urlencoded',
            'Content-Length': Buffer.byteLength(data),
            'Cookie': authenticationData.cookie,
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
            responseString = responseString.replace("for (;;);", "response = ");
            eval(responseString);
            callback(response);
        });
    });

    req.on('error', (e) => {
        console.error(e);
    });

    req.write(data);
    req.end();
}

var saveAllMessages = function(filename, thread_type, thread_id, startTime, endTime){
    if(startTime == undefined) startTime = new Date().getTime();
    if(endTime == undefined) endTime = 0;

    var offset = 0;

    var limit = 2000;

    var actions = [];

    var messageHandler = function(response){
        if(debug) console.log(response);

        if(response.payload == null || response.payload == undefined || response.payload.actions == undefined){
            console.error("Couldn't get any data!");

            if(response.error != undefined) console.error("Error code "+response.error+" with summary '"+response.errorSummary+"' and description '"+response.errorDescription+"'");

            if(debug) console.log("Response:", response.payload);
            return;
        }

        if(actions.length == 0) actions.push(response.payload.actions[response.payload.actions.length-1]);

        for(i=response.payload.actions.length-2; i>=0; i--){
            actions.push(response.payload.actions[i]);
            if(debug) console.log(new Date(response.payload.actions[i].timestamp) + " \t" + response.payload.actions[i].body);
        }

        if(actions[actions.length-1].timestamp < endTime || typeof response.payload.end_of_history != "undefined"){

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

        getMessages(thread_type, thread_id, offset, actions[actions.length-1].timestamp, 0, limit, messageHandler);
    }

    getMessages(thread_type, thread_id, offset, startTime, endTime, limit, messageHandler);
};

var id, type = "user_ids", filename;

var filename;

var execute = true;

for(i=2; i<process.argv.length; i++){
    var argument = process.argv[i];
    var prev_arg = process.argv[i-1];
    if(prev_arg == "--type"){
        if(argument == "user" || argument == "user_ids") type = "user_ids";
        else if(argument == "group" || argument == "thread_fbids") type = "thread_fbids";
        else{
            console.error("Invalid --type argument! Valid values are: 'user' or 'group'");
            execute = false;
        }
    }
    else if(prev_arg == "--id"){
        id = Number(argument);
        if(id < 0){
            console.error("Invalid --id argument!");
            execute = false;
        }
    }
    else if(prev_arg == '--file'){
        filename = argument;
    }
    else if(argument == '--help'){
        console.log("Help for AutomaticChatDownloaderPrivacyIntrusion9001");
        console.log("Use argument --type to specify id type: 'user' or 'group'. Defaults to 'user'");
        console.log("Use argument --id to specify user/group id");
        console.log("Use argument --file to specify file name/path to save the data to. Defaults to HISTORY_TYPE_ID.json");
        console.log("Use argument --debug to show debug logs");
        execute = false;
    }
    else if(argument == '--debug'){
        debug = true;
    }
}

if(filename == undefined) filename = "downloaded_data/history_"+type+"_"+id+".json";

authenticationData = JSON.parse(fs.readFileSync('data.json'));

if(authenticationData.cookie == undefined || authenticationData.fb_dtsg == undefined){
    console.error("Error: No authentication data! Please provide your cookie and fb_dtsg in data.json (see example_data.json for example)");
    execute = false;
}

if(id == undefined){
    console.error("Please provide a chat ID with --id")
    execute = false;
}
if(execute) saveAllMessages(filename, type, id);
