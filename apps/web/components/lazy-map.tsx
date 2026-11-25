"use client";
import dynamic from "next/dynamic";

/** Keeps MapLibre out of the first-load bundle (CLAUDE.md > Performance budget). */
export const LazyMap = dynamic(() => import("./trail-map"), { ssr: false });
