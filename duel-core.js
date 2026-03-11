(function () {
  function isDuelOver(p1, p2) {
    if (!p1 || !p2) return false;
    return p1.lives <= 0 || p2.lives <= 0;
  }

  function resolveDuelWinner(p1, p2) {
    if (!isDuelOver(p1, p2)) return { winner: "none" };

    const p1Down = p1.lives <= 0;
    const p2Down = p2.lives <= 0;

    if (p1Down && p2Down) {
      if (p1.score > p2.score) return { winner: "p1" };
      if (p2.score > p1.score) return { winner: "p2" };
      return { winner: "tie" };
    }

    if (p1Down) return { winner: "p2" };
    return { winner: "p1" };
  }

  window.ipv6ggDuelCore = {
    isDuelOver,
    resolveDuelWinner
  };
})();
