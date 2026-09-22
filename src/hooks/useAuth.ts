import { useCallback, useEffect, useState } from "react";
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  updatePassword,
  reauthenticateWithCredential,
  EmailAuthProvider,
  type User,
} from "firebase/auth";
import { auth } from "../lib/firebase";

/**
 * Cadre-only login (Email/Password). Accounts are created individually by an admin in the Firebase
 * Console -- there is no public sign-up screen in this app, so having any account at all is the
 * access control. `authLoading` covers the brief moment before Firebase reports whether a session
 * is already active, so the app doesn't flash the sign-in screen for an already-signed-in user.
 */
export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setAuthLoading(false);
    });
    return unsubscribe;
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    await signInWithEmailAndPassword(auth, email, password);
  }, []);

  const signOutUser = useCallback(async () => {
    await signOut(auth);
  }, []);

  /**
   * Firebase requires a *recent* sign-in before it'll let a password change through -- since
   * someone changing their temp password may have signed in a while ago, this re-proves identity
   * with their current password first rather than surfacing a confusing "requires-recent-login"
   * error and making them sign out and back in.
   */
  const changePassword = useCallback(async (currentPassword: string, newPassword: string) => {
    const current = auth.currentUser;
    if (!current?.email) throw new Error("Not signed in.");
    const credential = EmailAuthProvider.credential(current.email, currentPassword);
    await reauthenticateWithCredential(current, credential);
    await updatePassword(current, newPassword);
  }, []);

  return { user, authLoading, signIn, signOut: signOutUser, changePassword };
}
