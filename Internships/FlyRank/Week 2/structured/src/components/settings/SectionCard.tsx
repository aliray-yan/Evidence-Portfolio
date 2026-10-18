import type { ReactNode } from 'react';

interface SectionCardProps {
  title: string;
  description: string;
  children: ReactNode;
}

function SectionCard({ title, description, children }: SectionCardProps) {
  return (
    <section className="section-card" aria-labelledby={`${title.toLowerCase().replace(/\s+/g, '-')}-heading`}>
      <div className="section-card__header">
        <h2 id={`${title.toLowerCase().replace(/\s+/g, '-')}-heading`}>{title}</h2>
        <p>{description}</p>
      </div>
      <div className="section-card__body">{children}</div>
    </section>
  );
}

export default SectionCard;
