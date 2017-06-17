var data;

var user;

var chatMembers= {};

var pieChart;
var lineChart;

window.onload = function(){
    if (window.File && window.FileReader && window.FileList && window.Blob) {
    // Great success! All the File APIs are supported.
    } else {
        alert('The File APIs are not fully supported in this browser. The website will not work correctly!');
    }

    var ctx = $('#pie_chart')[0].getContext('2d');
    pieChart = new Chart(ctx, {
        type: 'pie',
    });

    ctx = $('#line_chart')[0].getContext('2d');
    lineChart = new Chart(ctx, {
        type: 'line',

        options: {
            scales: {
                xAxes: [{
                    type: 'time',
                    time: {
                    }
                }],
            }
        }
    });

    $('#pie_chart').hide(); 
    $('#line_chart').hide();

    $(".chat").scroll(function(){
        if($(".chat").scrollTop() == 0){
            console.log("Loading more messages upwards");
            showChat(undefined, loadedChatEnd+1, 10);
        } else if($(".chat").scrollTop() == $(".chat").prop("scrollHeight") - $(".chat").height()){
            console.log("Loading more messages downwards");

            var oldScroll = $(".chat").scrollTop();

            showChat(undefined, loadedChatStart-1, -10);

            $(".chat").scrollTop(oldScroll);
        }
    });

    var fileString = window.localStorage.getItem("file");

    if(fileString != undefined){
        parseData(fileString);
    }
};

function startUpload(){

    var files = document.getElementById("dataUpload");

    var file;

    if(files == undefined || files.files.length != 1){
        console.error("Not selected a file!");
        return;
    } else file = files.files[0];

    console.log(file);

    fr = new FileReader();
    fr.onload = onUploadComplete;
    fr.readAsText(file);
}

function onUploadComplete(text){
    try{
        window.localStorage.setItem("file", text.target.result);
    } catch(e){
        console.error(e);
    }

    parseData(text.target.result);
}

function parseData(text){
    var obj = JSON.parse(text);
    data = obj.actions;
    user = obj.user;

    console.log(data, user);

    onDataParsed();
}

function onDataParsed(){
    messageAuthorShare();

    $(".timeSlider").attr("min", data[data.length-1].timestamp);
    $(".timeSlider").attr("max", data[0].timestamp);

    $(".timeSlider").change( 
        function(event, k) {
            console.log("Stopped ", event.currentTarget.value);

            showChat(event.currentTarget.value, undefined, 20);
        }
    );
}

var chartPoints = 100;

function updateChart(config, chart){
    chart.config = config;
    chart.update();
}

function getChatMembers(){
    chatMembers = {};
    for(var i=0; i<data.length; i++){
        if(data[i].action_type == "ma-type:log-message"){
            if(data[i].log_message_data.message_type == "change_thread_nickname"){
                if(chatMembers[data[i].log_message_data.untypedData.participant_id] != undefined) continue;
                chatMembers[data[i].log_message_data.untypedData.participant_id] = data[i].log_message_data.untypedData.nickname;
            }
        }
    }
    console.log("Got nicknames!", chatMembers);
}

function getNickname(message){
    if(message.author != undefined){
        if(chatMembers[message.author.substr(5)] != undefined) return chatMembers[message.author.substr(5)];
    } else if(chatMembers[message.substr(5)] != undefined) return chatMembers[message.substr(5)];
    return message.author.substr(5);
}

function getUserId(message){
    return message.author.substr(5);
}

function hideAll(){
    $("#pie_chart").hide();
    $("#line_chart").hide();
}

function absoluteChatActivity(){
    var chartData = [];

    //( data.length > chartPoints ? Math.floor(data.length / chartPoints)

    var interval = (data[0].timestamp - data[data.length-1].timestamp) / chartPoints;
    var previousTimestamp = 0;


    console.log("Interval is "+interval);

    for(i = data.length-1; i>=0; i-= 1 ){
        if((data.length <= chartPoints) || (data[i].timestamp > previousTimestamp + interval)) {
            console.log("Adding point "+data[i].timestamp);
            previousTimestamp = data[i].timestamp;
            chartData.push({
                x: data[i].timestamp,
                y: data.length-i,
            });
        }
    }

    var config = {
        // The type of chart we want to create
        type: 'line',

        // The data for our dataset
        data: {
            datasets: [{
                label: "Chat growth",
                backgroundColor: 'rgb(255, 99, 132)',
                borderColor: 'rgb(99, 99, 255)',
                data: chartData,
            }]
        },

        // Configuration options go here
        options: {
            scales: {
                xAxes: [{
                    type: 'time',
                }],
            }
        }
    };

    updateChart(config, lineChart);

    hideAll();
    $('#line_chart').show();
}

