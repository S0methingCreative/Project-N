import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs } from 'firebase/firestore';
import fs from 'fs';

const config = JSON.parse(fs.readFileSync('./firebase-applet-config.json', 'utf8'));
const app = initializeApp(config);
const db = getFirestore(app, config.firestoreDatabaseId);

async function check() {
  console.log('--- Checking leaderboards_story ---');
  try {
    const snap = await getDocs(collection(db, 'leaderboards_story'));
    console.log('leaderboards_story count:', snap.size);
    snap.forEach(d => {
      console.log('STORY_DOC:', d.id, JSON.stringify(d.data()));
    });
  } catch (e: any) {
    console.log('Error leaderboards_story:', e.message);
  }

  console.log('--- Checking leaderboards_meta ---');
  try {
    const snap = await getDocs(collection(db, 'leaderboards_meta'));
    console.log('leaderboards_meta count:', snap.size);
    snap.forEach(d => {
      console.log('META_DOC:', d.id, JSON.stringify(d.data()));
    });
  } catch (e: any) {
    console.log('Error leaderboards_meta:', e.message);
  }

  process.exit(0);
}

check();
