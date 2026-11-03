// Einstellungen für euren Kalender. Nach dem Ändern speichern und auf GitHub hochladen.
window.KALENDER_CONFIG = {
  appName: 'Unser Kalender',

  // Namen, wie sie in der App erscheinen
  name1: 'Leon',
  name2: 'Person 2',

  // Aus Supabase: Knopf "Connect" oben im Projekt › Projekt-URL und Publishable key (sb_publishable_…).
  // Niemals den Secret key eintragen.
  // Leer lassen = App läuft nur im Browser (zum Ausprobieren).
  supabaseUrl: '',
  supabaseAnonKey: '',

  // Optional: Adresse der Abo-Funktion (siehe README, Schritt 5), z. B.
  // 'https://abcd1234.supabase.co/functions/v1/ics'
  icsFeedUrl: ''
};
