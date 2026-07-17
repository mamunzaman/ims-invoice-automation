"use client";

import type { ReactNode } from "react";
import { ImsCard } from "@/components/forms/ims";

interface SectionCardProps {
  id?: string;
  step?: number;
  title: string;
  subtitle?: string;
  action?: ReactNode;
  children: ReactNode;
}

export function SectionCard({ id, step, title, subtitle, action, children }: SectionCardProps) {
  return (
    <ImsCard id={id} title={title} subtitle={subtitle} step={step} action={action}>
      {children}
    </ImsCard>
  );
}
