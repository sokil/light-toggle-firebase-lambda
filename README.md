# Light Toggle Firebase Lambda

Notifies to Telegram on toggle electricity by pinging some device

## Configuration

Create Firebase project at https://firebase.google.com/. Also enable "functions" and "firestore".

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

Configure Telegram bot parameters and host for pinging at `functions/settings.js`, see example at `functions/settings.js.example`.

Install JS dependencies:

```
$ cd functions
$ npm install
```

Upload lambda to Firebase:

```
firebase deploy
```

