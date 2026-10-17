import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs } from 'firebase/firestore';
import fs from 'fs';
import {
  consolidateStoryScores,
  consolidateArcadeScores,
  consolidateSpeedrunScores,
  consolidateSurvivalScores,
} from '../src/services/leaderboardService';

const config = JSON.parse(fs.readFileSync('./firebase-applet-config.json', 'utf8'));
const app = initializeApp(config);
const db = getFirestore(app, config.firestoreDatabaseId);

async function checkAll() {
  console.log('=== 1. STORY LEADERBOARD ===');
  const storySnap = await getDocs(collection(db, 'leaderboards_story'));
  const rawStory = storySnap.docs.map(d => ({ id: d.id, ...d.data() }));
  const consolidatedStory = consolidateStoryScores(rawStory);
  consolidatedStory.slice(0, 15).forEach((e, i) => {
    console.log(`${i + 1}. [${e.initials}] Stage: ${e.stageName} (stageNum: ${e.stageNum}, bit: ${e.bit}, res: ${e.resolution}), Completions: ${e.completions}`);
  });

  console.log('\n=== 2. ARCADE LEADERBOARD ===');
  const arcadeSnap = await getDocs(collection(db, 'leaderboards_arcade'));
  const rawArcade = arcadeSnap.docs.map(d => ({ id: d.id, ...d.data() }));
  const consolidatedArcade = consolidateArcadeScores(rawArcade);
  consolidatedArcade.forEach((e, i) => {
    console.log(`${i + 1}. [${e.initials}] Stage: ${e.stageName} (stageNum: ${e.stageNum}), Time: ${e.duration}s, HZ: ${e.totalHz}`);
  });

  console.log('\n=== 3. SPEEDRUN LEADERBOARD ===');
  const speedSnap = await getDocs(collection(db, 'leaderboards_speedrun'));
  const rawSpeed = speedSnap.docs.map(d => ({ id: d.id, ...d.data() }));
  const consolidatedSpeed = consolidateSpeedrunScores(rawSpeed);
  consolidatedSpeed.forEach((e, i) => {
    console.log(`${i + 1}. [${e.initials}] Time: ${e.timeSeconds}s, Runs: ${e.runs}`);
  });

  console.log('\n=== 4. SURVIVAL LEADERBOARD ===');
  const survSnap = await getDocs(collection(db, 'leaderboards_survival'));
  const rawSurv = survSnap.docs.map(d => ({ id: d.id, ...d.data() }));
  const consolidatedSurv = consolidateSurvivalScores(rawSurv);
  consolidatedSurv.forEach((e, i) => {
    console.log(`${i + 1}. [${e.initials}] Time: ${e.survivalSeconds}s, HZ: ${e.totalHz}`);
  });

  process.exit(0);
}

checkAll();
