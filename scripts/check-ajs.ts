import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, doc, getDoc } from 'firebase/firestore';
import fs from 'fs';

const config = JSON.parse(fs.readFileSync('./firebase-applet-config.json', 'utf8'));
const app = initializeApp(config);
const db = getFirestore(app, config.firestoreDatabaseId);

async function testFetch() {
  const colRef = collection(db, 'leaderboards_story');
  const playersRef = collection(db, 'players');

  const [storySnap, playersSnap] = await Promise.all([
    getDocs(colRef),
    getDocs(playersRef).catch(() => null),
  ]);

  console.log('Story docs count:', storySnap.size);
  const storyItems = !storySnap.empty ? storySnap.docs.map(d => ({ id: d.id, ...d.data() })) : [];
  
  // Find all items for AJS
  const ajsItems = storyItems.filter((s: any) => (s.initials === 'AJS' || s.id === 'AJS'));
  console.log('All AJS items in Firestore:', JSON.stringify(ajsItems, null, 2));

  // Find all items for all pilots
  const pilotCodes = new Set(storyItems.map((s: any) => s.initials || s.id));
  console.log('Unique pilots in storyItems:', Array.from(pilotCodes));

  // Let's check arcade for AJS as well:
  const arcadeSnap = await getDocs(collection(db, 'leaderboards_arcade'));
  const ajsArcade = arcadeSnap.docs.map(d => ({ id: d.id, ...d.data() })).filter((s: any) => s.initials === 'AJS' || s.id === 'AJS');
  console.log('All AJS items in Arcade:', JSON.stringify(ajsArcade, null, 2));

  // Let's check survival for AJS:
  const survivalSnap = await getDocs(collection(db, 'leaderboards_survival'));
  const ajsSurvival = survivalSnap.docs.map(d => ({ id: d.id, ...d.data() })).filter((s: any) => s.initials === 'AJS' || s.id === 'AJS');
  console.log('All AJS items in Survival:', JSON.stringify(ajsSurvival, null, 2));

  // Let's check speedrun for AJS:
  const speedrunSnap = await getDocs(collection(db, 'leaderboards_speedrun'));
  const ajsSpeedrun = speedrunSnap.docs.map(d => ({ id: d.id, ...d.data() })).filter((s: any) => s.initials === 'AJS' || s.id === 'AJS');
  console.log('All AJS items in Speedrun:', JSON.stringify(ajsSpeedrun, null, 2));

  process.exit(0);
}

testFetch();
