import { Random } from "koishi";
import { Config } from "./config";

export let usage = `

<div id="linkGameLogo">
<div class="cell" style="grid-area: 2 / 2;">
  <div id="block0" class="block" style="background-position: 15px 15px; background-size: 400% 400%;"></div>
</div>
<div class="cell" style="grid-area: 2 / 3;">
  <div id="block1" class="block" style="background-position: -35px 15px; background-size: 400% 400%;"></div>
</div>
<div class="cell" style="grid-area: 2 / 4;">
  <div id="block2" class="block" style="background-position: -85px 15px; background-size: 400% 400%;"></div>
</div>
<div class="cell" style="grid-area: 2 / 5;">
  <div id="block3" class="block" style="background-position: -135px 15px; background-size: 400% 400%;"></div>
</div>
<div class="cell" style="grid-area: 3 / 2;">
  <div id="block4" class="block" style="background-position: 15px -35px; background-size: 400% 400%;"></div>
</div>
<div class="cell" style="grid-area: 3 / 3;">
  <div id="block5" class="block" style="background-position: -35px -35px; background-size: 400% 400%;"></div>
</div>
<div class="cell" style="grid-area: 3 / 4;">
  <div id="block6" class="block" style="background-position: -85px -35px; background-size: 400% 400%;"></div>
</div>
<div class="cell" style="grid-area: 3 / 5;">
  <div id="block7" class="block" style="background-position: -135px -35px; background-size: 400% 400%;"></div>
</div>
<div class="cell" style="grid-area: 4 / 2;">
  <div id="block8" class="block" style="background-position: 15px -85px; background-size: 400% 400%;"></div>
</div>
<div class="cell" style="grid-area: 4 / 3;">
  <div id="block9" class="block" style="background-position: -35px -85px; background-size: 400% 400%;"></div>
</div>
<div class="cell" style="grid-area: 4 / 4;">
  <div id="block10" class="block" style="background-position: -85px -85px; background-size: 400% 400%;"></div>
</div>
<div class="cell" style="grid-area: 4 / 5;">
  <div id="block11" class="block" style="background-position: -135px -85px; background-size: 400% 400%;"></div>
</div>
<div class="cell" style="grid-area: 5 / 2;">
  <div id="block12" class="block" style="background-position: 15px -135px; background-size: 400% 400%;"></div>
</div>
<div class="cell" style="grid-area: 5 / 3;">
  <div id="block13" class="block" style="background-position: -35px -135px; background-size: 400% 400%;"></div>
</div>
<div class="cell" style="grid-area: 5 / 4;">
  <div id="block14" class="block" style="background-position: -85px -135px; background-size: 400% 400%;"></div>
</div>
<div class="cell" style="grid-area: 5 / 5;">
  <div id="block15" class="block" style="background-position: -135px -135px; background-size: 400% 400%;"></div>
</div>
<div class="cell" style="grid-area: 2 / 6;">
<div id="block16" class="block" style="background: #fcf5f7;"></div>
</div>
<div class="cell" style="grid-area: 3 / 6;">
<div id="block17" class="block" style="background: #fcf5f7;">⛓️</div>
</div>
<div class="cell" style="grid-area: 4 / 6;">
<div id="block18" class="block" style="background: #fcf5f7;">⛓️</div>
</div>
<div class="cell" style="grid-area: 5 / 6;">
<div id="block19" class="block" style="background: #fcf5f7;">👀</div>
</div>
<div class="timecell">
<div class="timelimit">
  <div class="timeleft"></div>
</div>
</div>
</div>

<style>
#linkGameLogo {
  position: relative;
  width: 310px;
  height: 300px;
  display: grid;
  grid-template-columns: 0.6fr repeat(5, 1fr) 0.6fr;
  grid-template-rows: 0.6fr repeat(4, 1fr) 0.4fr 1fr;
  background: linear-gradient(to bottom right, #002a33, #002129);
}

#linkGameLogo .cell {
  width: 100%;
  height: 100%;
  display: flex;
  justify-content: center;
  align-items: center;
}

#linkGameLogo .cell {
  width: 100%;
  height: 100%;
  display: flex;
  justify-content: center;
  align-items: center;
  transition: transform 0.5s ease; 
}

#linkGameLogo .cell:hover {
  transform: scale(1.1);
}

#linkGameLogo .block {
  display: flex;
  justify-content: center;
  align-items: center;
  width: 80%;
  height: 80%;
  border-radius: 10%;
  font-size: 20px;
  border-radius: 10%;
  box-shadow: #00a5bf 3px 3px;
  background: #fcf5f7;
  background-image: url("https://koishi.chat/logo.png");
  background-repeat: no-repeat;
}

#linkGameLogo .timecell {
  display: flex;
  justify-content: center;
  align-items: center;
  grid-row: 7;
  grid-column: 2/7;
}

#linkGameLogo .timelimit {
  background-color: #de3163;
  width: 230px;
  height: 20%;
}

#linkGameLogo .timeleft {
  background: linear-gradient(to left, green, red);
  background-clip: content-box;
  box-sizing: border-box;
  width: 100%;
  height: 100%;
  animation: time 10s infinite;
}

@keyframes time {
  0% {
    padding-right: -30%;
  }
  80% {
    padding-right: 100%;
  }
  100% {
    padding-right: -30%;
  }
}
</style>

<br>
可以在koishi上玩连连看~
<br>
小心不要沉迷哦...
`;

