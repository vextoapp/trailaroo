"use client";
import { APP_NAME, t } from "@trailaroo/core";
import Link from "next/link";
import { useEffect, useState } from "react";
import { SEEN_HOME_KEY } from "./seen-home";

/** A light strip for people who arrive on a shared trail link. Never blocks the trail. */
export function NewHere() {
  const [show, setShow] = useState(false);
  useEffect(() => {
    try { setShow(!localStorage.getItem(SEEN_HOME_KEY)); } catch { setShow(true); }
  }, []);
  if (!show) return null;
  return (
    <div className="newhere" role="note">
      <span>{t("newHere.text", { app: APP_NAME })}</span>
      <Link href="/">{t("newHere.link")}</Link>
    </div>
  );
}
