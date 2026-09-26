// seed.js — Node.js script to populate Firestore (ESM version)
import { initializeApp } from "firebase/app";
import { getFirestore, collection, addDoc, serverTimestamp } from "firebase/firestore";
import * as dotenv from "dotenv";
dotenv.config();

const firebaseConfig = {
  apiKey: process.env.VITE_FIREBASE_API_KEY,
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.VITE_FIREBASE_APP_ID,
  measurementId: process.env.VITE_FIREBASE_MEASUREMENT_ID,
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function seed() {
  console.log("🚀 Starting seed process...");

  try {
    // 1. ADD EVENTS
    console.log("Adding events...");
    const events = [
      { title: "Monthly Meet #15", date: new Date("2026-04-15"), location: "ESB 104, NIT Trichy", type: "upcoming", description: "Join us for our monthly speaking meet with a focus on 'Effective Evaluation'." },
      { title: "Workshop: Building Confidence", date: new Date("2026-03-20"), location: "Online (G-Meet)", type: "past", description: "An interactive workshop on overcoming stage fear and mastering eye contact." }
    ];
    for(let e of events) await addDoc(collection(db, 'events'), { ...e, created: serverTimestamp() });

    // 2. ADD GALLERY IMAGES
    console.log("Adding gallery...");
    const photos = [
      { url: "https://images.unsplash.com/photo-1475721027785-f74eccf46c3f?auto=format", caption: "Group Photo" },
      { url: "https://images.unsplash.com/photo-1540575861501-7ad060e39fe1?auto=format", caption: "Keynote" }
    ];
    for(let p of photos) await addDoc(collection(db, 'gallery'), { ...p, date: serverTimestamp() });

    // 3. ADD VIDEOS
    console.log("Adding videos...");
    const videos = [
      { url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ", title: "The Art of Persuasion", speaker: "Aditi S.", category: "speech", date: serverTimestamp() }
    ];
    for(let v of videos) await addDoc(collection(db, 'videos'), { ...v, date: serverTimestamp() });

    // 4. ADD LEADERBOARD
    console.log("Adding leaderboard...");
    const leaderboard = [
      { name: "Aditi Sharma", points: 85, speeches: 12, level: "L3K" },
      { name: "Rohan V.", points: 72, speeches: 9, level: "L2" }
    ];
    for(let l of leaderboard) await addDoc(collection(db, 'leaderboard'), l);

    console.log("✅ SUCCESS! All data seeded successfully to the new database.");
    process.exit(0);
  } catch (error) {
    console.error("❌ ERROR:", error.message);
    console.log("\nTIP: Make sure you have enabled 'Firestore' in your Firebase console and set rules to allow writes.");
    process.exit(1);
  }
}

seed();
