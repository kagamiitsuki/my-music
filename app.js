// ===== helpers =====
const $ = (sel, root=document) => root.querySelector(sel);
const $$ = (sel, root=document) => [...root.querySelectorAll(sel)];

function fmtTime(sec){
  if(!Number.isFinite(sec)) return "0:00";
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${String(s).padStart(2,"0")}`;
}

// ===== 3D Carousel + tabs =====
const tabIds = ["tab-moon","tab-smile","tab-now","tab-greet","tab-scent","tab-noone","tab-oshi","tab-oncemore"];
const tabs = tabIds.map(id => document.getElementById(id));


const ring = $("#car3dRing");
const cards = $$(".car3d-card");

let activeIndex = 0;

// カードを円周上に配置（曲数が増えても自動でOK）
function layout3D(){
  const n = cards.length;
  const step = 360 / n;

  // 半径：カード幅と枚数から自動（ほどよい奥行き）
  const cardW = cards[0].getBoundingClientRect().width || 240;
  const radius = Math.max(260, Math.round((cardW * n) / (2 * Math.PI)));

  cards.forEach((card, i) => {
    const angle = i * step;
    // 中心基準 → 角度回転 → 奥へ
    card.style.transform =
      `translate(-50%, -50%) rotateY(${angle}deg) translateZ(${radius}px)`;
  });

  // ringを回転させてアクティブを正面へ
  rotateTo(activeIndex, false);
}

// ring回転
function rotateTo(idx, animate=true){
  const n = cards.length;
  activeIndex = (idx % n + n) % n;

  const step = 360 / n;
  const rotY = -activeIndex * step;

  if(!animate){
    ring.style.transition = "none";
    ring.style.transform = `rotateY(${rotY}deg)`;
    // reflow
    void ring.offsetHeight;
    ring.style.transition = "";
  }else{
    ring.style.transform = `rotateY(${rotY}deg)`;
  }

  cards.forEach((c,i)=> c.classList.toggle("is-front", i === activeIndex));
  tabs[activeIndex].checked = true;
}

// ボタン
$("#car3dPrev").addEventListener("click", () => rotateTo(activeIndex - 1, true));
$("#car3dNext").addEventListener("click", () => rotateTo(activeIndex + 1, true));

// クリックでそのカードを正面＆タブ切替
cards.forEach(card => {
  card.addEventListener("click", () => {
    const idx = Number(card.dataset.index);
    rotateTo(idx, true);
  });
});

// タブからカルーセルへ同期
tabs.forEach((t, idx) => {
  t.addEventListener("change", () => {
    if(t.checked) rotateTo(idx, true);
  });
});

// 左右キー操作（任意）
window.addEventListener("keydown", (e) => {
  if(e.key === "ArrowLeft") rotateTo(activeIndex - 1, true);
  if(e.key === "ArrowRight") rotateTo(activeIndex + 1, true);
});

// レイアウト初期化
window.addEventListener("resize", () => layout3D(), { passive:true });
layout3D();

// ===== drag to rotate (mouse + touch) =====
const stage = $("#car3dStage");

// ドラッグ中の状態
let isDragging = false;
let startX = 0;
let startRotY = 0;      // ドラッグ開始時のリング回転量
let currentRotY = 0;    // ドラッグ中に更新する回転量
let lastX = 0;
let lastT = 0;
let velocity = 0;       // px/ms
let rafInertia = null;

function getRingRotY(){
  // transform: rotateY(Xdeg) から X を取る（未設定なら0）
  const tr = ring.style.transform || "";
  const m = tr.match(/rotateY\((-?\d+(\.\d+)?)deg\)/);
  return m ? parseFloat(m[1]) : 0;
}

function setRingRotY(deg, animate=false){
  if(!animate){
    ring.style.transition = "none";
    ring.style.transform = `rotateY(${deg}deg)`;
    void ring.offsetHeight;
    ring.style.transition = "";
  }else{
    ring.style.transform = `rotateY(${deg}deg)`;
  }
  currentRotY = deg;
}

function stopInertia(){
  if(rafInertia){
    cancelAnimationFrame(rafInertia);
    rafInertia = null;
  }
}

function snapToNearest(){
  const n = cards.length;
  const step = 360 / n;

  // 現在の回転に最も近い「正面index」を計算
  // ringは idx * step だけマイナス回転で正面に来るので逆算
  const idx = Math.round((-currentRotY) / step);
  rotateTo(idx, true);
}

function onDown(clientX){
  isDragging = true;
  stopInertia();

  startX = clientX;
  startRotY = getRingRotY();
  currentRotY = startRotY;

  lastX = clientX;
  lastT = performance.now();
  velocity = 0;

  stage.classList.add("dragging");
}

function onMove(clientX){
  if(!isDragging) return;

  const dx = clientX - startX;

  // ドラッグ感度（小さいほどゆっくり回る）
  const sensitivity = 0.25; // 0.18〜0.35で好み調整
  const deg = startRotY + dx * sensitivity;

  setRingRotY(deg, false);

  // 速度計算（慣性用）
  const now = performance.now();
  const dt = Math.max(8, now - lastT);
  velocity = (clientX - lastX) / dt;
  lastX = clientX;
  lastT = now;
}

function onUp(){
  if(!isDragging) return;
  isDragging = false;
  stage.classList.remove("dragging");

  // 慣性：速度が小さければそのままスナップ
  const minVel = 0.02; // px/ms
  if(Math.abs(velocity) < minVel){
    snapToNearest();
    return;
  }

  // 慣性回転（減速しながら回す → 最後にスナップ）
  let v = velocity; // px/ms
  const sensitivity = 0.25;
  const friction = 0.92; // 0.88〜0.95 好み（小さいほど早く止まる）
  let last = performance.now();

  const tick = () => {
    const now = performance.now();
    const dt = Math.min(34, now - last);
    last = now;

    // px/ms → deg
    currentRotY += v * dt * sensitivity;

    setRingRotY(currentRotY, false);

    v *= Math.pow(friction, dt / 16);

    if(Math.abs(v) < 0.01){
      rafInertia = null;
      snapToNearest();
      return;
    }
    rafInertia = requestAnimationFrame(tick);
  };

  rafInertia = requestAnimationFrame(tick);
}

// mouse
stage.addEventListener("mousedown", (e) => {
  e.preventDefault();
  onDown(e.clientX);
});
window.addEventListener("mousemove", (e) => onMove(e.clientX));
window.addEventListener("mouseup", () => onUp());

// touch
stage.addEventListener("touchstart", (e) => {
  if(e.touches.length !== 1) return;
  onDown(e.touches[0].clientX);
}, { passive:true });

stage.addEventListener("touchmove", (e) => {
  if(e.touches.length !== 1) return;
  onMove(e.touches[0].clientX);
}, { passive:true });

stage.addEventListener("touchend", () => onUp(), { passive:true });

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
const audioGreet  = wirePlayer("audioGreet", "seekGreet", "timeGreet", "durGreet");
const audioScent = wirePlayer("audioScent",  "seekScent", "timeScent", "durScent");
const audioNoone   = wirePlayer("audioNoone","seekNoone", "timeNoone", "durNoone");
const audioOshi = wirePlayer("audioOshi",   "seekOshi",  "timeOshi",  "durOshi");
const audioOncemore   = wirePlayer("audioOncemore", "seekOncemore", "timeOncemore", "durOncemore");

// 共通ボタン処理（再生/停止）
$$("button[data-audio]").forEach(btn => {
  btn.addEventListener("click", async () => {
    const audio = $("#"+btn.dataset.audio);
    const action = btn.dataset.action;

    // 他の曲が鳴ってたら止める
    [audioMoon, audioSmile, audioNow,audioGreet,audioScent,audioNoone,audioOshi,audioOncemore].forEach(a => {
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

$("#lyGreet").textContent    = `
ねぇ、なんでかな？
ただ「お疲れ」って言葉だけなのに
スマホ握りしめて
期待してる私、ほんとバカみたい

最初はまったく気にしてなかった
ただの同僚で
たまたま席が隣なだけ
なのにいつの間にか
気づけばキミを目で追ってる
「そのネイル、可愛いね」なんて
サラッと言えちゃうとかズルいよ
平然装って「ありがと」って返すけど
心臓の音バレそうでヤバい

隠せば隠すほど
気持ちって滲み出ちゃうのかな
頭の中、キミだらけ
もう止まれないよ

ねぇ
名前呼ばれるだけで
鼓動が跳ねて止まらない
キミの声が響くたび
また可愛くなりたいって思う
触れてないのに近すぎて
逃げ場所なんてないよ
もう誤魔化せないよ
my feelings これ、きっと“恋”だよね？

真面目すぎてちょっと不器用なとこ
最初は「何考えてるの？」って思ってた
でもね
誰より周りを見ているとことか
少年みたいな笑顔とか
知れば知るほど惹かれてく
私の“当たり前”が
キミ色に染まってく

強がりな私だけど
キミの前じゃ嘘つけない
もっと素直になれたらいいのに

ねぇ
名前呼ばれるたびに
息が苦しくなるくらい
キミの存在が大きくなってく
確かめたいけど怖くて
今の距離壊したくない
それでもキミが笑うだけで
未来がキラキラ光って見えるの

Tell me, tell me baby
Am I the only one feeling this way?
Is it destiny? Or just fantasy?
I'm falling deeper day by day
もし手を伸ばしたなら
キミは握ってくれるの？
それとも笑って離れていくの？
答えが知りたいの

名前呼ばれるだけで
新しい私に変わってく
出会う前の退屈な日々には
もう戻れないよ
たとえ傷ついたとしても
この気持ちには嘘つけない
恋してるって認めたら
やっと前に進める気がする

ねぇ
次に名前呼ぶときは
もっと特別な声で呼んでほしい
…なんて まだ言えないけど`;

$("#lyScent").textContent    = `
窓辺に落ちた 淡い日差しが
眠たい心を そっと撫でる
香りで始まる やわらかな朝
言葉じゃない優しさに 心がほどける

言葉じゃ触れられない想いも
香りで触れたなら わかる気がした
不思議だよ
心がほどけてゆく

同じ空の下で
同じ香りを感じて
違う世界にいた私たちが
笑えるなんて
You and me, just breathe
ふわり世界が近くなる
Scent of you, scent of peace
ここから始まる

ぎこちない瞳 でもまっすぐで
その迷いさえも 愛しく思えた
ひとくち飲んだら 距離が変わって
まるで魔法みたいに 胸が鳴った

すれ違うことは間違いじゃない
答えがなくても 未来へ向かう
触れた気持ち
嘘じゃないんだよ

同じ空を見て 同じ夢を描く
知らない未来に 怯えていたけど
Take my hand, don’t hide
心が触れたその瞬間
Scent of hope, scent of love
世界が繋がる

Close your eyes, feel the wind
Every heartbeat speaks the truth
There’s no border, no line
When I’m standing next to you
そっと息を合わせて
同じ想いを抱きしめたい

同じ空の下で 同じ未来を見て
小さな勇気ひとつで 世界は変わる
You and I, we're real
もう迷わなくていいよ
Scent of you, scent of peace
香りで恋した世界
Stay with me, right here
風がそっと結ぶ
物語の場所`;

$("#lyNoone").textContent    = `
最近ふと思うんだ 
画面の向こう キラキラした笑顔
「自分にしかできないこと」 
誇らしげなその姿
悔しいほど 輝いてた
それに比べて私はどうかな？
タスクをなぞるだけの Everyday
昨日休んだ私のsection 
何事もなく今日が始まってた

代わりなんて いくらでもいる
そんな風に言われてる気がして
私ってなに？ モブなの？ 
No way,
そんなの絶対なりたくない

No one else, It’s me 
唯一無二の 
Only One になりたくて 
誰かの「代わり」
なんて もううんざりなの 
「キミじゃないとダメ」って言われたい 
今日も磨くよ 
私だけの輝き 
お願い誰か 気づいてよ 
私が必要だって 教えて

誰かに与えられたイスは 
誰かの気分で
すぐ奪われちゃう
「いい子」にしてるだけじゃ 
きっと何も
守れないって気づいたの

自分の居場所は 自分で勝ち取る 
そうじゃなきゃ 意味がないでしょ？
私をただのピースだなんて 
思ってるなら こちらから願い下げ

No one else, It’s me
私の場所は
私が選んでいく
必要とされない
ステージならいらない
媚びたりしない
私らしくいるため
涙拭いて
顔を上げて
輝く場所を
探しに行く
My life is mine.

Even on the nights.
I feel like breaking down.
If I don't believe in me, who else will?
There is only one me.

No one else, It’s me 
唯一無二の Only One になってみせるよ 
誰かの「代わり」なんて もううんざりなの
「私がいい」って 言わせてみせるよ 
今日も磨くよ 私だけの輝き 見つけ出すの 
最高の場所 
私が私を 
愛せるように
Yeah, I’m the Only One. No one else... 
私だけの Story 輝きだす It’s me.`;

$("#lyOshi").textContent     = `
目覚ましとめて
また始まるルーティン
タイムライン眺めても
同じ景色の繰り返し
「何か」が足りない
空白のハート
やりたいこともないまま
ため息ひとつ

夢中になれる魔法
どこかにないかな
なんとなく過ぎてく
グレーな毎日
そんなある日
画面越し
突然
君が笑いかけたんだ

君に出会った瞬間
世界が色づいた
モノクロの景色が
パッと鮮やかになる
その笑顔を見るだけで
嫌なこと全部
どうでもよくなっちゃうの
不思議だね
君がいるだけで
私は強くなれるよ

耳から離れない
君の歌声
イヤホン越しのBGM
足取りも軽くなる
「辛いな」って思う日も
君を想えば
曇ってた気持ちが
一気に晴れていくの

存在自体が
尊いサプリメント
見ているだけで
癒やされていく
前向きになれた
今の私 昨日の私より
ちょっと好きかも

君が笑ってくれるなら
それだけでいい
どんな遠くからでも
君を支えたいな
もらった光の分だけ
「ありがとう」を込めて 精一杯の愛を
届けに行くよ 君は私の
生きる意味になったんだ

You are my light, shining so bright You changed my world, everything's alright No matter how far,
I'm on your side Forever and ever, you are my hero

何かに夢中になれる
幸せを知った
退屈だったあの日々には
もう戻れない
君を見つけた
あの日からずっと 私の毎日は
輝いている

君に出会った瞬間
世界が色づいた
嘘みたいに毎日が
楽しくて仕方ない
その笑顔を見るだけで
すべてが輝く
「推し」がいる世界線
生きててよかった
これからもずっと
心はそばにいるよ`;

$("#lyOncemore").textContent = `
胸の奥で眠ってた声が
そっと息をしてる
こわくて触れられなくて
わたしは立ち止まってた

歌えなくなったその朝
世界がやけに静かで
まだ歌えるって思いたくて
胸が迷ってた

「ちゃんと歌わなきゃ」
その言葉が
いつのまにか
わたしを遠くに押してた

街角に響いた自由な歌が
胸の奥でふっと揺れて
笑ってるみたいなその音に
心が追いかけてた
あぁ こんなにも
素直な気持ちでよかったんだ
誰かのためじゃなくて
わたしの“好き”で歌いたい
忘れてた想いが
そっと息をした

帰り道 静かに口ずさんで
まだ頼りない声だけど
音は何も責めなくて
優しく寄り添ってくれた

期待よりも
わたしの気持ち
その順番でいいんだって
少しずつ気づいたんだ

涙に混ざる小さな歌が
止まってた時間を動かしてく
苦しい日も迷った夜も
全部抱きしめて
あぁ わたしはまだ
歌いたいって思ってる
声になる前のその息さえ
今は愛しくて
それだけでいい
もう大丈夫

I sing for me, not perfection
Let my heart speak, not fear
Even if the melody wavers
It’s real, so I’ll stay here

もう迷わないよ
好きだから歌いたいんだ
震えてもいい この声でいい
それがわたしの歌だから
笑う日も 泣いた夜も全部
抱きしめながら歩いていく
“好き”を胸に歌っていくよ

眠ってた声が
やっと目を覚ました`;

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
