  const SEASON = Object.freeze({days:52,targetDay:48,maxLevel:20,trainingTarget:120000,economyVersion:2,trainingSecondsMultiplier:6});
  function seasonBuildScale(level) { const l=Math.max(1,Math.min(20,level)); return l<=7 ? .35*Math.pow(l,1.75) : .35*Math.pow(7,1.75)*Math.pow(1.42,l-7); }
  function productionRateAt(level) { return level>0 ? Math.round(280*Math.pow(Math.min(20,level),1.65)) : 0; }
  function growthRewardAmount(level) { return Math.round((level<=7?330:140)*seasonBuildScale(level)); }
