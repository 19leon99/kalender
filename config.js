// Einstellungen für euren Kalender. Nach dem Ändern speichern und auf GitHub hochladen.
window.KALENDER_CONFIG = {
  appName: 'Unser Kalender',

  // Namen, wie sie in der App erscheinen
  name1: 'Leon',
  name2: 'Laura',

  // Firebase-Projekt (dasselbe wie bei der To-do-Liste).
  // Firebase-Konsole › Projekteinstellungen › Allgemein › Meine Apps › Web-App › firebaseConfig.
  // Diese Werte dürfen öffentlich im Code stehen. Geschützt wird über die Regeln in firestore.rules.
  // Leer lassen = App läuft nur im Browser (zum Ausprobieren).
  firebase: {
    apiKey: 'AIzaSyDK39FbHLiLim_wv9Y69B6DSupEOA4FZeU',
    authDomain: 'to-do-3cbe0.firebaseapp.com',
    projectId: 'to-do-3cbe0',
    appId: '1:520898755136:web:9e7965d8971346e0bd3da5'
  }
};
