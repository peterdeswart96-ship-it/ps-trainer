// Klassiek script (geen module) voor in <head>: zet het opgeslagen thema voor de eerste weergave,
// zodat er geen flits van het verkeerde thema is. De rest staat in theme.js. De sleutel moet gelijk
// zijn aan THEMA_SLEUTEL in theme.js. Zonder (werkende) opslag doet dit script niets.
(function () {
  try {
    var thema = localStorage.getItem('ps-trainer-thema');
    if (thema === 'light' || thema === 'dark') document.documentElement.setAttribute('data-theme', thema);
  } catch (e) { /* geen opslag: het systeemthema blijft gelden */ }
})();