function relativeChatActivity(){
    var chartData = [];

    //( data.length > chartPoints ? Math.floor(data.length / chartPoints)

    var interval = (data[0].timestamp - data[data.length-1].timestamp) / chartPoints;
    var previousTimestamp = 0;

    var accumulatedMessages = 0;

    console.log("Interval is "+interval);

    for(i = data.length-1; i>=0; i-= 1 ){
        accumulatedMessages += 1;
        if((data.length <= chartPoints) || (data[i].timestamp > previousTimestamp + interval)) {
            console.log("Adding point "+data[i].timestamp);
            previousTimestamp = data[i].timestamp;
            chartData.push({
                x:data[i].timestamp,
                y: accumulatedMessages,
            });

            accumulatedMessages = 0;
        }
    }

    var config = {
        // The type of chart we want to create
        type: 'line',

        // The data for our dataset
        data: {
            datasets: [{
                label: "Relative chat growth",
                backgroundColor: 'rgb(255, 99, 132)',
                borderColor: 'rgb(99, 99, 255)',
                data: chartData,
            }]
        },

        // Configuration options go here
        options: {
            scales: {
                xAxes: [{
                    type: 'time',
                }],
            }
        }
    };

    updateChart(config, lineChart);

    hideAll();
    $('#line_chart').show();
}

function messageAuthorShare(){
    var authorData = {};

    var chartLabels = [];

    var chartData = [];

    getChatMembers();

    for(i = data.length-1; i>=0; i-= 1 ){
        if(authorData.hasOwnProperty(data[i].author)){
            authorData[data[i].author]++;
        } else authorData[data[i].author] = 1;
    }

    var keys = [];
    for(var key in authorData) if(authorData.hasOwnProperty(key)) keys.push(key);

    for(var i=0; i<keys.length; i++){
        for(var j=0; j<keys.length-1; j++){
            if(authorData[keys[j]] < authorData[keys[j+1]]){
                keys[j] = [keys[j+1], keys[j+1]=keys[j]][0];
            }
        }
    }

    for(var i=keys.length-1; i>=0; i--){
        chartData.push(authorData[keys[i]]);
        keys[i] = keys[i].substr(5);
        chartLabels.push(chatMembers[keys[i]] != undefined ? chatMembers[keys[i]] : (keys[i] == user ? "You ("+keys[i]+")" : keys[i]));
    }

    var config = {
        type: 'pie',

        data: {
            datasets: [{
                label: "Message author share",
                backgroundColor: palette('tol-rainbow', chartData.length).map(function(hex) {
                    return '#' + hex;
                }),
                borderColor: 'rgb(255, 255, 255)',
                data: chartData,
            }],

            labels: chartLabels,
        },
    };

    updateChart(config, pieChart);

    hideAll();
    $('#pie_chart').show();
}

var pieSlices = 10;

function mostCommonMessages(){

    var chartLabels = [];

    var chartData = [];

    var queueData = [];

    var messageCount = {};

    for(var i=0; i<data.length; i++){
        if(data[i].body != undefined && data[i].body != ""){
            if(messageCount[data[i].body.toLowerCase()] == undefined) messageCount[data[i].body.toLowerCase()] = 1;
            else messageCount[data[i].body.toLowerCase()]++;
        }
    }

    for(var k in messageCount){
        if(messageCount.hasOwnProperty(k)){
            queueData.push({text: k, count: messageCount[k]});
        }
    }

    var queueComparator = function (a,b){
        if(a.count > b.count) return -1;
        else if(a.count < b.count) return 1
        return 0;
    }

    queue = new PriorityQueue({comparator: queueComparator, initialValues: queueData});

    for(var i=0; i<pieSlices && i<queue.length; i++){
        chartData.push(queue.peek().count);
        chartLabels.push(queue.dequeue().text);
    }

    console.log(chartData, chartLabels);

    var config = {
        type: 'pie',

        data: {
            datasets: [{
                label: pieSlices+" most common chat messages",
                backgroundColor: palette('tol-rainbow', chartData.length).map(function(hex) {
                    return '#' + hex;
                }),
                borderColor: 'rgb(255, 255, 255)',
                data: chartData,
            }],

            labels: chartLabels,
        },
    };

    updateChart(config, pieChart);

    hideAll();
    $('#pie_chart').show();
}

