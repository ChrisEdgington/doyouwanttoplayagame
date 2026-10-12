// The WOPR database: targets, launch sites, factions, scenarios and the games menu.
// Populations are rough early-1980s metro figures in millions; this is a movie prop, not a model.
(function () {
  const W = window.WOPR;

  // [name, lat, lon, faction, population (M), ...aliases]
  const CITIES = [
    // United States
    ['NEW YORK', 40.71, -74.01, 'US', 16.0, 'nyc', 'new york city', 'manhattan'],
    ['LOS ANGELES', 34.05, -118.24, 'US', 11.5, 'la', 'l a'],
    ['CHICAGO', 41.88, -87.63, 'US', 7.9],
    ['PHILADELPHIA', 39.95, -75.17, 'US', 5.6],
    ['DETROIT', 42.33, -83.05, 'US', 4.4],
    ['WASHINGTON', 38.91, -77.04, 'US', 3.4, 'washington dc', 'dc', 'd c'],
    ['SAN FRANCISCO', 37.77, -122.42, 'US', 3.3, 'sf', 'bay area'],
    ['BOSTON', 42.36, -71.06, 'US', 3.6],
    ['HOUSTON', 29.76, -95.37, 'US', 3.0],
    ['DALLAS', 32.78, -96.8, 'US', 3.0],
    ['ATLANTA', 33.75, -84.39, 'US', 2.1],
    ['MIAMI', 25.76, -80.19, 'US', 2.6],
    ['SEATTLE', 47.61, -122.33, 'US', 2.1],
    ['LAS VEGAS', 36.17, -115.14, 'US', 0.5, 'vegas'],
    ['DENVER', 39.74, -104.99, 'US', 1.6],
    ['ST. LOUIS', 38.63, -90.2, 'US', 2.4, 'st louis', 'saint louis'],
    ['MINNEAPOLIS', 44.98, -93.27, 'US', 2.1],
    ['PHOENIX', 33.45, -112.07, 'US', 1.5],
    ['SAN DIEGO', 32.72, -117.16, 'US', 1.9],
    ['PITTSBURGH', 40.44, -79.99, 'US', 2.2],
    ['CLEVELAND', 41.5, -81.69, 'US', 1.9],
    ['NEW ORLEANS', 29.95, -90.07, 'US', 1.2],
    ['KANSAS CITY', 39.1, -94.58, 'US', 1.3],
    ['PORTLAND', 45.52, -122.68, 'US', 1.2],
    ['SALT LAKE CITY', 40.76, -111.89, 'US', 0.9, 'salt lake'],
    ['NORFOLK', 36.85, -76.29, 'US', 0.8],
    ['OMAHA', 41.26, -95.94, 'US', 0.6],
    ['COLORADO SPRINGS', 38.83, -104.82, 'US', 0.3, 'cheyenne mountain', 'norad'],
    ['HONOLULU', 21.31, -157.86, 'US', 0.8, 'hawaii', 'pearl harbor'],
    ['ANCHORAGE', 61.22, -149.9, 'US', 0.2, 'alaska'],
    ['SUNNYVALE', 37.37, -122.04, 'US', 0.1],
    // Soviet Union
    ['MOSCOW', 55.76, 37.62, 'SU', 8.4, 'moskva'],
    ['LENINGRAD', 59.93, 30.34, 'SU', 4.8, 'st petersburg', 'saint petersburg', 'petersburg'],
    ['KIEV', 50.45, 30.52, 'SU', 2.4, 'kyiv'],
    ['MINSK', 53.9, 27.57, 'SU', 1.4],
    ['GORKY', 56.3, 43.94, 'SU', 1.4, 'nizhny novgorod'],
    ['KUYBYSHEV', 53.2, 50.15, 'SU', 1.2, 'samara'],
    ['SVERDLOVSK', 56.84, 60.6, 'SU', 1.2, 'yekaterinburg', 'ekaterinburg'],
    ['NOVOSIBIRSK', 55.01, 82.93, 'SU', 1.4],
    ['TASHKENT', 41.3, 69.24, 'SU', 2.0],
    ['BAKU', 40.41, 49.87, 'SU', 1.6],
    ['KHARKOV', 49.99, 36.23, 'SU', 1.5, 'kharkiv'],
    ['ODESSA', 46.48, 30.72, 'SU', 1.1, 'odesa'],
    ['VLADIVOSTOK', 43.12, 131.89, 'SU', 0.6],
    ['MURMANSK', 68.97, 33.08, 'SU', 0.4],
    ['RIGA', 56.95, 24.11, 'SU', 0.9],
    ['TBILISI', 41.72, 44.79, 'SU', 1.1],
    ['VOLGOGRAD', 48.71, 44.51, 'SU', 1.0, 'stalingrad'],
    ['OMSK', 54.99, 73.37, 'SU', 1.1],
    ['KRASNOYARSK', 56.01, 92.89, 'SU', 0.9],
    ['IRKUTSK', 52.29, 104.3, 'SU', 0.6],
    ['KHABAROVSK', 48.48, 135.08, 'SU', 0.6],
    ['PETROPAVLOVSK', 53.02, 158.65, 'SU', 0.2, 'kamchatka'],
    ['ALMA-ATA', 43.24, 76.89, 'SU', 1.1, 'alma ata', 'almaty'],
    ['PERM', 58.01, 56.25, 'SU', 1.0],
    ['CHELYABINSK', 55.16, 61.4, 'SU', 1.1],
    ['DNEPROPETROVSK', 48.46, 35.05, 'SU', 1.1, 'dnipro'],
    ['KAZAN', 55.79, 49.12, 'SU', 1.0],
    ['ROSTOV', 47.24, 39.71, 'SU', 1.0, 'rostov on don'],
    ['ARKHANGELSK', 64.54, 40.54, 'SU', 0.4, 'archangel'],
    ['SEVASTOPOL', 44.62, 33.52, 'SU', 0.3],
    // Warsaw Pact
    ['WARSAW', 52.23, 21.01, 'WP', 1.6],
    ['EAST BERLIN', 52.52, 13.4, 'WP', 1.2, 'berlin'],
    ['PRAGUE', 50.08, 14.44, 'WP', 1.2],
    ['BUDAPEST', 47.5, 19.04, 'WP', 2.1],
    ['BUCHAREST', 44.43, 26.1, 'WP', 2.0],
    ['SOFIA', 42.7, 23.32, 'WP', 1.1],
    ['LEIPZIG', 51.34, 12.37, 'WP', 0.6],
    ['KRAKOW', 50.06, 19.94, 'WP', 0.7, 'cracow'],
    // NATO Europe
    ['LONDON', 51.51, -0.13, 'NATO', 6.8],
    ['PARIS', 48.86, 2.35, 'NATO', 8.7],
    ['BONN', 50.73, 7.1, 'NATO', 0.3],
    ['HAMBURG', 53.55, 9.99, 'NATO', 1.6],
    ['MUNICH', 48.14, 11.58, 'NATO', 1.3],
    ['FRANKFURT', 50.11, 8.68, 'NATO', 0.6],
    ['ROME', 41.9, 12.5, 'NATO', 2.8],
    ['MILAN', 45.46, 9.19, 'NATO', 1.6],
    ['BRUSSELS', 50.85, 4.35, 'NATO', 1.0],
    ['AMSTERDAM', 52.37, 4.9, 'NATO', 0.7],
    ['OSLO', 59.91, 10.75, 'NATO', 0.5],
    ['COPENHAGEN', 55.68, 12.57, 'NATO', 1.4],
    ['ISTANBUL', 41.01, 28.98, 'NATO', 2.8],
    ['ATHENS', 37.98, 23.73, 'NATO', 3.0],
    ['MADRID', 40.42, -3.7, 'NATO', 3.2],
    ['LISBON', 38.72, -9.14, 'NATO', 0.8],
    ['GLASGOW', 55.86, -4.25, 'NATO', 0.8, 'holy loch', 'faslane'],
    ['REYKJAVIK', 64.15, -21.94, 'NATO', 0.1, 'iceland', 'keflavik'],
    ['THULE', 76.53, -68.7, 'NATO', 0.01, 'greenland'],
    // Canada
    ['TORONTO', 43.65, -79.38, 'CA', 3.0],
    ['MONTREAL', 45.5, -73.57, 'CA', 2.8],
    ['VANCOUVER', 49.28, -123.12, 'CA', 1.2],
    ['OTTAWA', 45.42, -75.7, 'CA', 0.7],
    ['WINNIPEG', 49.9, -97.14, 'CA', 0.6],
    // Far East
    ['BEIJING', 39.9, 116.41, 'CN', 9.2, 'peking'],
    ['SHANGHAI', 31.23, 121.47, 'CN', 11.9],
    ['CHONGQING', 29.56, 106.55, 'CN', 6.0, 'chungking'],
    ['WUHAN', 30.59, 114.31, 'CN', 3.2],
    ['HARBIN', 45.8, 126.53, 'CN', 2.5],
    ['CANTON', 23.13, 113.26, 'CN', 3.2, 'guangzhou'],
    ['TOKYO', 35.68, 139.69, 'JP', 11.6],
    ['OSAKA', 34.69, 135.5, 'JP', 2.6],
    ['YOKOSUKA', 35.28, 139.67, 'JP', 0.4],
    ['SEOUL', 37.57, 126.98, 'KR', 8.4],
    ['PUSAN', 35.18, 129.08, 'KR', 3.2, 'busan'],
    ['PYONGYANG', 39.04, 125.76, 'KP', 1.3],
    ['TAIPEI', 25.03, 121.57, 'TW', 2.3],
    ['MANILA', 14.6, 120.98, 'PH', 5.9, 'subic bay'],
    ['HANOI', 21.03, 105.85, 'VN', 2.6],
    ['HAIPHONG', 20.84, 106.69, 'VN', 1.3],
    // South Asia / Middle East
    ['DELHI', 28.61, 77.21, 'IN', 6.2, 'new delhi'],
    ['BOMBAY', 19.08, 72.88, 'IN', 8.2, 'mumbai'],
    ['CALCUTTA', 22.57, 88.36, 'IN', 9.2, 'kolkata'],
    ['KARACHI', 24.86, 67.01, 'PK', 5.1],
    ['LAHORE', 31.55, 74.34, 'PK', 2.9],
    ['ISLAMABAD', 33.68, 73.05, 'PK', 0.2],
    ['TEL AVIV', 32.09, 34.78, 'IL', 1.0],
    ['JERUSALEM', 31.77, 35.21, 'IL', 0.4],
    ['HAIFA', 32.79, 34.99, 'IL', 0.4],
    ['DAMASCUS', 33.51, 36.28, 'SY', 1.2],
    ['BAGHDAD', 33.31, 44.36, 'IQ', 3.2],
    ['TEHRAN', 35.69, 51.39, 'IR', 5.4],
    ['CAIRO', 30.04, 31.24, 'EG', 7.3],
    ['RIYADH', 24.71, 46.68, 'SA', 0.8],
    ['TRIPOLI', 32.89, 13.19, 'LY', 0.6],
    // Americas
    ['HAVANA', 23.11, -82.37, 'CU', 1.9],
    ['MEXICO CITY', 19.43, -99.13, 'MX', 14.0],
  ];

  W.cities = [];
  const seen = new Set();
  for (const [name, lat, lon, faction, pop, ...aliases] of CITIES) {
    if (seen.has(name)) continue;
    seen.add(name);
    W.cities.push({ name, lat, lon, faction, pop, aliases: [W.norm(name), ...aliases.map(W.norm)] });
  }

  W.findCity = function (text) {
    const q = W.norm(text);
    if (!q) return null;
    return (
      W.cities.find((c) => c.aliases.includes(q)) ||
      W.cities.find((c) => c.aliases.some((a) => a.startsWith(q) && q.length >= 4)) ||
      null
    );
  };

  W.factions = {
    US: { name: 'UNITED STATES', bloc: 'WEST' },
    SU: { name: 'SOVIET UNION', bloc: 'EAST' },
    WP: { name: 'WARSAW PACT', bloc: 'EAST', patron: 'SU' },
    NATO: { name: 'NATO', bloc: 'WEST', patron: 'US' },
    CA: { name: 'CANADA', bloc: 'WEST', patron: 'US' },
    CN: { name: 'CHINA', bloc: 'NONE' },
    JP: { name: 'JAPAN', bloc: 'WEST', patron: 'US' },
    KR: { name: 'SOUTH KOREA', bloc: 'WEST', patron: 'US' },
    KP: { name: 'NORTH KOREA', bloc: 'EAST', patron: 'SU' },
    TW: { name: 'TAIWAN', bloc: 'WEST', patron: 'US' },
    PH: { name: 'PHILIPPINES', bloc: 'WEST', patron: 'US' },
    VN: { name: 'VIETNAM', bloc: 'EAST', patron: 'SU' },
    IN: { name: 'INDIA', bloc: 'NONE', patron: 'SU' },
    PK: { name: 'PAKISTAN', bloc: 'NONE', patron: 'US' },
    IL: { name: 'ISRAEL', bloc: 'WEST', patron: 'US' },
    SY: { name: 'SYRIA', bloc: 'EAST', patron: 'SU' },
    IQ: { name: 'IRAQ', bloc: 'NONE', patron: 'SU' },
    IR: { name: 'IRAN', bloc: 'NONE' },
    EG: { name: 'EGYPT', bloc: 'NONE', patron: 'US' },
    SA: { name: 'SAUDI ARABIA', bloc: 'WEST', patron: 'US' },
    LY: { name: 'LIBYA', bloc: 'EAST', patron: 'SU' },
    CU: { name: 'CUBA', bloc: 'EAST', patron: 'SU' },
    MX: { name: 'MEXICO', bloc: 'NONE' },
  };

  // Where each faction's missiles come from: silo fields, sub patrol boxes, bomber bases.
  W.launchSites = {
    US: [
      [48.23, -101.3], [47.95, -97.4], [47.5, -111.3], [41.14, -104.82], [38.73, -93.55], [44.15, -103.1],
      [62.0, -10.0], [58.0, -30.0], [45.0, -160.0], [36.0, -150.0], [71.0, 15.0],
    ],
    SU: [
      [62.71, 40.3], [54.03, 35.78], [51.67, 45.6], [50.75, 59.53], [55.3, 89.8], [52.5, 82.6], [53.05, 60.65],
      [73.0, 42.0], [76.0, 60.0], [38.0, -62.0], [42.0, -140.0], [50.0, 165.0],
    ],
    NATO: [[56.0, -6.0], [44.0, 5.5], [50.0, -4.0], [48.5, -5.5]],
    WP: [[52.2, 21.0], [52.5, 13.4], [50.1, 14.4]],
    CN: [[40.5, 88.0], [37.4, 97.4], [36.6, 101.8], [28.2, 102.0]],
    CA: [[49.0, -97.0]],
  };

  W.sitesFor = function (faction) {
    if (W.launchSites[faction]) return W.launchSites[faction];
    // Smaller players fire from their own cities.
    return W.cities.filter((c) => c.faction === faction).map((c) => [c.lat, c.lon]);
  };

  W.citiesOf = (factions) => W.cities.filter((c) => factions.includes(c.faction) && c.pop > 0);

  // Who is on whose side when the user picks a side in Global Thermonuclear War.
  W.blocs = {
    US: ['US', 'NATO', 'CA', 'JP', 'KR'],
    SU: ['SU', 'WP', 'CU', 'KP', 'VN'],
  };

  // The finale montage. Each one starts regional and escalates into the superpowers.
  W.scenarios = [
    { name: 'U.S. FIRST STRIKE', a: ['US'], b: ['SU'] },
    { name: 'USSR FIRST STRIKE', a: ['SU'], b: ['US'] },
    { name: 'NATO / WARSAW PACT', a: ['NATO'], b: ['WP'] },
    { name: 'FAR EAST STRATEGY', a: ['SU'], b: ['JP', 'KR'] },
    { name: 'U.S. SUBS LOST', a: ['SU'], b: ['US', 'NATO'] },
    { name: 'CHINESE ATTACK', a: ['CN'], b: ['SU'] },
    { name: 'MIDDLE EAST WAR', a: ['IL'], b: ['SY', 'IQ'] },
    { name: 'CUBAN PROVOCATION', a: ['CU'], b: ['US'] },
    { name: 'SEATO DECAPITATING', a: ['VN'], b: ['PH', 'TW'] },
    { name: 'INDIA / PAKISTAN', a: ['IN'], b: ['PK'] },
    { name: 'KOREAN ESCALATION', a: ['KP'], b: ['KR', 'JP'] },
    { name: 'BALTIC CONTAINMENT', a: ['WP'], b: ['NATO'] },
    { name: 'GREENLAND MANEUVER', a: ['SU'], b: ['NATO', 'CA'] },
    { name: 'CANADIAN THRUST', a: ['CA'], b: ['SU'] },
    { name: 'ATLANTIC HEAVY', a: ['US', 'NATO'], b: ['SU', 'WP'] },
    { name: 'PERSIAN GULF', a: ['IR'], b: ['IQ', 'SA'] },
    { name: 'SINO-SOVIET BORDER', a: ['SU'], b: ['CN'] },
    { name: 'MEDITERRANEAN SPLIT', a: ['LY'], b: ['NATO', 'EG'] },
    { name: 'TAIWAN STRAIT', a: ['CN'], b: ['TW', 'US'] },
    { name: 'ARCTIC THEATER', a: ['US', 'CA'], b: ['SU'] },
    { name: 'PACIFIC RIM', a: ['SU', 'VN'], b: ['JP', 'PH', 'US'] },
    { name: 'EUROPEAN DECAPITATION', a: ['SU', 'WP'], b: ['NATO'] },
    { name: 'LIMITED COUNTERFORCE', a: ['US'], b: ['SU'] },
    { name: 'BERLIN BLOCKADE II', a: ['WP'], b: ['NATO', 'US'] },
    { name: 'ACCIDENTAL LAUNCH', a: ['SU'], b: ['US'] },
  ];

  // As listed on Joshua's menu. `playable` maps to a handler in joshua.js.
  W.games = [
    { name: "FALKEN'S MAZE" },
    { name: 'BLACK JACK', aliases: ['blackjack', '21', 'twenty one'] },
    { name: 'GIN RUMMY', aliases: ['rummy', 'gin'] },
    { name: 'HEARTS' },
    { name: 'BRIDGE' },
    { name: 'CHECKERS', aliases: ['draughts'] },
    { name: 'CHESS', play: 'chess' },
    { name: 'POKER' },
    { name: 'TIC-TAC-TOE', play: 'ttt', aliases: ['tic tac toe', 'tictactoe', 'noughts and crosses', 'ttt'] },
    { name: 'FIGHTER COMBAT' },
    { name: 'GUERRILLA ENGAGEMENT', aliases: ['guerilla engagement'] },
    { name: 'DESERT WARFARE' },
    { name: 'AIR-TO-GROUND ACTIONS', aliases: ['air to ground actions', 'air to ground'] },
    { name: 'THEATERWIDE TACTICAL WARFARE', aliases: ['tactical warfare'] },
    { name: 'THEATERWIDE BIOTOXIC AND CHEMICAL WARFARE', aliases: ['biotoxic', 'chemical warfare'] },
    {
      name: 'GLOBAL THERMONUCLEAR WAR',
      play: 'gtw',
      aliases: ['thermonuclear war', 'global thermonuclear', 'nuclear war', 'gtw', 'thermonuclear', 'global war', 'world war 3', 'ww3'],
    },
  ];

  W.findGame = function (text) {
    const q = ' ' + W.norm(text) + ' ';
    let best = null;
    for (const g of W.games) {
      for (const alias of [W.norm(g.name), ...(g.aliases || []).map(W.norm)]) {
        if (q.includes(' ' + alias + ' ') && (!best || alias.length > best.len)) best = { game: g, len: alias.length };
      }
    }
    return best && best.game;
  };
})();
