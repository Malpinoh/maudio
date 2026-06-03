import { useEffect, useState } from "react";
import NetInfo from "@react-native-community/netinfo";

export function useNetwork() {
  const [online, setOnline] = useState(true);
  const [transition, setTransition] = useState<"online" | "offline" | null>(null);

  useEffect(() => {
    const sub = NetInfo.addEventListener((s) => {
      const isOn = !!s.isConnected;
      setOnline((prev) => {
        if (prev !== isOn) setTransition(isOn ? "online" : "offline");
        return isOn;
      });
    });
    NetInfo.fetch().then((s) => setOnline(!!s.isConnected));
    return () => sub();
  }, []);

  useEffect(() => {
    if (!transition) return;
    const t = setTimeout(() => setTransition(null), 2000);
    return () => clearTimeout(t);
  }, [transition]);

  return { online, transition };
}