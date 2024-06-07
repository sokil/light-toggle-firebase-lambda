[![SWUbanner](https://raw.githubusercontent.com/vshymanskyy/StandWithUkraine/main/banner-direct.svg)](https://github.com/vshymanskyy/StandWithUkraine/blob/main/docs/README.md)

🇬🇧 As a result of russia's terrorist attacks on civilian infrastructure, including power-generating infrastructure, a lot of power-generating capacity has been lost. Blackouts apply, and Ukraine sits without electricity from several hours a day, sometimes up to several days. This bot will help you monitor power outages at your home by sending appropriate messages to the Telegram channel.

🇺🇦 Внаслідок терористичних атак росії на цивільну інфраструктуру, в тому числі на енергогенеруючу, втрачено дуже багато електрогенеруючих потужностей. Застосовуються відключення, і Україна сидить без світла від декількох годин на добу іноді до декількох днів. Цей бот допоможе вам слідкувати за відключеннями електроенергіїу вас дома відсилаючи відповідні повідомлення в телеграм канал.

# Light Toggle Firebase Lambda

Notifies to Telegram on toggle electricity by pinging some device

## Configuration

Create Firebase project at https://firebase.google.com/. Also enable "functions" and "firestore".

In "Firestore Database" create new database. Leave name "(default)" for it.

Install Firebase tools

```
$ npm install -g firebase-tools
```

Clone somewhere this project.

Authozise in Firebase CLI:

```
firebase login
```

See you projects in console:

```
firebase project:list
```

Configure Firebase project Id in `.firebaserc`, see example at `.firebaserc.example`.

Configure Telegram bot parameters and host for pinging at `functions/settings.js`, see example at `functions/settings.js.example`:

```
module.exports = {
    telegramBotToken: "1111111111:AAAAAAAABBBBBBBBCCCCCCCCDDDDDDDDEEE",
    telegramChatId: "-1001111111111",
    pingHost: "127.0.0.1",
    pingPort: 80,
    cron: 'every 2 minutes',
    region: 'europe-central2'
}
```

You need to have some public service on "{pingHost}:{pingPort}" which lambda may connect. If the service is not available, the lambda sends a light off notification. If the service becomes available, a light available notification will be sent.

Install JS dependencies:

```
$ cd functions
$ npm install
```

Upload lambda to Firebase:

```
firebase deploy
```

