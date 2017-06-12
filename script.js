var data;

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
                }],
            }
        }
    });

    $('#pie_chart').hide(); 
    $('#line_chart').hide();
};

function startUpload(){

    var files = document.getElementById("dataUpload");

    if(files == undefined || files.files.length != 1){
        console.error("Not selected a file!");
        return;
    }

    var file = files.files[0];

    console.log(file);

    fr = new FileReader();
    fr.onload = onUploadComplete;
    fr.readAsText(file);
}

function onUploadComplete(text){
    console.log(text);
    data = JSON.parse(text.target.result);

    console.log(data);

    onDataParsed();
}

function onDataParsed(){
    messageAuthorShare();
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

function getUsername(message){
    if(message.author != undefined){
        if(chatMembers[message.author.substr(5)] != undefined) return chatMembers[message.author.substr(5)];
    } else if(chatMembers[message.substr(5)] != undefined) return chatMembers[message.substr(5)];
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
                    time: {
                        displayFormats: {
                            'day': 'MMM DD'
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

    for(var i=0; i<keys.length; i++){
        chartData.push(authorData[keys[i]]);
        keys[i] = keys[i].substr(5);
        chartLabels.push(chatMembers[keys[i]] != undefined ? chatMembers[keys[i]] : keys[i]);
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