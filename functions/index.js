const functions = require("firebase-functions");
const net = require('net');
const https = require('https');
const {Firestore} = require('@google-cloud/firestore');
const EventEmitter = require('events');
const settings = require("./settings");

const firestore = new Firestore();
const stateDocument = firestore.doc('status/status');

const lightStateEventEmitter = new EventEmitter();

lightStateEventEmitter.on('lightState', async function (newState) {
    functions.logger.log("New light status", newState);

    const currentState = await stateDocument.get();

    if (currentState.data().enabled === newState) {
        return;
    }

    const now = Math.floor(Date.now() / 1000);

    await stateDocument.update({
        date: now,
        enabled: newState
    });

    if (currentState.data().mute === false) {
        if (newState === true) {
            const timeDiff = now - currentState.data().date;
            const timeDiffStr = secondsToString(timeDiff);

            sendMessage("💡💡💡 Світло є. Світла не було " + timeDiffStr);
        } else {
            sendMessage("🕯️🕯️🕯️ Світла немає");
        }
    }
});

function sendMessage(message) {
    functions.logger.log("Telegram message", message);

    https.get(
        'https://api.telegram.org/bot' + settings.telegramBotToken + '/sendMessage?chat_id=' + settings.telegramChatId + '&text=' + message,
        (resp) => {
            resp.on('data', function (chunk) {
                functions.logger.log("Telegram response", chunk);
            });
        }
    )
    .on("error", (err) => {
        functions.logger.log("Telegram error", err);
    });
}

function plural(number, form1, form2, form3)
{
    const reminder10 = number % 10;
    const reminder100 = number % 100;
    let pluralForm;
    if ((reminder100 > 4 && reminder100 < 20) || reminder10 === 0) {
        // 5 ... 19
        pluralForm = form3;
    } else if (reminder10 === 1) {
        // 1
        pluralForm = form1;
    } else if (reminder10 >= 2 && reminder10 < 5) {
        // 2..4
        pluralForm = form2;
    } else {
        pluralForm = form3;
    }

    return number + " " + pluralForm;
}

function secondsToString(seconds) {
    if (seconds < 60) {
        return plural(seconds, "секунду", "секунди", "секунд");
    }

    if (seconds < 3600) {
        return plural(Math.floor(seconds / 60), "хвилину", "хвилини", "хвилин");
    }

    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds - (hours * 3600)) / 60);
    return plural(hours, "годину", "години", "годин") + " " + plural(minutes, "хвилину", "хвилини", "хвилин");
}

function ping()
{
    const client = new net.Socket();

    client.setTimeout(20000);
    client.connect(settings.pingPort, settings.pingHost);

    client.on('connect', function(e) {
        functions.logger.log("Ping successful");
        lightStateEventEmitter.emit('lightState', true);
        client.destroy();
    });

    client.on('error', function(e) {
        functions.logger.log("Ping error");
        lightStateEventEmitter.emit('lightState', false);
        client.destroy();
    });

    client.on('timeout', function(e) {
        functions.logger.log("Ping timeout");
        lightStateEventEmitter.emit('lightState', false);
        client.destroy();
    });
}

exports.sendToggleLightNotification = functions.pubsub
    .schedule(settings.cron)
    .onRun(
        (context) => {
            ping();

            return null;
        }
    );