export async function updateUsage(config: Config) {
  const style = `
<style>
#linkGameLogo {
  position: relative;
  width: 310px;
  height: 300px;
  display: grid;
  grid-template-columns: 0.6fr repeat(5, 1fr) 0.6fr;
  grid-template-rows: 0.6fr repeat(4, 1fr) 0.4fr 1fr;
  background: linear-gradient(to bottom right, ${config.backGroundColorStart}, ${config.backGroundColorEnd});
}

#linkGameLogo .cell {
  width: 100%;
  height: 100%;
  display: flex;
  justify-content: center;
  align-items: center;
}

#linkGameLogo .cell {
  width: 100%;
  height: 100%;
  display: flex;
  justify-content: center;
  align-items: center;
  transition: transform 0.5s ease; 
}

#linkGameLogo .cell:hover {
  transform: scale(1.1);
}

#linkGameLogo .block {
  display: flex;
  justify-content: center;
  align-items: center;
  width: 80%;
  height: 80%;
  border-radius: 10%;
  box-shadow: ${config.blockShadowColor} 3px 3px;
  background: ${config.blockColor};
  background-image: url("https://koishi.chat/logo.png");
  background-repeat: no-repeat;
}

.timecell {
  display: flex;
  justify-content: center;
  align-items: center;
  grid-row: 7;
  grid-column: 2/7;
}

.timelimit {
  background-color: ${config.lineColor};
  width: 230px;
  height: 20%;
}

.timeleft {
  background: linear-gradient(to left, ${config.timeStartColor}, ${config.timeEndColor});
  background-clip: content-box;
  box-sizing: border-box;
  width: 100%;
  height: 100%;
  animation: time 10s infinite;
}

@keyframes time {
  0% {
    padding-right: -30%;
  }
  80% {
    padding-right: 100%;
  }
  100% {
    padding-right: -30%;
  }
}
</style>  
`;
  const styleRegExp = /<style[^>]*>([\s\S]*?)<\/style>/g;
  usage = usage.replace(styleRegExp, style);

  if (config.pattermType.length) {
    let randomPattern: string[];
    if (config.pattermType.length >= 4) {
      randomPattern = Random.shuffle(config.pattermType).slice(0, 4);
    }
    else {
      randomPattern = config.pattermType;
      while (randomPattern.length < 4) {
        randomPattern.push(Random.pick(config.pattermType));
      }
    }
    usage = usage.replace(
      /<div id="block16".*<\/div>/,
      `<div id="block16" class="block" style="background: ${config.blockColor};">${randomPattern[0]}</div>`
    );
    usage = usage.replace(
      /<div id="block17".*<\/div>/,
      `<div id="block17" class="block" style="background: ${config.blockColor};">${randomPattern[1]}</div>`
    );
    usage = usage.replace(
      /<div id="block18".*<\/div>/,
      `<div id="block18" class="block" style="background: ${config.blockColor};">${randomPattern[2]}</div>`
    );
    usage = usage.replace(
      /<div id="block19".*<\/div>/,
      `<div id="block19" class="block" style="background: ${config.blockColor};">${randomPattern[3]}</div>`
    );
  }
}
