import { initializeApp } from 'firebase/app';
import { getFirestore, doc, getDoc } from 'firebase/firestore';
import fs from 'fs';

const config = JSON.parse(fs.readFileSync('./firebase-applet-config.json', 'utf8'));
const app = initializeApp(config);
const db = getFirestore(app, config.firestoreDatabaseId);

async function checkFTC() {
  const sSnap = await getDoc(doc(db, 'leaderboards_meta', 'story_ftc'));
  console.log('story_ftc exists:', sSnap.exists(), sSnap.exists() ? sSnap.data() : null);

  const aSnap = await getDoc(doc(db, 'leaderboards_meta', 'arcade_ftc'));
  console.log('arcade_ftc exists:', aSnap.exists(), aSnap.exists() ? aSnap.data() : null);

  process.exit(0);
}

checkFTC();
