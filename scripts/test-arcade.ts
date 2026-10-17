import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs } from 'firebase/firestore';
import fs from 'fs';
import { consolidateArcadeScores } from '../src/services/leaderboardService';

const config = JSON.parse(fs.readFileSync('./firebase-applet-config.json', 'utf8'));
const app = initializeApp(config);
const db = getFirestore(app, config.firestoreDatabaseId);

async function testArcade() {
  const colRef = collection(db, 'leaderboards_arcade');
  const arcadeSnap = await getDocs(colRef);
  const arcadeItems = arcadeSnap.docs.map(d => ({ id: d.id, ...d.data() }));

  const consolidated = consolidateArcadeScores(arcadeItems);
  console.log('Total arcade count:', consolidated.length);
  consolidated.forEach((c, idx) => {
    console.log(`Rank ${idx + 1}: ${c.initials} | Stage: ${c.stageName} (stageNum: ${c.stageNum}, bit: ${c.bit}) | Duration: ${c.duration}s | HZ: ${c.totalHz}`);
  });

  process.exit(0);
}

testArcade();
