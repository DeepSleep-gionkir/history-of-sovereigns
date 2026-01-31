/* eslint react-hooks/set-state-in-effect: off */
import { useState, useEffect } from "react";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { NationData } from "@/types/db";

export function useNation(uid: string | null) {
  const [nation, setNation] = useState<NationData | null>(null);
  const [loading, setLoading] = useState<boolean>(Boolean(uid));

  useEffect(() => {
    let unsub: (() => void) | undefined;

    if (uid) {
      setLoading(true);
      unsub = onSnapshot(doc(db, "nations", uid), (docSnap) => {
        if (docSnap.exists()) {
          setNation(docSnap.data() as NationData);
        } else {
          setNation(null);
        }
        setLoading(false);
      });
    } else {
      setNation(null);
      setLoading(false);
    }

    return () => {
      if (unsub) unsub();
    };
  }, [uid]);

  return { nation, loading };
}
