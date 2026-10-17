import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs } from 'firebase/firestore';
import fs from 'fs';
import { consolidateStoryScores } from '../src/services/leaderboardService';

const config = JSON.parse(fs.readFileSync('./firebase-applet-config.json', 'utf8'));
const app = initializeApp(config);
const db = getFirestore(app, config.firestoreDatabaseId);

async function testConsolidation() {
  const colRef = collection(db, 'leaderboards_story');
  const storySnap = await getDocs(colRef);
  const storyItems = storySnap.docs.map(d => ({ id: d.id, ...d.data() }));

  const consolidated = consolidateStoryScores(storyItems);
  console.log('Total consolidated count:', consolidated.length);
  consolidated.forEach((c, idx) => {
    if (idx < 15 || c.initials === 'AJS') {
      console.log(`Rank ${idx + 1}: ${c.initials} | Stage: ${c.stageName} (stageNum: ${c.stageNum}, bit: ${c.bit}, res: ${c.resolution}) | Completions: ${c.completions} | Updated: ${c.updatedAt || c.createdAt}`);
    }
  });

  process.exit(0);
}

testConsolidation();
