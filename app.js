// ===== helpers =====
const $ = (sel, root=document) => root.querySelector(sel);
const $$ = (sel, root=document) => [...root.querySelectorAll(sel)];

function fmtTime(sec){
  if(!Number.isFinite(sec)) return "0:00";
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${String(s).padStart(2,"0")}`;
}

// ===== tabs + coverflow (3 items) =====
const tabMoon  = $("#tab-moon");
const tabSmile = $("#tab-smile");
const tabNow   = $("#tab-now");

const items = $$(".cf-item");
let activeIndex = 0; // 0 moon / 1 smile / 2 now

function applyCoverflow(){
  items.forEach((it, i) => {
    const d = i - activeIndex;

    if(d === 0){
      it.style.transform =
        "translate(-50%, -50%) translateX(0px) translateZ(140px) rotateY(0deg) scale(1.07)";
      it.style.filter = "brightness(1) saturate(1.05)";
      it.style.opacity = "1";
      it.style.zIndex = "4";
      return;
    }

    const x = d * 190;
    const rot = d * -22;
    const z = 20 - Math.abs(d) * 30;
    const scale = 0.92 - Math.abs(d) * 0.03;

    it.style.transform =
      `translate(-50%, -50%) translateX(${x}px) translateZ(${z}px) rotateY(${rot}deg) scale(${scale})`;
    it.style.filter = "brightness(.78) saturate(.9)";
    it.style.opacity = "0.92";
    it.style.zIndex = String(3 - Math.abs(d));
  });
}

function setTabByIndex(idx){
  activeIndex = Math.max(0, Math.min(items.length - 1, idx));
  if(activeIndex === 0) tabMoon.checked = true;
  if(activeIndex === 1) tabSmile.checked = true;
  if(activeIndex === 2) tabNow.checked = true;
  applyCoverflow();
}

function setIndexByTab(){
  if(tabMoon.checked)  activeIndex = 0;
  if(tabSmile.checked) activeIndex = 1;
  if(tabNow.checked)   activeIndex = 2;
  applyCoverflow();
}

items.forEach((it, i) => {
  const activate = () => setTabByIndex(i);
  it.addEventListener("click", activate);
  it.addEventListener("keydown", (e) => {
    if(e.key === "Enter" || e.key === " "){
      e.preventDefault();
      activate();
    }
  });
});

$("#cfPrev").addEventListener("click", () => setTabByIndex(activeIndex - 1));
$("#cfNext").addEventListener("click", () => setTabByIndex(activeIndex + 1));
tabMoon.addEventListener("change", setIndexByTab);
tabSmile.addEventListener("change", setIndexByTab);
tabNow.addEventListener("change", setIndexByTab);

// ===== audio players =====
function wirePlayer(audioId, seekId, timeId, durId){
  const audio = $("#"+audioId);
  const seek = $("#"+seekId);
  const time = $("#"+timeId);
  const dur = $("#"+durId);

  audio.addEventListener("loadedmetadata", () => {
    dur.textContent = fmtTime(audio.duration);
  });

  audio.addEventListener("timeupdate", () => {
    if(!audio.duration) return;
    const p = (audio.currentTime / audio.duration) * 100;
    seek.value = String(p);
    time.textContent = fmtTime(audio.currentTime);
  });

  seek.addEventListener("input", () => {
    if(!audio.duration) return;
    const p = Number(seek.value) / 100;
    audio.currentTime = p * audio.duration;
  });

  return audio;
}

const audioMoon  = wirePlayer("audioMoon",  "seekMoon",  "timeMoon",  "durMoon");
const audioSmile = wirePlayer("audioSmile", "seekSmile", "timeSmile", "durSmile");
const audioNow   = wirePlayer("audioNow",   "seekNow",   "timeNow",   "durNow");

// 共通ボタン処理（再生/停止）
$$("button[data-audio]").forEach(btn => {
  btn.addEventListener("click", async () => {
    const audio = $("#"+btn.dataset.audio);
    const action = btn.dataset.action;

    // 他の曲が鳴ってたら止める
    [audioMoon, audioSmile, audioNow].forEach(a => {
      if(a !== audio && !a.paused){
        a.pause();
        a.currentTime = 0;
        $$(`button[data-audio="${a.id}"][data-action="toggle"]`)
          .forEach(b => b.textContent = "▶ 再生");
      }
    });

    if(action === "stop"){
      audio.pause();
      audio.currentTime = 0;
      $$(`button[data-audio="${btn.dataset.audio}"][data-action="toggle"]`)
        .forEach(b => b.textContent = "▶ 再生");
      return;
    }

    if(audio.paused){
      try{
        await audio.play();
        btn.textContent = "⏸ 一時停止";
      }catch(err){
        alert("再生できませんでした。ファイル名（スペースや記号）と配置を確認してください。");
        console.error(err);
      }
    }else{
      audio.pause();
      btn.textContent = "▶ 再生";
    }
  });
});

// 再生終了でボタン表示を戻す
[audioMoon, audioSmile, audioNow].forEach(a => {
  a.addEventListener("ended", () => {
    $$(`button[data-audio="${a.id}"][data-action="toggle"]`)
      .forEach(b => b.textContent = "▶ 再生");
  });
});

// ===== lyrics (クリックで全文表示) =====

$("#lyMoon").textContent = `
カーテンのすき間
夜だけが
正直になる
空に並ぶ星は
わたしの代わりに
瞬いてる
きっと君は
知らない
この静けさが
どれほど
胸を叩くか

友達って
名前をつけた距離で
笑えてしまう
それが
やさしくて
切ない

月のない空
何も見えないはずなのに
胸の奥だけ
いちばん
明るい
君は今
なにを想ってる？
誰の名前を
思い浮かべてる？

新月の夜に
言えなかった
言葉にできない この気持ちが
星より先に
胸を照らして
消えないまま ここにある
君のそばに
いられるなら
それ以上 望まないって
何度も
嘘をついて
今日も空を 見上げてる

時計の針が
日付を
越えるころ
星は
答えを
くれない
シリウスだけ
強く瞬いて
まるで
知ってるみたいに

If you knew my heart
I would fade away
Still I can’t let go

新月の夜に
はじめて
自分の気持ちを 見つけた
星に願うより
近すぎて
胸が痛むほど
君のそばで
笑うたび
戻れなくなりそうで
それでも
この夜に
君のことが
好きだよ`;

$("#lySmile").textContent = `
教室のざわめき 私には遠くて
笑い声の輪に 入れないまま俯いてた
「平気だよ」」って誤魔化してたけど
ほんとはずっと 寂しさ抱えてた
窓の外ばかり見て 時間だけ過ぎてくの
置き去りの気持ちが 胸の奥で苦しいまま

ほんとはね 誰かと笑って
くだらない話で 盛り上がって
名前呼び合って 目が合うだけで
嬉しくなるような日が欲しかった
勇気なんて全然なくて
気づけば心 そっと閉めてたんだ

「ねぇ、隣いい？」って
ふいに聞こえた声が
胸の奥 優しくノックする
あたたかい気持ちが
じんわり広がってく
閉めたままの心に 光が差したんだ

気づいたら君の声 探すようになって
同じ景色でも 少し違って見えた
昨日より今日の私が 好きになれたのは
君が私を見て 笑ってくれるから
言葉に詰まっても 「大丈夫」って言う声が
また私を やさしく包んでくれた

君の隣にいるとね
呼吸がふって軽くなるんだ
気づけば笑ってて
それが“ほんとの私”なんだ
“ひとりじゃない”って気づいた瞬間
世界が静かに色づき始めたの

気づいたらね 不安も涙も
どこかへ消えていたんだ
繋いだ心があったかくて
君といる毎日が
大好きで胸がぎゅっとなる
あの日くれた勇気が 今も光ってる

You changed my cloudy days to light
You made my lonely world so bright
Now I can smile, now I’m not afraid
Because with you, I found my place
So hold my hand, don’t let me go
Together forever — I just want you to know

ねぇ見て 空に虹が
優しく架かってる
まるで心映したみたいで
“もうひとりじゃない”って
何度でも言えるんだ
これからもずっと同じ空の下
笑っていたいよ 君と`;


$("#lyNow").textContent =
`「いつかじゃなく“今”から」

ひとりぼっちの帰り道
誰にも見えない涙が落ちた
ずっとこんな毎日が続くんだって思ってた

涙でじんわり滲んだ
世界はやけに遠く見えた
笑い方さえ忘れて
声まで小さくなる日々

ひとりで震えてた心に
そっと差し出された手
意味なんていらなくて
ぬくもりだけで、救われた

あの日 胸に灯った
ちいさなあの光が
暗闇じゃなく未来を
照らしてくれたから
泣く日だって迷う日だって
離さずに歩いてきた
「大丈夫」って言えた今日が
やっと誇れる私

大切な人を失って
痛みの理由に気づけたの
優しさって ただ強いだけじゃなくて
寄り添う形なんだね

泣きながら笑う癖も
すぐ空を見上げる癖も
全部弱さじゃなくて
生きてきた証だよ

あの日の小さな夢が
今じゃ胸の真ん中
誰かの涙のそばで
温めたい
つまずいても転んだって
名前のない希望が
背中押すみたいに
「続けよう」って言うんだ

I’m not alone anymore
I found a place to belong
Smiles, tears, everything
Made me who I am

いつかじゃなく“今”から
夢を形にしてく
誰かの心にそっと
灯りをともしたい
笑う日だって泣く日だって
全部ぎゅっと抱きしめて
願いはまだ終わらない
だって私は歩いてる
未来へ`;

// ===== back to top =====
const toTop = $("#toTop");
window.addEventListener("scroll", () => {
  if(window.scrollY > 500) toTop.classList.add("show");
  else toTop.classList.remove("show");
});
toTop.addEventListener("click", () => {
  window.scrollTo({ top: 0, behavior: "smooth" });
});

// ===== background: subtle snow =====
const canvas = $("#snow");
const ctx = canvas.getContext("2d");

let w, h, flakes;
function resize(){
  const dpr = devicePixelRatio || 1;
  w = canvas.width = Math.floor(window.innerWidth * dpr);
  h = canvas.height = Math.floor(window.innerHeight * dpr);
  canvas.style.width = window.innerWidth + "px";
  canvas.style.height = window.innerHeight + "px";

  const count = Math.floor((window.innerWidth * window.innerHeight) / 6500);
  flakes = Array.from({length: Math.max(80, count)}, () => ({
    x: Math.random() * w,
    y: Math.random() * h,
    r: (Math.random() * 1.6 + 0.6) * dpr,
    a: Math.random() * 0.45 + 0.10,
    vy: (Math.random() * 0.55 + 0.25) * dpr,
    vx: (Math.random() * 0.35 - 0.175) * dpr,
    sway: Math.random() * Math.PI * 2,
    ws: (Math.random() * 0.02 + 0.01)
  }));
}
window.addEventListener("resize", resize, { passive:true });
resize();

function tickSnow(){
  ctx.clearRect(0,0,w,h);

  // soft haze
  const g = ctx.createRadialGradient(w*0.7, h*0.2, 0, w*0.7, h*0.2, Math.max(w,h)*0.8);
  g.addColorStop(0, "rgba(210,230,255,0.10)");
  g.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0,0,w,h);

  flakes.forEach(f => {
    f.sway += f.ws;
    const dx = Math.sin(f.sway) * 0.35 * (devicePixelRatio || 1);

    f.x += f.vx + dx;
    f.y += f.vy;

    if(f.y > h + 10) { f.y = -10; f.x = Math.random() * w; }
    if(f.x < -20) f.x = w + 20;
    if(f.x > w + 20) f.x = -20;

    ctx.beginPath();
    ctx.fillStyle = `rgba(255,255,255,${f.a})`;
    ctx.arc(f.x, f.y, f.r, 0, Math.PI*2);
    ctx.fill();
  });

  requestAnimationFrame(tickSnow);
}
tickSnow();

// ===== wander girl: moves around viewport =====
const girl = $("#wanderGirl");
let gx = window.innerWidth * 0.1;
let gy = window.innerHeight * 0.2;

let tx = window.innerWidth * 0.7;
let ty = window.innerHeight * 0.6;

function newTarget(){
  const pad = 30;
  tx = pad + Math.random() * (window.innerWidth - pad*2);
  ty = pad + Math.random() * (window.innerHeight - pad*2);
}
newTarget();

function tickWander(){
  const speed = 0.28; // 小さめにして「ふわふわ」感
  const dx = tx - gx;
  const dy = ty - gy;
  const dist = Math.hypot(dx, dy);

  if(dist < 8){
    newTarget();
  }else{
    gx += (dx / dist) * speed * 1.3;
    gy += (dy / dist) * speed * 1.3;
  }

  // ちょい揺れ
  const bob = Math.sin(Date.now() / 380) * 2;
  girl.style.transform = `translate(${gx}px, ${gy + bob}px)`;

  requestAnimationFrame(tickWander);
}
tickWander();

// init coverflow
applyCoverflow();
