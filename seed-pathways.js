// ============================================================
// ONE-TIME FIRESTORE SEED SCRIPT - Run with: node seed-pathways.js
// This populates the 'pathways' collection in Firestore
// ============================================================

import { initializeApp } from "firebase/app";
import { getFirestore, doc, setDoc } from "firebase/firestore";
import * as dotenv from "dotenv";
dotenv.config();

const firebaseConfig = {
  apiKey: process.env.VITE_FIREBASE_API_KEY,
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.VITE_FIREBASE_APP_ID,
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const PATHWAYS = {
  L1: {
    name: "Level 1 : Unscripted Guidance material",
    description: "Master the basics : structure, delivery, eye contact, and confidence.",
    link: "https://important-camp-d68.notion.site/20518699b6cd80dd82c3e26a5cddda06?v=20518699b6cd800aaa92000c53bf50c4",
    speeches: [
      { name: "Ice Breaker", files: ["Ice Breaker.pdf", "Evaluation Check Book.pdf"] },
      { name: "Writing a Speech with Purpose.", files: ["L1P2.pdf", "Evaluation.pdf"] },
      { name: "Intro to Vocal Variety.", files: ["L1P3.pdf"] },
      { name: "Your theme, Your speech type.", files: ["L1P4.pdf"] },
      { name: "Evaluate your club member!", files: ["L1P5.pdf"] },
      { name: "Audience Interaction through speech", files: ["L1P6.pdf"] },
    ],
  },
  L2: {
    name: "Level 2 : Unscripted Guidance material",
    description: "Dive deeper : persuasion, storytelling, vocal variety, and audience mastery.",
    link: "https://important-camp-d68.notion.site/21018699b6cd80bba280ef1a5fe53613?v=21018699b6cd819bbd67000c0b63d588",
    speeches: [
      { 
        name: "Intro To Story Telling", 
        description: "Storytelling, at its heart, is the art of sharing narratives that resonate. It’s about building a connection between the teller and the audience, weaving experiences, values, and emotions into a cohesive journey." 
      },
      { 
        name: "Intro to Humorous Speech.", 
        description: "Humorous speech is about making people laugh, which often involves using irony, satire, and wit to highlight the absurdity or irony of a situation." 
      },
      { 
        name: "Introduction to Compelling Speeches", 
        description: "A compelling speech captures attention and moves audiences to think, feel, or act. It creates a lasting impact by combining clear messaging with emotional resonance and credible delivery." 
      },
      { 
        name: "Purpose of Enlightenment", 
        description: "Project Overview: 'The Purpose of Enlightenment' Speech. A 15-18 minute research-based speech exploring the concept of enlightenment across historical and conceptual contexts." 
      },
      { 
        name: "Explaining an audience on how to deliver a speech", 
        purpose: "To inform an audience on how to structure and deliver a compelling, professional speech in the world-renowned TEDx style, focusing on a single, powerful 'idea worth spreading.'",
        objectives: "Deliver a well-rehearsed, 12-18 minute speech on a topic you are passionate about; Structure the talk around one central, easily understandable idea; Combine personal storytelling with data, research, or evidence; Use high-impact visual aids; Deliver with authenticity."
      },
    ],
  },
  L3K: {
    name: "3a · Keynote Specialization",
    description: "Command the room : signature talks, TED-style delivery, and leadership narratives.",
    link: "https://important-camp-d68.notion.site/25d18699b6cd80d39913f4a934365592?v=25d18699b6cd817d8ec4000c2ce7baa0",
    speeches: [
      { name: "Keynote speech :- L3P1", description: "To deliver a speech informing the audience about a topic relevant to your profession—this could include subjects such as academia, management, etc. The speech may be followed by a Q&A session." },
      { name: "Project Management Speech:- L3P2", description: "Deliver a 5-7 minute speech explaining how you handled a project or how you're planning to execute a future project and all its various facets." },
      { name: "Elective Speeches : L3P3", description: "You have to choose any one elective for this level from the options present below." },
      { name: "Informing the Audience : L3P4", description: "To deliver a professional, keynote-style speech that informs the audience on a specific topic, while skillfully managing questions and interruptions throughout the presentation. This project challenges the speaker to maintain control, clarity, and composure in a dynamic environment." },
    ],
  },
  L3H: {
    name: "3b · Humorous Specialization",
    description: "Make them laugh : timing, wit, comedic structure, and the art of the punchline.",
    link: "https://important-camp-d68.notion.site/25e18699b6cd805e933cd27849982f15?v=25e18699b6cd8169a9a6000c8da6f790",
    speeches: [
      { name: "Introduction to Humorous Speech 2.0 : L3P1", description: "Use humor to make serious or complex topics more engaging and relatable, striking a balance between levity and gravity." },
      { name: "Use Exaggeration to Tell a Humorous Story : L3P2", description: "The purpose of this speech is to deliver a speech while learning the basics of using exaggeration to tell a humorous story." },
      { name: "Elective speeches :- L3P3", description: "Select any one speech type for this project." },
      { name: "Dry Humor: L3P4", description: "To deliver a speech that entertains the audience using the specific comedic style of deadpan or dry humor. The primary challenge is to generate laughter through understatement and a neutral delivery, rather than traditional comedic energy." },
    ],
  },
};

async function seed() {
  console.log("Seeding Firestore pathways collection...\n");
  for (const [id, data] of Object.entries(PATHWAYS)) {
    await setDoc(doc(db, "pathways", id), data);
    console.log(`Created: pathways/${id} — "${data.name}" (${data.speeches.length} speeches)`);
  }
  console.log("\nAll pathways seeded successfully!");
  process.exit(0);
}

seed().catch((err) => {
  console.error("Seeding failed:", err.message);
  process.exit(1);
});

