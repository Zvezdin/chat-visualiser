var http = require("http");
var https = require("https");

//This doesn't work. Forget it.



getJSON = function(options, onResult)
{
    console.log("rest::getJSON");

    var prot = options.port == 443 ? https : http;
    var req = prot.request(options, function(res)
    {
        var output = '';
        console.log(options.host + ':' + res.statusCode);
        res.setEncoding('utf8');

        res.on('data', function (chunk) {
            output += chunk;
        });

        res.on('end', function() {
            var obj = JSON.parse(output);
            onResult(res.statusCode, obj);
        });
    });

    req.on('error', function(err) {
        //res.send('error: ' + err.message);
    });

    req.end();
};

var options = {
    host: 'https://graph.facebook.com',
    port: 443,
    //path: '/profile.php?id=100002364700973',
    path: '/100002364700973',
    method: 'GET',
    headers: {
        'Content-Type': 'application/json'
    }
};

function onResult(code, obj){
    console.log(code,obj);
}

getJSON(options, onResult);