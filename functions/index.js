const functions = require("firebase-functions");
const net = require('net');
const https = require('https');
const {Firestore} = require('@google-cloud/firestore');
const EventEmitter = require('events');
const settings = require("./settings");

const firestore = new Firestore();
const stateDocument = firestore.doc('status/status');

const lightStateEventEmitter = new EventEmitter();

lightStateEventEmitter.on('lightState', async function (newLightState) {
    const now = Math.floor(Date.now() / 1000);

    let currentState;
    try {
        currentState = await stateDocument.get();
    } catch (e) {
        functions.logger.log("Can not read current state from database", e);
        return;
    }

    if (!currentState || !currentState.data()) {
        try {
            await stateDocument.create({
                date: now,
                light: true,
                mute: false
            });
        } catch (e) {
            functions.logger.log("Can not init state in database", e);
        }

        return;
    }


    const mute = currentState.data().mute;
    const lastStateDate = currentState.data().date;
    const lastLightStatus = currentState.data().light;

    if (lastLightStatus  === newLightState) {
        functions.logger.log("Light status not changed");
        return;
    }

    functions.logger.log("Light status changed to: " + (newLightState ? 'ON' : 'OFF'));

    try {
        await stateDocument.update({
            date: now,
            light: newLightState,
            mute: mute
        });
    } catch (e) {
        functions.logger.log("Can not update state in database", e);
    }

    if (mute === false) {
        if (newLightState === true) {
            const timeDiff = now - lastStateDate;
            const timeDiffStr = secondsToString(timeDiff);

            sendMessage("💡💡💡 Світло є. Відключення тривало " + timeDiffStr);
        } else {
            sendMessage("🕯🕯🕯 Світла немає.");
        }
    } else {
        functions.logger.log("Notification muted");
    }
});

function sendMessage(message) {
    functions.logger.log("Telegram message", message);

    https.get(
        'https://api.telegram.org/bot' + settings.telegramBotToken + '/sendMessage?chat_id=' + settings.telegramChatId + '&text=' + message,
        (resp) => {
            resp.on('data', function (chunk) {
                functions.logger.log("Telegram response", chunk.toString());
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

async function ping()
{
    return new Promise((resolve, reject) => {
        const socket = new net.Socket();

        socket.setTimeout(5000);

        socket.connect(
            settings.pingPort,
            settings.pingHost,
            () => {
                functions.logger.log("Ping successful");
                resolve(true);
                socket.destroy();
            }
        );

        socket.once('error', function(e) {
            functions.logger.log("Ping error", e);
            socket.destroy();
            resolve(false);
        });

        socket.once('timeout', function() {
            functions.logger.log("Ping idle timeout");
            socket.destroy();
            resolve(false);
        });
    });
}

exports.sendToggleLightNotification = functions
    .region(settings.region)
    .pubsub
    .schedule(settings.cron)
    .onRun(
        async (context) => {
            functions.logger.log("Check started");

            try {
                let lightState = await ping();

                // if ping error - try to check again
                if (!lightState) {
                    functions.logger.log("Ping failed, sleep...");
                    await new Promise(resolve => setTimeout(resolve, 10000));

                    functions.logger.log("Ping failed, retry...");
                    lightState = await ping();
                }

                functions.logger.log("Emitting actual light status: ", lightState ? 'ON' : 'OFF');
                lightStateEventEmitter.emit('lightState', lightState);
            } catch (e) {
                functions.logger.log("Ping exception ", e);
            }

            return null;
        }
    );
