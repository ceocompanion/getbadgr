import { useState, useEffect } from "react";

export const useCurrentEvent = () => {
  const [eventName, setEventName] = useState(() => {
    return localStorage.getItem("scanlead_current_event") || "";
  });

  useEffect(() => {
    if (eventName) {
      localStorage.setItem("scanlead_current_event", eventName);
    }
  }, [eventName]);

  return { eventName, setEventName };
};
