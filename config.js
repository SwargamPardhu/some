// Firebase Configuration
const firebaseConfig = {
  apiKey: "AIzaSyD5an8ZTF96nAYARIO3_QNytCKM5zsW1Pw",
  authDomain: "immune-tracker-child.firebaseapp.com",
  projectId: "immune-tracker-child",
  storageBucket: "immune-tracker-child.appspot.com",
  messagingSenderId: "417642973727",
  appId: "1:417642973727:web:bcbb507523e9ac0dd4a32a",
  measurementId: "G-XTWEKJ2NMQ",
  databaseURL: "https://immune-tracker-child-default-rtdb.asia-southeast1.firebasedatabase.app/"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const database = firebase.database();