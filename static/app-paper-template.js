(() => {
  "use strict";

  const APP_VERSION = "v33.0-student-bot-fix";
  const $ = (id) => document.getElementById(id);

  const STORAGE = {
    p1: "xo-paper-player-1",
    p2: "xo-paper-player-2",
    sound: "xo-paper-sound",
    vibration: "xo-paper-vibration",
    theme: "xo-paper-theme",
    lang: "xo-paper-lang",
    stats: "xo-paper-local-stats",
    points: "xo-paper-points",
    owned: "xo-paper-owned-items",
    equippedSkin: "xo-paper-equipped-skin",
    equippedEffect: "xo-paper-equipped-effect",
    equippedCelebration: "xo-paper-equipped-celebration"
  };

  const TXT = {
    PL: {
      online:"ONLINE", local:"LOKALNIE", bot:"BOT",
      classic:"KLASYCZNY", student:"STUDENCKI",
      classicSub:"Zasady, które<br>znasz i lubisz.",
      studentSub:"Nie ma zasad.<br>Są tylko możliwości.",
      special:"ZASADY SPECJALNE ⓘ",
      chaos:"CHAOS", firstBlood:"FIRST<br>BLOOD", sudden:"NAGŁA<br>ŚMIERĆ", alternate:"ZMIENIAJ<br>ZACZYNAJĄCEGO",
      roomPlaceholder:"Kod pokoju", join:"DOŁĄCZ",
      settings:"USTAWIENIA", instructions:"INSTRUKCJA",
      ranking:"RANKING", profile:"PROFIL", friends:"ZNAJOMI", rewards:"NAGRODY", shop:"SKLEP",
      settingsTitle:"USTAWIENIA", profileTitle:"PROFIL", rankingTitle:"RANKING", rewardsTitle:"NAGRODY", shopTitle:"SKLEP", friendsTitle:"ZNAJOMI",
      save:"ZAPISZ USTAWIENIA", reset:"RESETUJ DANE LOKALNE",
      p1:"Nazwa Gracza 1", p2:"Nazwa Gracza 2", defaultX:"Domyślnie X", defaultO:"Domyślnie O",
      language:"Język", theme:"Motyw", sound:"Dźwięki", vibration:"Wibracje",
      themePaper:"Papierowy", themeClean:"Czysty", themeNeon:"Neon",
      saved:"Zapisano ustawienia.", resetDone:"Dane lokalne zresetowane.",
      profileSub:"Profil lokalny — bez logowania",
      games:"GRY", wins:"WYGRANE", draws:"REMISY", version:"WERSJA",
      rankingInfo:"Ranking lokalny zapisuje wyniki na tym urządzeniu. Pełne automatyczne zapisywanie po grach dopracujemy przy spięciu z logiką wyniku.",
      friendsInfo:"Tu dodamy publiczne pokoje 1/2, zapraszanie linkiem i później konta znajomych.",
      shopInfo:"Sklep będzie miejscem na skórki za punkty. Pomysły: wygląd X/O, motyw planszy, efekt kładzenia znaku, cieszynka po wygranej i efekty Chaosu."
    },
    ENG: {
      online:"ONLINE", local:"LOCAL", bot:"BOT",
      classic:"CLASSIC", student:"STUDENT",
      classicSub:"Rules you<br>already know.",
      studentSub:"No rules.<br>Only possibilities.",
      special:"SPECIAL RULES ⓘ",
      chaos:"CHAOS", firstBlood:"FIRST<br>BLOOD", sudden:"SUDDEN<br>DEATH", alternate:"ALTERNATE<br>STARTER",
      roomPlaceholder:"Room code", join:"JOIN",
      settings:"SETTINGS", instructions:"RULES",
      ranking:"RANKING", profile:"PROFILE", friends:"FRIENDS", rewards:"REWARDS", shop:"SHOP",
      settingsTitle:"SETTINGS", profileTitle:"PROFILE", rankingTitle:"RANKING", rewardsTitle:"REWARDS", shopTitle:"SHOP", friendsTitle:"FRIENDS",
      save:"SAVE SETTINGS", reset:"RESET LOCAL DATA",
      p1:"Player 1 name", p2:"Player 2 name", defaultX:"Default X", defaultO:"Default O",
      language:"Language", theme:"Theme", sound:"Sounds", vibration:"Vibrations",
      themePaper:"Paper", themeClean:"Clean", themeNeon:"Neon",
      saved:"Settings saved.", resetDone:"Local data reset.",
      profileSub:"Local profile — no login",
      games:"GAMES", wins:"WINS", draws:"DRAWS", version:"VERSION",
      rankingInfo:"Local ranking stores results on this device. Full automatic match saving will be connected with the game result logic.",
      friendsInfo:"Here we will add public rooms 1/2, invite links, and later friend accounts.",
      shopInfo:"The shop will hold skins bought with points: X/O shapes, board themes, placement effects, win celebrations, and Chaos effects."
    }
  };

  const INSTRUCTIONS = {
    PL: {
      classic:["Klasyczny", "KLASYCZNY\n\nZwykłe kółko i krzyżyk na jednej planszy 3x3.\n\nCel: ułóż 3 swoje symbole w jednej linii: poziomo, pionowo albo po skosie."],
      student:["Studencki", "TRYB STUDENCKI\n\nGra składa się z 9 małych plansz.\n\nPole, które klikniesz, wskazuje planszę dla kolejnego gracza.\n\nCałą grę wygrywa osoba, która przejmie 3 małe plansze w jednej linii."],
      chaos:["Chaos", "TRYB CHAOS\n\nDziała tylko w trybie Studenckim. Chaos uruchamia się losowo co 30–60 sekund.\n\nBrutalny Chaos może zamienić plansze, usunąć symbol albo przerzucić aktywną planszę."],
      firstBlood:["Pierwsza krew", "PIERWSZA KREW\n\nPierwszy gracz, który przejmie małą planszę, dostaje jednorazową moc.\n\nMoc pozwala zamienić miejscami dwie niepuste małe plansze."],
      sudden:["Nagła śmierć", "NAGŁA ŚMIERĆ\n\nGracz ma ograniczony czas na ruch: 5, 10 albo 15 sekund.\n\nJeśli czas minie, gracz traci akcję, a tura przechodzi dalej."],
      online:["Online / pokoje", "ONLINE I POKOJE\n\nAktualnie możesz utworzyć pokój i zaprosić drugą osobę linkiem albo kodem.\n\nPlan: publiczne pokoje 1/2, lista pokoi, szybkie szukanie meczu, matchmaking i czat w trakcie gry."]
    },
    ENG: {
      classic:["Classic", "CLASSIC\n\nStandard tic-tac-toe on one 3x3 board.\n\nGoal: place 3 of your symbols in one row, column, or diagonal."],
      student:["Student", "STUDENT MODE\n\nThe game uses 9 small boards.\n\nThe cell you choose sends the next player to the matching small board."],
      chaos:["Chaos", "CHAOS MODE\n\nWorks in Student mode. Chaos triggers randomly every 30–60 seconds.\n\nBrutal Chaos can swap boards, remove a symbol, or reroute the active board."],
      firstBlood:["First Blood", "FIRST BLOOD\n\nThe first player to capture a small board receives a one-time power.\n\nThe power swaps two non-empty small boards."],
      sudden:["Sudden Death", "SUDDEN DEATH\n\nPlayers have limited time per move: 5, 10, or 15 seconds.\n\nIf time runs out, the player loses the action and the turn moves on."],
      online:["Online / rooms", "ONLINE AND ROOMS\n\nCurrently you can create a room and invite another player with a link or code.\n\nPlanned: public rooms 1/2, room list, quick match search, matchmaking, and in-game chat."]
    }
  };

  function lang(){ return localStorage.getItem(STORAGE.lang) || "PL"; }
  function t(key){ return (TXT[lang()] || TXT.PL)[key] || TXT.PL[key] || key; }

  function clickOriginal(id){ const el=$(id); if(el) el.click(); }

  function rememberMenuChoice(id, value){
    if(id === "playMode"){
      window.__xoSelectedPlayMode = value;
      try { localStorage.setItem("xo-selected-play-mode", value); } catch(e) {}
    }
    if(id === "versionMode"){
      window.__xoSelectedVersionMode = value;
      try { localStorage.setItem("xo-selected-version-mode", value); } catch(e) {}
    }
  }

  function setSelect(id,value){
    const el=$(id);
    if(!el) return;
    el.value=value;
    rememberMenuChoice(id, value);
    el.dispatchEvent(new Event("change",{bubbles:true}));
    refreshActiveStates();
  }

  function syncPaperSelectionToOriginalControls(){
    const activePlay = document.querySelector("[data-paper-play].active")?.dataset?.paperPlay || window.__xoSelectedPlayMode;
    const activeVersion = document.querySelector("[data-paper-version].active")?.dataset?.paperVersion || window.__xoSelectedVersionMode;

    if(activePlay && $("playMode") && $("playMode").value !== activePlay){
      $("playMode").value = activePlay;
      $("playMode").dispatchEvent(new Event("change",{bubbles:true}));
    }

    if(activeVersion && $("versionMode") && $("versionMode").value !== activeVersion){
      $("versionMode").value = activeVersion;
      $("versionMode").dispatchEvent(new Event("change",{bubbles:true}));
    }

    refreshActiveStates();
  }

  window.__xoSyncMenuSelection = syncPaperSelectionToOriginalControls;

  function setCheckbox(id,checked){
    const el=$(id);
    if(!el) return;
    el.checked=checked;
    el.dispatchEvent(new Event("change",{bubbles:true}));
    refreshActiveStates();
  }

  function toggleCheckbox(id){
    const el=$(id);
    if(el) setCheckbox(id,!el.checked);
  }

  function toast(msg){
    const el=$("toast");
    if(!el){ alert(msg); return; }
    el.textContent=msg;
    el.classList.remove("hidden");
    clearTimeout(window.__paperToastTimeout);
    window.__paperToastTimeout=setTimeout(()=>el.classList.add("hidden"),1800);
  }

  function applyTheme(){
    const theme=localStorage.getItem(STORAGE.theme)||"papierowy";
    document.body.classList.remove("theme-paper","theme-clean","theme-neon");
    if(theme==="czysty") document.body.classList.add("theme-clean");
    else if(theme==="neon") document.body.classList.add("theme-neon");
    else document.body.classList.add("theme-paper");
  }

  function refreshActiveStates(){
    const play=$("playMode")?.value||"online";
    const version=$("versionMode")?.value||"classic";
    document.querySelectorAll("[data-paper-play]").forEach((btn)=>btn.classList.toggle("active",btn.dataset.paperPlay===play));
    document.querySelectorAll("[data-paper-version]").forEach((btn)=>btn.classList.toggle("active",btn.dataset.paperVersion===version));
    const map={chaos:$("chaosMode")?.checked,firstBlood:$("firstBloodMode")?.checked,sudden:$("suddenDeath")?.checked,alternate:$("alternateStarter")?.checked};
    document.querySelectorAll("[data-paper-special]").forEach((btn)=>btn.classList.toggle("active",!!map[btn.dataset.paperSpecial]));
  }

  function updatePaperNames(){
    const p1=localStorage.getItem(STORAGE.p1)||(lang()==="ENG"?"Player 1":"Gracz 1");
    const p2=localStorage.getItem(STORAGE.p2)||(lang()==="ENG"?"Player 2":"Gracz 2");
    const scores=document.querySelectorAll(".topbar .score");
    if(scores[0]) scores[0].childNodes[0].nodeValue=p1+": ";
    if(scores[1]) scores[1].childNodes[0].nodeValue=p2+": ";
  }

  function updatePaperTexts(){
    const root=$("paperTemplateRoot");
    if(!root) return;
    root.querySelector('[data-paper-play="online"]').innerHTML="👥 "+t("online");
    root.querySelector('[data-paper-play="local"]').innerHTML="🏠 "+t("local");
    root.querySelector('[data-paper-play="bot"]').innerHTML="🤖 "+t("bot");
    root.querySelector('[data-paper-version="classic"] h3').textContent=t("classic");
    root.querySelector('[data-paper-version="classic"] p').innerHTML=t("classicSub");
    root.querySelector('[data-paper-version="student"] h3').textContent=t("student");
    root.querySelector('[data-paper-version="student"] p').innerHTML=t("studentSub");
    root.querySelector(".paper-ribbon-title").textContent=t("special");
    root.querySelector('[data-paper-special="chaos"] span:first-child').innerHTML=t("chaos");
    root.querySelector('[data-paper-special="firstBlood"] span:first-child').innerHTML=t("firstBlood");
    root.querySelector('[data-paper-special="sudden"] span:first-child').innerHTML=t("sudden");
    root.querySelector('[data-paper-special="alternate"] span:first-child').innerHTML=t("alternate");
    $("paperRoomCodeInput")?.setAttribute("placeholder",t("roomPlaceholder"));
    if($("paperJoinBtn")) $("paperJoinBtn").textContent=t("join");
    if($("paperSettingsBtn")) $("paperSettingsBtn").children[1].textContent=t("settings");
    if($("paperInstructionsBtn")) $("paperInstructionsBtn").children[1].textContent=t("instructions");
    const nav={ranking:"ranking",profil:"profile",znajomi:"friends",nagrody:"rewards",sklep:"shop"};
    Object.entries(nav).forEach(([key,textKey])=>{
      const btn=document.querySelector(`[data-nav="${key}"] span:last-child`);
      if(btn) btn.textContent=t(textKey);
    });
    updatePaperNames();
  }

  function makePaperModal(id,title,bodyHtml){
    let modal=$(id);
    if(modal) modal.remove();
    modal=document.createElement("div");
    modal.id=id;
    modal.className="paper-modal";
    modal.innerHTML=`<div class="paper-modal-card"><div class="paper-modal-handle"></div><div class="paper-modal-head"><h2 class="paper-modal-title">${title}</h2><button type="button" class="paper-close" data-paper-close>×</button></div>${bodyHtml}</div>`;
    document.body.appendChild(modal);
    modal.querySelector("[data-paper-close]")?.addEventListener("click",()=>modal.classList.add("hidden"));
    modal.addEventListener("click",(e)=>{ if(e.target===modal) modal.classList.add("hidden"); });
    return modal;
  }

  function showPaperSettings(){
    const p1=localStorage.getItem(STORAGE.p1)||(lang()==="ENG"?"Player 1":"Gracz 1");
    const p2=localStorage.getItem(STORAGE.p2)||(lang()==="ENG"?"Player 2":"Gracz 2");
    const sound=localStorage.getItem(STORAGE.sound)==="1";
    const vibration=localStorage.getItem(STORAGE.vibration)==="1";
    const theme=localStorage.getItem(STORAGE.theme)||"papierowy";
    const modal=makePaperModal("paperSettingsModal",t("settingsTitle"),`
      <div class="paper-form-grid">
        <div class="paper-setting-row"><span class="paper-setting-icon">👤</span><div><strong>${t("p1")}</strong><small>${t("defaultX")}</small></div><input id="paperSetP1" class="paper-mini-input" maxlength="16" value="${p1}"></div>
        <div class="paper-setting-row"><span class="paper-setting-icon">👥</span><div><strong>${t("p2")}</strong><small>${t("defaultO")}</small></div><input id="paperSetP2" class="paper-mini-input" maxlength="16" value="${p2}"></div>
        <div class="paper-setting-row"><span class="paper-setting-icon">🌍</span><div><strong>${t("language")}</strong><small>PL / ENG</small></div><select id="paperLangSelect" class="paper-mini-select"><option value="PL">Polski</option><option value="ENG">English</option></select></div>
        <div class="paper-setting-row"><span class="paper-setting-icon">🎨</span><div><strong>${t("theme")}</strong><small>${t("themePaper")} / ${t("themeClean")} / ${t("themeNeon")}</small></div><select id="paperThemeSelect" class="paper-mini-select"><option value="papierowy">${t("themePaper")}</option><option value="czysty">${t("themeClean")}</option><option value="neon">${t("themeNeon")}</option></select></div>
        <div class="paper-setting-row"><span class="paper-setting-icon">🔊</span><div><strong>${t("sound")}</strong><small>ON / OFF</small></div><button type="button" id="paperSoundToggle" class="paper-toggle ${sound?"active":""}"></button></div>
        <div class="paper-setting-row"><span class="paper-setting-icon">📳</span><div><strong>${t("vibration")}</strong><small>ON / OFF</small></div><button type="button" id="paperVibrationToggle" class="paper-toggle ${vibration?"active":""}"></button></div>
      </div>
      <button type="button" id="paperSaveSettings" class="paper-action-btn">${t("save")}</button>
      <button type="button" id="paperResetLocal" class="paper-secondary-btn">${t("reset")}</button>
    `);
    $("paperLangSelect").value=lang();
    $("paperThemeSelect").value=theme;
    $("paperSoundToggle")?.addEventListener("click",()=>$("paperSoundToggle").classList.toggle("active"));
    $("paperVibrationToggle")?.addEventListener("click",()=>{const b=$("paperVibrationToggle");b.classList.toggle("active");if(b.classList.contains("active")&&navigator.vibrate)navigator.vibrate(35);});
    $("paperSaveSettings")?.addEventListener("click",()=>{
      localStorage.setItem(STORAGE.p1,$("paperSetP1")?.value.trim()||(lang()==="ENG"?"Player 1":"Gracz 1"));
      localStorage.setItem(STORAGE.p2,$("paperSetP2")?.value.trim()||(lang()==="ENG"?"Player 2":"Gracz 2"));
      localStorage.setItem(STORAGE.lang,$("paperLangSelect")?.value||"PL");
      localStorage.setItem(STORAGE.theme,$("paperThemeSelect")?.value||"papierowy");
      localStorage.setItem(STORAGE.sound,$("paperSoundToggle")?.classList.contains("active")?"1":"0");
      localStorage.setItem(STORAGE.vibration,$("paperVibrationToggle")?.classList.contains("active")?"1":"0");
      applyTheme();
      updatePaperTexts();
      modal.classList.add("hidden");
      toast(t("saved"));
    });
    $("paperResetLocal")?.addEventListener("click",()=>{
      Object.values(STORAGE).forEach((k)=>localStorage.removeItem(k));
      applyTheme();
      updatePaperTexts();
      modal.classList.add("hidden");
      toast(t("resetDone"));
    });
  }

  function getStats(){
    try{return JSON.parse(localStorage.getItem(STORAGE.stats)||"{}");}
    catch(e){return {};}
  }

  function saveStats(s){ localStorage.setItem(STORAGE.stats,JSON.stringify(s)); }

  function addTestWin(player){
    const s=getStats();
    s.games=(s.games||0)+1;
    if(player==="draw") s.draws=(s.draws||0)+1;
    else { s.wins=(s.wins||0)+1; s[player]=(s[player]||0)+1; }
    if($("chaosMode")?.checked) s.chaos=(s.chaos||0)+1;
    if($("firstBloodMode")?.checked) s.firstBlood=(s.firstBlood||0)+1;
    saveStats(s);
  }

  function showPaperProfile(){
    const s=getStats();
    const p1=localStorage.getItem(STORAGE.p1)||(lang()==="ENG"?"Player 1":"Gracz 1");
    makePaperModal("paperProfileModal",t("profileTitle"),`
      <div class="paper-profile-hero"><div class="paper-profile-avatar">XO</div><div><div class="paper-profile-name">${p1}</div><div class="paper-profile-sub">${t("profileSub")}</div></div></div>
      <div class="paper-stats-grid">
        <div class="paper-stat-card"><strong>${s.games||0}</strong><span>${t("games")}</span></div>
        <div class="paper-stat-card"><strong>${s.wins||0}</strong><span>${t("wins")}</span></div>
        <div class="paper-stat-card"><strong>${s.draws||0}</strong><span>${t("draws")}</span></div>
        <div class="paper-stat-card"><strong>${s.chaos||0}</strong><span>CHAOS</span></div>
        <div class="paper-stat-card"><strong>${s.firstBlood||0}</strong><span>FIRST BLOOD</span></div>
        <div class="paper-stat-card"><strong>v24</strong><span>${t("version")}</span></div>
      </div>
      <button type="button" id="paperAddTestWin" class="paper-secondary-btn">+ TEST WIN</button>
    `);
    $("paperAddTestWin")?.addEventListener("click",()=>{addTestWin("p1");$("paperProfileModal")?.remove();showPaperProfile();});
  }

  function showRanking(){
    const s=getStats();
    const p1=localStorage.getItem(STORAGE.p1)||(lang()==="ENG"?"Player 1":"Gracz 1");
    const p2=localStorage.getItem(STORAGE.p2)||(lang()==="ENG"?"Player 2":"Gracz 2");
    const rows=[[p1,s.p1||0],[p2,s.p2||0],["Bot",s.bot||0]].sort((a,b)=>b[1]-a[1]);
    makePaperModal("paperRankingModal",t("rankingTitle"),`
      <div class="paper-ranking-list">
        ${rows.map((r,i)=>`<div class="paper-ranking-row"><span class="paper-ranking-place">${i+1}</span><span>${r[0]}</span><span class="paper-ranking-score">${r[1]} pkt</span></div>`).join("")}
      </div>
      <div class="paper-instruction-content" style="min-height:auto;margin-top:10px">${t("rankingInfo")}</div>
      <button type="button" id="paperRankingTestP1" class="paper-secondary-btn">+ TEST ${p1}</button>
      <button type="button" id="paperRankingTestP2" class="paper-secondary-btn">+ TEST ${p2}</button>
    `);
    $("paperRankingTestP1")?.addEventListener("click",()=>{addTestWin("p1");$("paperRankingModal")?.remove();showRanking();});
    $("paperRankingTestP2")?.addEventListener("click",()=>{addTestWin("p2");$("paperRankingModal")?.remove();showRanking();});
  }

  function showInstructions(defaultTab="classic"){
    const data=INSTRUCTIONS[lang()]||INSTRUCTIONS.PL;
    const modal=makePaperModal("paperInstructionsModal",t("instructions"),`
      <div class="paper-tabs-instructions">
        ${Object.entries(data).map(([k,v])=>`<button type="button" class="paper-instruction-tab" data-instruction-tab="${k}">${v[0]}</button>`).join("")}
      </div>
      <div id="paperInstructionContent" class="paper-instruction-content"></div>
    `);
    function setTab(k){
      modal.querySelectorAll("[data-instruction-tab]").forEach((b)=>b.classList.toggle("active",b.dataset.instructionTab===k));
      $("paperInstructionContent").textContent=(data[k]||data.classic)[1];
    }
    modal.querySelectorAll("[data-instruction-tab]").forEach((b)=>b.addEventListener("click",()=>setTab(b.dataset.instructionTab)));
    setTab(defaultTab);
  }

  function simplePanel(id,title,text){
    makePaperModal(id,title,`<div class="paper-instruction-content">${text}</div>`);
  }

  function showRewards(){
    makePaperModal("paperRewardsModal",t("rewardsTitle"),`
      <div class="paper-badge-row">
        <div class="paper-badge"><span class="paper-badge-icon">🏆</span>${lang()==="ENG"?"First win":"Pierwsza wygrana"}</div>
        <div class="paper-badge"><span class="paper-badge-icon">🩸</span>First Blood</div>
        <div class="paper-badge"><span class="paper-badge-icon">🌀</span>Chaos</div>
        <div class="paper-badge"><span class="paper-badge-icon">🤖</span>${lang()==="ENG"?"Bot win":"Wygrana z botem"}</div>
        <div class="paper-badge"><span class="paper-badge-icon">💀</span>Sudden Death</div>
        <div class="paper-badge"><span class="paper-badge-icon">🔥</span>${lang()==="ENG"?"Win streak":"Seria zwycięstw"}</div>
      </div>
    `);
  }


  function getPoints(){
    return Number(localStorage.getItem(STORAGE.points) || "1250");
  }

  function setPoints(value){
    localStorage.setItem(STORAGE.points, String(Math.max(0, Number(value) || 0)));
    updatePointsPill();
    observeWinCelebration();
    observeLiveBoardCompatibility();
  }

  function getOwned(){
    try {
      return JSON.parse(localStorage.getItem(STORAGE.owned) || '["skin-default","effect-none"]');
    } catch(e) {
      return ["skin-default","effect-none"];
    }
  }

  function setOwned(items){
    localStorage.setItem(STORAGE.owned, JSON.stringify(Array.from(new Set(items))));
  }

  const SHOP_ITEMS = [
    {id:"skin-default", category:"patterns", type:"skin", price:0, icon:"X O", pl:"Klasyczne X/O", eng:"Classic X/O", descPL:"Domyślny wygląd znaków.", descENG:"Default symbol style."},
    {id:"skin-bold-xo", category:"patterns", type:"skin", price:250, icon:"𝑿 𝑶", pl:"Grube znaki", eng:"Bold signs", descPL:"Mocniejsze, bardziej komiksowe X i O.", descENG:"Bolder comic-like X and O."},
    {id:"skin-student", category:"patterns", type:"skin", price:450, icon:"✘ ◎", pl:"Studenckie znaki", eng:"Student signs", descPL:"Kolory i styl pod tryb Studencki.", descENG:"Colors and style for Student mode."},
    {id:"skin-neon-signs", category:"patterns", type:"skin", price:700, icon:"✕ ○", pl:"Neonowe znaki", eng:"Neon signs", descPL:"Świecące X/O do motywu Neon.", descENG:"Glowing X/O for Neon theme."},

    {id:"effect-none", category:"effects", type:"effect", price:0, icon:"—", pl:"Bez efektu", eng:"No effect", descPL:"Czyste położenie znaku.", descENG:"Clean placement."},
    {id:"effect-pop", category:"effects", type:"effect", price:300, icon:"💥", pl:"Pop", eng:"Pop", descPL:"Szybkie odbicie przy postawieniu.", descENG:"Quick bounce when placing."},
    {id:"effect-stamp", category:"effects", type:"effect", price:400, icon:"🔖", pl:"Stempel", eng:"Stamp", descPL:"Znak pojawia się jak odcisk stempla.", descENG:"Symbol appears like a stamp."},
    {id:"effect-spark", category:"effects", type:"effect", price:550, icon:"✨", pl:"Iskra", eng:"Spark", descPL:"Krótki błysk przy położeniu znaku.", descENG:"Short flash when placing."},

    {id:"celebration-paper", category:"celebrations", type:"celebration", price:0, icon:"🎉", pl:"Papierowa cieszynka", eng:"Paper celebration", descPL:"Domyślna cieszynka po wygranej.", descENG:"Default win celebration."},
    {id:"celebration-confetti", category:"celebrations", type:"celebration", price:450, icon:"🎊", pl:"Konfetti", eng:"Confetti", descPL:"Spadające konfetti po wygranej.", descENG:"Falling confetti after a win."},
    {id:"celebration-firework", category:"celebrations", type:"celebration", price:650, icon:"🎆", pl:"Fajerwerki", eng:"Firework", descPL:"Mocniejsza cieszynka w stylu neon.", descENG:"Stronger neon-style win celebration."},
    {id:"celebration-stamp", category:"celebrations", type:"celebration", price:500, icon:"🏅", pl:"Stempel zwycięstwa", eng:"Victory stamp", descPL:"Wygrana jak przybity stempel.", descENG:"Win shown as a stamped badge."}
  ];

  const REWARDS = [
    {id:"first_win", icon:"🏆", pl:"Pierwsza wygrana", eng:"First win", descPL:"Wygraj pierwszą grę.", descENG:"Win your first game.", check:(s)=> (s.wins||0) >= 1},
    {id:"five_games", icon:"🎮", pl:"5 gier", eng:"5 games", descPL:"Rozegraj 5 gier.", descENG:"Play 5 games.", check:(s)=> (s.games||0) >= 5},
    {id:"chaos_player", icon:"🌀", pl:"Chaos player", eng:"Chaos player", descPL:"Zagraj z Chaosem.", descENG:"Play with Chaos.", check:(s)=> (s.chaos||0) >= 1},
    {id:"first_blood", icon:"🩸", pl:"Pierwsza krew", eng:"First Blood", descPL:"Użyj trybu Pierwsza krew.", descENG:"Use First Blood mode.", check:(s)=> (s.firstBlood||0) >= 1},
    {id:"rich", icon:"💰", pl:"Kolekcjoner", eng:"Collector", descPL:"Zdobądź 1000 punktów.", descENG:"Collect 1000 points.", check:()=> getPoints() >= 1000},
    {id:"shopper", icon:"🛍️", pl:"Pierwszy zakup", eng:"First purchase", descPL:"Kup dowolną skórkę.", descENG:"Buy any skin.", check:()=> getOwned().length > 2}
  ];

  function isOwned(id){
    return getOwned().includes(id);
  }

  function equippedSkin(){
    return localStorage.getItem(STORAGE.equippedSkin) || "skin-default";
  }

  function equippedEffect(){
    return localStorage.getItem(STORAGE.equippedEffect) || "effect-none";
  }

  function equippedCelebration(){
    return localStorage.getItem(STORAGE.equippedCelebration) || "celebration-paper";
  }

  function itemLabel(item){
    return lang()==="ENG" ? item.eng : item.pl;
  }

  function itemDesc(item){
    return lang()==="ENG" ? item.descENG : item.descPL;
  }

  function applyCosmetics(){
    document.body.classList.remove("skin-default","skin-bold-xo","skin-student","skin-neon-signs","effect-none","effect-pop","effect-stamp","effect-spark","effect-shake-win");
    document.body.classList.add(equippedSkin());
    document.body.classList.add(equippedEffect());
  }

  function updatePointsPill(){
    const value = getPoints();
    document.querySelectorAll("[data-paper-points]").forEach((el)=> el.textContent = value + " pkt");
    const header = document.querySelector(".paper-score-pill span:nth-child(2)");
    if(header) header.textContent = value;
  }

  function buyOrEquip(itemId){
    const item = SHOP_ITEMS.find((x)=>x.id===itemId);
    if(!item) return;

    const owned = getOwned();
    if(!owned.includes(itemId)){
      const pts = getPoints();
      if(pts < item.price){
        toast(lang()==="ENG" ? "Not enough points." : "Za mało punktów.");
        return;
      }
      setPoints(pts - item.price);
      owned.push(itemId);
      setOwned(owned);
      toast(lang()==="ENG" ? "Bought." : "Kupiono.");
    }

    if(item.type === "skin") localStorage.setItem(STORAGE.equippedSkin, item.id);
    if(item.type === "effect") localStorage.setItem(STORAGE.equippedEffect, item.id);
    if(item.type === "celebration") localStorage.setItem(STORAGE.equippedCelebration, item.id);

    applyCosmetics();
    decorateLiveSymbols();
    showShop();
  }

  function shopCategoryLabels(){
    return {
      patterns: lang()==="ENG" ? "Patterns" : "Wzory",
      celebrations: lang()==="ENG" ? "Celebrations" : "Cieszynki",
      effects: lang()==="ENG" ? "Effects" : "Efekty"
    };
  }

  function currentShopCategory(){
    return window.__paperShopCategory || "patterns";
  }

  function setShopCategory(category){
    window.__paperShopCategory = category;
    showShop();
  }

  function showShop(){
    const pts = getPoints();
    const labels = shopCategoryLabels();
    const category = currentShopCategory();
    const items = SHOP_ITEMS.filter((item)=>item.category === category);

    makePaperModal("paperShopModal", t("shopTitle"), `
      <div style="margin-bottom:10px">
        <span class="paper-points-pill">⭐ <span data-paper-points>${pts} pkt</span></span>
      </div>

      <div class="paper-shop-tabs">
        <button type="button" class="paper-shop-tab ${category==="patterns" ? "active" : ""}" data-shop-category="patterns">${labels.patterns}</button>
        <button type="button" class="paper-shop-tab ${category==="celebrations" ? "active" : ""}" data-shop-category="celebrations">${labels.celebrations}</button>
        <button type="button" class="paper-shop-tab ${category==="effects" ? "active" : ""}" data-shop-category="effects">${labels.effects}</button>
      </div>

      <div class="paper-shop-section-title">${labels[category]}</div>

      <div class="paper-shop-grid">
        ${items.map((item)=>{
          const owned = isOwned(item.id);
          const equipped =
            item.type === "skin" ? equippedSkin() === item.id :
            item.type === "effect" ? equippedEffect() === item.id :
            equippedCelebration() === item.id;

          const label = equipped ? (lang()==="ENG" ? "Equipped" : "Używane") : owned ? (lang()==="ENG" ? "Use" : "Użyj") : `${item.price} pkt`;

          return `
            <div class="paper-shop-item">
              <div class="paper-shop-preview">${item.icon}</div>
              <div class="paper-shop-title">${itemLabel(item)}</div>
              <div class="paper-shop-desc">${itemDesc(item)}</div>
              <button type="button" class="paper-shop-buy ${equipped ? "equipped" : owned ? "owned" : ""}" data-shop-item="${item.id}">
                ${label}
              </button>
            </div>
          `;
        }).join("")}
      </div>

      <button type="button" id="paperWinCelebrationTest" class="paper-secondary-btn">${lang()==="ENG" ? "Test celebration" : "Test cieszynki"}</button>
    `);

    document.querySelectorAll("[data-shop-category]").forEach((btn)=>{
      btn.addEventListener("click",()=>setShopCategory(btn.dataset.shopCategory));
    });

    document.querySelectorAll("[data-shop-item]").forEach((btn)=>{
      btn.addEventListener("click",()=>buyOrEquip(btn.dataset.shopItem));
    });

    $("paperWinCelebrationTest")?.addEventListener("click",()=>{
      showCelebration(lang()==="ENG" ? "Victory!" : "Wygrana!", "+50 pkt");
    });
  }

  function showRewards(){
    const s = getStats();
    makePaperModal("paperRewardsModal", t("rewardsTitle"), `
      <div style="margin-bottom:10px">
        <span class="paper-points-pill">⭐ <span data-paper-points>${getPoints()} pkt</span></span>
      </div>

      <div class="paper-reward-grid">
        ${REWARDS.map((reward)=>{
          const unlocked = reward.check(s);
          return `
            <div class="paper-reward-card ${unlocked ? "unlocked" : "locked"}">
              <span class="paper-reward-icon">${reward.icon}</span>
              <div class="paper-reward-title">${lang()==="ENG" ? reward.eng : reward.pl}</div>
              <div class="paper-reward-desc">${lang()==="ENG" ? reward.descENG : reward.descPL}</div>
            </div>
          `;
        }).join("")}
      </div>
    `);
  }

  function showCelebration(title, sub){
    document.querySelector(".paper-celebration")?.remove();
    document.querySelector(".paper-confetti")?.remove();

    const celebration = equippedCelebration();
    const wrap = document.createElement("div");
    wrap.className = "paper-celebration";

    if(celebration === "celebration-firework") wrap.classList.add("firework");
    if(celebration === "celebration-stamp") wrap.classList.add("stamp-win");

    const icon =
      celebration === "celebration-confetti" ? "🎊" :
      celebration === "celebration-firework" ? "🎆" :
      celebration === "celebration-stamp" ? "🏅" :
      "🎉";

    wrap.innerHTML = `
      <div class="paper-celebration-card">
        <span class="paper-celebration-icon">${icon}</span>
        <div class="paper-celebration-title">${title}</div>
        <div class="paper-celebration-sub">${sub || ""}</div>
      </div>
    `;

    document.body.appendChild(wrap);

    if(celebration === "celebration-confetti"){
      const confetti = document.createElement("div");
      confetti.className = "paper-confetti";
      const pieces = ["✦","●","■","▲","×","○","★"];
      confetti.innerHTML = Array.from({length:24}).map((_,i)=>{
        const left = Math.round(Math.random()*100);
        const delay = (Math.random()*0.45).toFixed(2);
        const piece = pieces[i % pieces.length];
        return `<span style="left:${left}%;animation-delay:${delay}s">${piece}</span>`;
      }).join("");
      document.body.appendChild(confetti);
      setTimeout(()=>confetti.remove(), 2100);
    }

    setTimeout(()=>wrap.remove(), 1800);
  }

  function isOnlineScoringMode(){
    const mode = $("playMode")?.value || "";
    return mode === "online";
  }

  function observeWinCelebration(){
    const game = $("gameView");
    if(!game || window.__paperWinObserver) return;

    function readWinText(){
      const status = $("status")?.textContent || "";
      const endMessage = $("endMessage")?.textContent || "";
      const endPanel = $("endPanel");
      const endVisible = endPanel && !endPanel.classList.contains("hidden");
      return (endVisible ? endMessage : "") + " " + status;
    }

    function maybeCelebrate(){
      const text = readWinText().trim();
      const won = /wygra|wygrywa|zwyci|victory|wins|winner|won/i.test(text);
      if(!won || !text) return;

      if(window.__lastPaperWinStatus === text) return;
      window.__lastPaperWinStatus = text;

      const online = isOnlineScoringMode();
      if(online){
        setPoints(getPoints() + 50);
        updatePointsPill();
        showCelebration(lang()==="ENG" ? "Victory!" : "Wygrana!", "+50 pkt");
      } else {
        showCelebration(lang()==="ENG" ? "Victory!" : "Wygrana!", "");
      }
    }

    window.__paperWinObserver = new MutationObserver(()=>maybeCelebrate());
    window.__paperWinObserver.observe(game,{childList:true,subtree:true,characterData:true,attributes:true});

    setInterval(maybeCelebrate, 1000);
  }


  function isLikelyPlayableCell(el){
    if(!el || !(el instanceof HTMLElement)) return false;
    if(el.closest(".paper-modal") || el.closest("#paperTemplateRoot") || el.closest("#paperBottomNav") || el.closest("#paperGameToolbar")) return false;

    const game = $("gameView");
    if(!game || !game.contains(el)) return false;

    const tag = el.tagName.toLowerCase();
    const cls = el.className ? String(el.className).toLowerCase() : "";
    const role = el.getAttribute("role") || "";

    return tag === "button" ||
      role === "button" ||
      cls.includes("cell") ||
      cls.includes("small-cell") ||
      cls.includes("tile") ||
      cls.includes("square") ||
      cls.includes("slot");
  }

  function getCellSymbol(el){
    if(!el) return "";
    const txt = (el.textContent || "").trim();
    if(txt === "X" || txt === "O") return txt;

    const aria = (el.getAttribute("aria-label") || "").toUpperCase();
    if(/X/.test(aria)) return "X";
    if(/O/.test(aria)) return "O";

    const value = (el.dataset.value || el.dataset.symbol || el.dataset.mark || "").toUpperCase();
    if(value === "X" || value === "O") return value;

    const cls = String(el.className || "").toLowerCase();
    if(/x/.test(cls) || cls.includes(" x ")) return "X";
    if(/o/.test(cls) || cls.includes(" o ")) return "O";

    return "";
  }

  
  
  function markLatestStudentMove(){
    const game = $("gameView");
    if(!game) return;

    // Nie zgadujemy ostatniego ruchu po DOM, bo plansza jest renderowana od nowa.
    // Ostatni ruch ustawia game.js na podstawie state.last_move.
    game.querySelectorAll(".small-cell.last, button.small-cell.last").forEach((el)=>{
      el.classList.add("paper-student-last");
    });
  }

function restoreStudentLastMoveHighlight(){
    const game = $("gameView");
    if(!game) return;

    game.querySelectorAll(".small-cell.last, button.small-cell.last").forEach((el)=>{
      el.classList.add("paper-student-last");
    });
  }

  function decorateLiveSymbols(){
    const game = $("gameView");
    if(!game) return;

    game.querySelectorAll("button,.cell,.small-cell,.tile,.square,[role='button']").forEach((el)=>{
      if(!isLikelyPlayableCell(el)) return;

      const symbol = getCellSymbol(el);
      el.classList.toggle("paper-symbol-x", symbol === "X");
      el.classList.toggle("paper-symbol-o", symbol === "O");

      const prev = el.dataset.paperSeenValue || "";
      if(symbol && symbol !== prev){
        animatePlacedSymbol(el);
      }
      el.dataset.paperSeenValue = symbol;
    });

    markLatestStudentMove();
    restoreStudentLastMoveHighlight();
    updateRuntimeDebug();
  }

  function animatePlacedSymbol(el){
    if(!el || !(el instanceof HTMLElement)) return;

    const symbol = getCellSymbol(el);
    if(symbol !== "X" && symbol !== "O") return;

    el.classList.remove("paper-placed-pop","paper-placed-stamp","paper-placed-spark");

    const effect = equippedEffect();
    const cls =
      effect === "effect-pop" ? "paper-placed-pop" :
      effect === "effect-stamp" ? "paper-placed-stamp" :
      effect === "effect-spark" ? "paper-placed-spark" :
      "";

    if(!cls) return;

    void el.offsetWidth;
    el.classList.add(cls);
    setTimeout(()=>el.classList.remove(cls), 650);
  }

  function updateRuntimeDebug(){
    const dbg = $("paperRuntimeDebug");
    if(dbg) dbg.remove();
  }

  function observeLiveBoardCompatibility(){
    const game = $("gameView");
    if(!game) return;

    decorateLiveSymbols();

    if(!window.__paperBoardCompatibilityObserver){
      window.__paperBoardCompatibilityObserver = new MutationObserver(()=>{
        decorateLiveSymbols();
      });

      window.__paperBoardCompatibilityObserver.observe(game,{
        childList:true,
        subtree:true,
        characterData:true,
        attributes:true,
        attributeFilter:["class","data-value","data-symbol","data-mark","aria-label"]
      });

      game.addEventListener("click",(e)=>{
        const target = e.target.closest("button,.cell,.small-cell,.tile,.square,[role='button']");
        setTimeout(()=>{
          decorateLiveSymbols();
          if(target) animatePlacedSymbol(target);
        }, 120);
      }, true);

      setInterval(decorateLiveSymbols, 700);
    }
  }

  function buildPaperMenu(){
    const menu=$("menuView");
    if(!menu||$("paperTemplateRoot")) return;
    document.body.classList.add("paper-template");

    const root=document.createElement("div");
    root.id="paperTemplateRoot";
    root.innerHTML=`
      <div class="paper-header">
        <div class="paper-doodle paper-note">X|O<br>O|X<br>X|O</div>
        <div class="paper-doodle paper-crown">♕</div>
        <div class="paper-score-pill"><span class="paper-coin">★</span><span>1250</span><span class="paper-avatar">☺</span></div>
        <div class="paper-logo"><div class="paper-logo-xo"><span class="paper-logo-x">X</span><span class="paper-logo-o">O</span></div><div class="paper-logo-chaos">CHAOS</div><div class="paper-logo-online">ONLINE</div></div>
      </div>
      <button type="button" class="paper-play" id="paperMainPlay" aria-label="Graj"></button>
      <div class="paper-tabs"><button type="button" class="paper-tab" data-paper-play="online"></button><button type="button" class="paper-tab" data-paper-play="local"></button><button type="button" class="paper-tab" data-paper-play="bot"></button></div>
      <div class="paper-version-grid">
        <button type="button" class="paper-version-card classic" data-paper-version="classic"><h3></h3><p></p><div class="paper-card-doodle">X|O|X<br>O|X|O<br>X|O|X</div></button>
        <button type="button" class="paper-version-card student" data-paper-version="student"><h3></h3><p></p><div class="paper-card-doodle student">🎓🥤</div></button>
      </div>
      <div class="paper-ribbon-title"></div>
      <div class="paper-special-strip">
        <button type="button" class="paper-special" data-paper-special="chaos"><span></span><span class="paper-special-icon">🌀</span><span class="paper-switch"></span></button>
        <button type="button" class="paper-special" data-paper-special="firstBlood"><span></span><span class="paper-special-icon">💧</span><span class="paper-switch"></span></button>
        <button type="button" class="paper-special" data-paper-special="sudden"><span></span><span class="paper-special-icon">💀</span><span class="paper-switch"></span></button>
        <button type="button" class="paper-special" data-paper-special="alternate"><span></span><span class="paper-special-icon">🔄</span><span class="paper-switch"></span></button>
      </div>
      <div class="paper-join-box"><input id="paperRoomCodeInput" maxlength="8" /><button type="button" id="paperJoinBtn"></button></div>
      <div class="paper-menu-list">
        <button type="button" class="paper-menu-row" id="paperSettingsBtn"><span class="paper-menu-icon">⚙</span><span></span><span>›</span></button>
        <button type="button" class="paper-menu-row" id="paperInstructionsBtn"><span class="paper-menu-icon">📖</span><span></span><span>›</span></button>
      </div>
    `;
    menu.prepend(root);

    const bottom=document.createElement("nav");
    bottom.id="paperBottomNav";
    bottom.className="paper-bottom-nav";
    bottom.innerHTML=`<button type="button" class="paper-nav-btn" data-nav="ranking"><span>🏆</span><span></span></button><button type="button" class="paper-nav-btn" data-nav="profil"><span>👤</span><span></span></button><button type="button" class="paper-nav-btn" data-nav="znajomi"><span>👥</span><span></span></button><button type="button" class="paper-nav-btn" data-nav="nagrody"><span>🎁</span><span></span></button><button type="button" class="paper-nav-btn" data-nav="sklep"><span>🏪</span><span></span></button>`;
    document.body.appendChild(bottom);

    $("paperMainPlay")?.addEventListener("click",()=>{
      syncPaperSelectionToOriginalControls();
      clickOriginal("createRoomBtn");
    });
    document.querySelectorAll("[data-paper-play]").forEach((btn)=>btn.addEventListener("click",()=>setSelect("playMode",btn.dataset.paperPlay)));
    document.querySelectorAll("[data-paper-version]").forEach((btn)=>btn.addEventListener("click",()=>setSelect("versionMode",btn.dataset.paperVersion)));
    document.querySelectorAll("[data-paper-special]").forEach((btn)=>{
      btn.addEventListener("click",()=>{
        const key=btn.dataset.paperSpecial;
        if(key==="chaos") toggleCheckbox("chaosMode");
        if(key==="firstBlood") toggleCheckbox("firstBloodMode");
        if(key==="sudden") toggleCheckbox("suddenDeath");
        if(key==="alternate") toggleCheckbox("alternateStarter");
      });
    });

    $("paperJoinBtn")?.addEventListener("click",()=>{
      const original=$("roomCodeInput");
      const paper=$("paperRoomCodeInput");
      if(original&&paper){
        original.value=paper.value.trim().toUpperCase();
        original.dispatchEvent(new Event("input",{bubbles:true}));
      }
      clickOriginal("joinRoomBtn");
    });

    $("paperSettingsBtn")?.addEventListener("click",()=>showPaperSettings());
    $("paperInstructionsBtn")?.addEventListener("click",()=>showInstructions($("versionMode")?.value==="student"?"student":"classic"));
    document.querySelector('[data-nav="profil"]')?.addEventListener("click",()=>showPaperProfile());
    document.querySelector('[data-nav="ranking"]')?.addEventListener("click",()=>showRanking());
    document.querySelector('[data-nav="znajomi"]')?.addEventListener("click",()=>simplePanel("paperFriendsModal",t("friendsTitle"),t("friendsInfo")));
    document.querySelector('[data-nav="nagrody"]')?.addEventListener("click",()=>showRewards());
    document.querySelector('[data-nav="sklep"]')?.addEventListener("click",()=>showShop());

    ["playMode","versionMode","chaosMode","firstBloodMode","suddenDeath","alternateStarter"].forEach((id)=>$(id)?.addEventListener("change",refreshActiveStates));
    updatePaperTexts();
    rememberMenuChoice("playMode", $("playMode")?.value || "online");
    rememberMenuChoice("versionMode", $("versionMode")?.value || "classic");
    refreshActiveStates();
  }


  function buildPaperGameToolbar(){
    const game = $("gameView");
    if(!game || $("paperGameToolbar")) return;

    const toolbar = document.createElement("div");
    toolbar.id = "paperGameToolbar";
    toolbar.className = "paper-game-toolbar paper-game-toolbar-v31";
    toolbar.innerHTML = `
      <button type="button" class="paper-game-tool" id="paperGameInstructions">
        <span>📖</span><span>INSTRUKCJA</span>
      </button>
      <button type="button" class="paper-game-tool" id="paperGameLink">
        <span>🔗</span><span>LINK</span>
      </button>
      <button type="button" class="paper-game-tool paper-game-menu-tool" id="paperGameMenu">
        <span>🏠</span><span>MENU</span>
      </button>
    `;

    const status = $("status");
    if(status && status.parentNode) status.parentNode.insertBefore(toolbar, status);
    else game.prepend(toolbar);

    $("paperGameInstructions")?.addEventListener("click", () => {
      if(typeof showInstructions === "function") showInstructions();
      else $("instructionsBtn")?.click();
    });

    $("paperGameLink")?.addEventListener("click", () => {
      const code = ($("roomCode")?.textContent || "").trim();
      const url = window.location.href;
      navigator.clipboard?.writeText(url).then(()=>{
        toast(lang()==="ENG" ? "Link copied!" : "Link skopiowany!");
      }).catch(()=>{
        toast(code ? `Pokój: ${code}` : url);
      });
    });

    $("paperGameMenu")?.addEventListener("click", () => {
      const leave = $("leaveBtn") || $("backToMenuBtn") || $("newGameBtn");
      if(leave) leave.click();
      else toast(lang()==="ENG" ? "Menu button not found." : "Nie znaleziono przycisku menu.");
    });
  }

  function observeGameView(){
    buildPaperGameToolbar();
    const game = $("gameView");
    if(!game || window.__paperGameObserver) return;

    window.__paperGameObserver = new MutationObserver(() => {
      buildPaperGameToolbar();
      const badge = $("appVersionBadge");
      if(badge) badge.textContent = APP_VERSION;
    });

    window.__paperGameObserver.observe(game, {childList:true, subtree:true, attributes:true});
  }


  function forceVisibleVersion(){
    const badge = $("appVersionBadge");
    if(badge) badge.textContent = APP_VERSION;

    document.querySelectorAll(".version-badge,[data-version-badge]").forEach((el)=>{
      el.textContent = APP_VERSION;
    });

    // Do not rewrite arbitrary text like "Online 1v1".
    // Only replace very old standalone app version labels.
    document.querySelectorAll("*").forEach((el)=>{
      if(!el || !el.childNodes || el.children.length > 0) return;
      const txt = (el.textContent || "").trim();
      if(txt === "v0.9.1" || txt === "v26" || txt === "v26.1" || txt === "v26.2"){
        el.textContent = APP_VERSION;
      }
    });
  }

  function init(){
    buildPaperMenu();
    applyTheme();
    updatePaperTexts();
    refreshActiveStates();
    observeGameView();
    applyCosmetics();
    updatePointsPill();
    observeWinCelebration();
    observeLiveBoardCompatibility();
    decorateLiveSymbols();
    forceVisibleVersion();
  }

  if(document.readyState==="loading") document.addEventListener("DOMContentLoaded",init);
  else init();
  window.__paperVersionInterval = setInterval(forceVisibleVersion, 1200);
})();