var activeHoursPoints = 24;
function activeHours(){
    var chartData = new Array(activeHoursPoints);

    for(var i=0; i<chartData.length; i++){
        chartData[i] = {};
        chartData[i].x = (86400000 / activeHoursPoints) * i  //+ (86400000 - 2*(1000*60*60));
        chartData[i].y = 0;
    }

    
    for(var i=0; i<data.length; i++){
        var hour = Math.floor( (data[i].timestamp % 86400000) / (1000*60*60) );
        chartData[hour].y++;
    }

    console.log(chartData);

    var config = {
        // The type of chart we want to create
        type: 'line',

        // The data for our dataset
        data: {
            datasets: [{
                label: "Active hours",
                backgroundColor: 'rgb(255, 99, 132)',
                borderColor: 'rgb(99, 99, 255)',
                data: chartData,
            }]
        },

        // Configuration options go here
        options: {
            scales: {
                xAxes: [{
                    type: 'time',
                    time: {
                        unit: 'hour',

                        displayFormats: {
                            month: '',
                            day: '',
                        }
                    }
                }],
            }
        }
    };

    updateChart(config, lineChart);

    hideAll();
    $('#line_chart').show();
}

var loadedChatStart;
var loadedChatEnd;

function showChat(timestamp, index, amount){
    if(timestamp != undefined){
        for(var i=0; i<data.length-1; i++){
            if(data[i].timestamp >= timestamp && data[i+1].timestamp < timestamp) index = i;
        }
    }

    if(index!= undefined && index>=0 && index < data.length){
        var startMessage = index, endMessage = index + amount;

        var messagesToAppend = [], messagesToPrepend = [];

        if(startMessage > endMessage){
            startMessage = [endMessage, endMessage=startMessage][0]; //swap the values
        }
        
        if(endMessage >= data.length){
            startMessage -= endMessage - data.length;
            endMessage -= endMessage - data.length;
        }
        
        console.log("Showing messages from "+startMessage+" to "+endMessage+" out of "+data.length);

        if(loadedChatStart != undefined) //if we have loaded chat messages before
            if(endMessage<loadedChatStart-1 && startMessage<loadedChatStart-1){
                //endMessage = loadedChatStart-1;
                clearChat();
            }
        if(loadedChatEnd != undefined)
            if(startMessage>loadedChatEnd+1 && endMessage>loadedChatEnd+1){
                //startMessage = loadedChatEnd+1;
                clearChat();
            }

        if(loadedChatStart == undefined) loadedChatStart = 1000000000;
        if(loadedChatEnd == undefined) loadedChatEnd = -1;

        var id = "";

        console.log(startMessage, endMessage, loadedChatStart, loadedChatEnd);

        for(var i=startMessage; i<=endMessage && i<data.length; i++){
            if(i>= loadedChatStart && i<= loadedChatEnd) continue;

            //console.log("Appending with index "+i+ " and timestamp "+data[i].timestamp+" which is "+new Date(data[i].timestamp));


            if(getUserId(data[i]) == user) clas = "messageContainerRight";
            else clas = "messageContainerLeft";

            var tag = '<div class="container '+clas+'"><span class="message">' + data[i].body + '</span></div>';

            if(i < loadedChatStart) messagesToPrepend.push(tag);
            else messagesToAppend.push(tag);
        }

        loadedChatStart = Math.min(startMessage, loadedChatStart);
        loadedChatEnd = Math.max(Math.min(endMessage, data.length-1), loadedChatEnd);

        for(var i=messagesToPrepend.length-1; i>=0; i--){
            $(".chat").prepend(messagesToPrepend[i]);
        }

        for(var i=0; i<messagesToAppend.length; i++){
            $(".chat").append(messagesToAppend[i]);
            console.log("Appending "+messagesToAppend[i]);
        }
    }

    function clearChat(){
        loadedChatEnd = undefined;
        loadedChatStart = undefined;

        $(".chat").empty();
    }
}