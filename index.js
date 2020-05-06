const tmi = require("tmi.js");

const fs = require('fs');

let options = JSON.parse(fs.readFileSync("options.json"));

const client = tmi.client(options);
let bet = false;
let betFinal = false;
let names = [];
let dict = {};

let rawdata = fs.readFileSync('leaderboard.json');
let result = JSON.parse(rawdata);

function resolveAfter(time) {
    return new Promise(resolve => {
      setTimeout(() => {
        resolve('resolved');
      }, time);
    });
}

async function updateResolve(channel, msg){
    while(bet){
        const result = await resolveAfter(600000);
        client.say(channel, msg);
    }
}

async function asyncCall(time, channel, msg, msgRepeat){
    console.log("Start");
    updateResolve(channel, msgRepeat)
    const result = await resolveAfter(time);
    console.log("End")
    bet = false;
    client.say(channel, msg);
}

// TODO: 
//       ten timer je v prdeli
//       timeout?

client.on('chat',(channel,userstate,message,self)=>{
    if(self)    return;
    if(userstate.username=="vojtas131"){
        userstate.mod=true;
    }

    if(message=="!leaderboard"){
        rawdata = fs.readFileSync('leaderboard.json');
        result = JSON.parse(rawdata);

        var items = Object.keys(result).map(function(key) {
            return [key, result[key]];
        });
  
        client.say(channel, "Leaderboard:");
        i = 0;
        var value = Infinity;
        items = items.slice(0,5);
        items.forEach((key) => {
            if (value != key[1]){
                i++;
            }
            client.say(channel, i.toString() + ". " + key[0] + " - " + key[1]);
            value = key[1];
        });
        return;
    }

    if(message.match(/^!startbet \d+ .+$/) && !betFinal){
        console.log("passed");
        if(userstate.mod){
            if(!bet && !betFinal){
                bet = true;
                betFinal = true
                let messageString = message.split(" ");
                let time = messageString[1];
                (messageString[2].split(",")).forEach(i => {
                    names.push(i.toLowerCase());
                });
                dict = {};
                console.log(names);
                var msgRepeat = "Runners: " + messageString[2] + " bet with !bet <runner> ex. !bet TheJazz"
                client.say(channel, msgRepeat);
                console.log(parseInt(time)*60*1000);
                return asyncCall((parseInt(time)*60*1000),channel,"Betting ended, stay until the end of the stream to see who wins!",msgRepeat);
            }
        }
        return;
    }

    if(message.match(/^!bet \w+$/) && bet){
        console.log("passed");
        let string = message.split(" ");
        let votedName = string[1].toLowerCase();
        if (names.includes(votedName)){
            dict[userstate.username] = votedName;
            console.log(dict[userstate.username]);
            client.whisper(userstate.username, "You voted for " + votedName);
            return;
        }
        else{
            client.whisper(userstate.username, "You voted for invalid racer: " + votedName + " Please use !bet again with a right name");
            return;
        }
    }

    if(message=="!stopbet" && userstate.mod){
        bet = false;
        console.log("Force end, timer is still running");
        return;
    }

    if(message.match(/^!winner .+$/) && userstate.mod && !bet && betFinal){
        let winnerString = message.split(" ");
        let winner = winnerString[1].toLowerCase();
        let winners = [];
        let out = "The winner of today's race is " + winner +". Correctly guessed: ";
        for(var key in dict){
            if(dict[key]==winner){
                out += key + ",";
                winners.push(key);
            }
        }
        betFinal = false;
        console.log(winners);
        client.say(channel, out);
        rawdata = fs.readFileSync('leaderboard.json');
        result = JSON.parse(rawdata);
        var items = Object.keys(result).map((key) => {
            return [key, result[key]];
        });
  
        items.sort((first, second) => {
          return second[1] - first[1];
        });

        result = {};
        items.forEach((item) => {
            result[item[0]]=item[1];
        });

        winners.forEach(element => {
            if (element in result)   result[element]++;
            else    result[element] = 1;
            
        });
        let winnersDict = JSON.stringify(result);
        fs.writeFile("leaderboard.json", winnersDict, function(err, result) {
            if(err) console.log('error', err);
            else    console.log("Success");
        });
        return;
    }

    //easter egg
    if(message=="!trainpart"){
        client.say(channel,"TrainHYPE TrainHYPE");
        return;
    }

});

client.connect();