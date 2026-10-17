import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs } from 'firebase/firestore';
import fs from 'fs';

const config = JSON.parse(fs.readFileSync('./firebase-applet-config.json', 'utf8'));
const app = initializeApp(config);
const db = getFirestore(app, config.firestoreDatabaseId);

async function inspectStory() {
  const colRef = collection(db, 'leaderboards_story');
  const snap = await getDocs(colRef);
  console.log('Total docs:', snap.size);

  const byInitials: Record<string, any[]> = {};
  snap.forEach(d => {
    const data = d.data();
    const init = data.initials || 'UNKNOWN';
    if (!byInitials[init]) byInitials[init] = [];
    byInitials[init].push({ id: d.id, ...data });
  });

  for (const [init, docs] of Object.entries(byInitials)) {
    console.log(`\nInitials: ${init} (count: ${docs.length})`);
    // Find highest stageNum
    docs.sort((a, b) => (b.stageNum || 0) - (a.stageNum || 0));
    console.log(`  Top doc: ID=${docs[0].id}, stageNum=${docs[0].stageNum}, stageName=${docs[0].stageName}, completions=${docs[0].completions}`);
    if (docs.length > 1) {
      console.log(`  Lowest doc: ID=${docs[docs.length - 1].id}, stageNum=${docs[docs.length - 1].stageNum}, stageName=${docs[docs.length - 1].stageName}`);
    }
  }

  process.exit(0);
}

inspectStory();
