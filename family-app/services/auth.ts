import auth from '@react-native-firebase/auth';
import { GoogleSignin } from '@react-native-google-signin/google-signin';

GoogleSignin.configure({
  webClientId: '492153162560-q58phfgt0d2v3me6lragvfe7544j0hfu.apps.googleusercontent.com', // lo sacamos de Firebase
});

export async function signInWithGoogle() {
  await GoogleSignin.hasPlayServices();
  const { data } = await GoogleSignin.signIn();
  const credential = auth.GoogleAuthProvider.credential(data?.idToken ?? null);
  return auth().signInWithCredential(credential);
}

export async function getToken(): Promise<string | null> {
  const user = auth().currentUser;
  if (!user) return null;
  return user.getIdToken();
}

export function onAuthStateChanged(callback: (user: any) => void) {
  return auth().onAuthStateChanged(callback);
}

export function signOut() {
  return auth().signOut();
}