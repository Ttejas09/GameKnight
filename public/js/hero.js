(function () {
  var diceButton = document.getElementById("hero-dice-btn");

  var heroGames = [
    "cyberpunk",
    "battlefield",
    "lis",
    "mariokart",
    "bioshockinfinite",
    "anno",
    "rdr",
    "horizon",
    "gtav",
    "skyrim",
    "warframe",
    "minecraft",
    "riseofthetombraider",
    "metro",
    "terraria",
    "rocketleague",
    "thewitcher",
    "hitman",
    "fallout",
    "gtasanandreas",
    "golfwithyourfriends",
    "heavyrain",
    "dota",
    "portal2",
    "civilization",
    "godofwar",
    "fifa",
    "halflife",
    "twd",
    "crusaderkings",
    "csgo",
    "detroit",
    "tombraider"
  ];

  if (diceButton) {
    diceButton.addEventListener("click", function () {
      var randomIndex = Math.floor(Math.random() * heroGames.length);
      var targetSlug = heroGames[randomIndex];
      window.location.href = "game.html?id=" + encodeURIComponent(targetSlug);
    });
  }
})();
