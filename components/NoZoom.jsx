"use client";

import { useEffect } from "react";

export default function NoZoom() {
 useEffect(() => {
 const preventGesture = (event) => event.preventDefault();
 const preventCtrlWheel = (event) => {
 if (event.ctrlKey) event.preventDefault();
 };

 document.addEventListener("gesturestart", preventGesture, { passive: false });
 document.addEventListener("gesturechange", preventGesture, { passive: false });
 document.addEventListener("gestureend", preventGesture, { passive: false });
 document.addEventListener("wheel", preventCtrlWheel, { passive: false });

 return () => {
 document.removeEventListener("gesturestart", preventGesture);
 document.removeEventListener("gesturechange", preventGesture);
 document.removeEventListener("gestureend", preventGesture);
 document.removeEventListener("wheel", preventCtrlWheel);
 };
 }, []);

 return null;
}
