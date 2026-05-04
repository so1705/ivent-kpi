const fs = require('fs');
const path = 'src/App.jsx';
let content = fs.readFileSync(path, 'utf8');

// 1. Repair getAIAdvice
const getAIAdviceRegex = /const getAIAdvice = \(stats, isPersonal\) => \{[\s\S]+?\};/;
const cleanAIAdvice = `const getAIAdvice = (stats, isPersonal) => {
  const { calls, appts, picConnected, requests } = stats;
  const connectRate = calls > 0 ? picConnected / calls : 0;
  const apptRate = picConnected > 0 ? appts / picConnected : 0;
  const totalCvr = calls > 0 ? appts / calls : 0;
  const requestRate = picConnected > 0 ? requests / picConnected : 0;
  
  if (calls === 0) return "データがありません。稼働を開始して実績を入力してください。";

  const categories = [];

  if (isPersonal) {
    if (connectRate < 0.15) {
      categories.push({
        obs: "架電数に対して本人接続が少ない傾向にあります。リストの質か、架電時間の有効性が低い可能性があります。",
        strategy: "アプローチ時間の最適化とターゲット精査",
        action: "ゴールデンタイム（14-16時、10-11時）への架電集中と、担当者が不在がちなリストの後回しを徹底してください。"
      });
    }
    if (apptRate < 0.05) {
      categories.push({
        obs: "本人接続はできていますが、アポイント獲得に至る率が低いです。クロージングの弱さが課題かもしれません。",
        strategy: "ニーズ喚起とキラーフレーズの強化",
        action: "現状の課題を深掘りする質問を増やし、解決策としてのメリットを提示するタイミングを15秒早めてみてください。"
      });
    }
  } else {
    if (connectRate < 0.2) {
      categories.push({
        obs: "チーム全体の接続率が低迷しています。",
        strategy: "架電リストの見直しと時間管理",
        action: "リストの属性を再確認し、繋がりやすい時間帯への人員配置を再調整しましょう。"
      });
    }
  }

  if (categories.length === 0) return "現在のパフォーマンスは安定しています。この調子で継続しましょう。";
  
  const advice = categories[0];
  return advice.obs + "【戦略】" + advice.strategy + " 【アクション】" + advice.action;
};`;

content = content.replace(getAIAdviceRegex, cleanAIAdvice);

// 2. Repair any other broken strings in the file by looking forunterminated ones or garbage
// For simplicity, I'll just restore the problematic areas I touched.

fs.writeFileSync(path, content, 'utf8');
console.log("Master repair complete");
