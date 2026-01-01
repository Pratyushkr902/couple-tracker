import { initializeApp } from "firebase/app";
import { getDatabase } from "firebase/database";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyD0MDLEDinOni15mubEl38rZ0e8bAwWYLE",
  authDomain: "couple-tracker-b43a1.firebaseapp.com",
  databaseURL: "https://couple-tracker-b43a1-default-rtdb.firebaseio.com/", 
  projectId: "couple-tracker-b43a1",
  storageBucket: "couple-tracker-b43a1.appspot.com",
  messagingSenderId: "891233984174",
  appId: "1:891233984174:web:8c4dc0e49e353b49edd73f"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Export the services so we can use them in App.js
export const db = getDatabase(app);
export const auth = getAuth(app);