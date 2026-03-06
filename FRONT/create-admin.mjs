import { initializeApp } from "firebase/app";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword } from "firebase/auth";
import { getFirestore, doc, setDoc } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyBKgTwGI4DrDopUMGQkIgrGH50CtnicQyQ",
  authDomain: "supervision-visios.firebaseapp.com",
  projectId: "supervision-visios",
  storageBucket: "supervision-visios.firebasestorage.app",
  messagingSenderId: "72335250123",
  appId: "1:72335250123:web:69f86d84b33399790e814e",
  measurementId: "G-F67919H9GL"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

const email = "koffimarcalex6@gmail.com";
const password = "Marcalex29200311@";

async function createAdmin() {
  console.log(`Tentative de création de l'admin: ${email}`);
  
  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;
    console.log(`Utilisateur créé dans Auth (UID: ${user.uid})`);
    
    await setDoc(doc(db, "users", user.uid), {
      username: "Admin",
      email: email,
      role: "admin",
      createdAt: new Date().toISOString()
    });
    console.log("Rôle 'admin' attribué dans Firestore.");
    
  } catch (error) {
    if (error.code === 'auth/email-already-in-use') {
      console.log("L'utilisateur existe déjà. Connexion en cours...");
      try {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;
        console.log(`Connecté avec succès. Mise à jour du rôle...`);
        
        await setDoc(doc(db, "users", user.uid), {
          username: "Admin",
          email: email,
          role: "admin",
          updatedAt: new Date().toISOString()
        }, { merge: true });
        console.log("Rôle 'admin' mis à jour/confirmé.");
        
      } catch (loginError) {
        console.error("Impossible de se connecter:", loginError.message);
        process.exit(1);
      }
    } else {
      console.error("Erreur critique:", error.message);
      process.exit(1);
    }
  }
  process.exit(0);
}

createAdmin();
