"use client";

import { PageIntro } from "@/components/metric";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { disclosures, lessons } from "@/lib/education/content";

export default function EducationPage() {
  return (
    <div className="grid gap-6">
      <PageIntro eyebrow="Module 9" title="How to read a HELOC strategy">
        <p>
          These notes match the calculator’s rules. They are for Legacy Builders workshops. They are not a recommendation to borrow against a home.
        </p>
      </PageIntro>
      <Accordion className="rounded-2xl border border-border bg-card px-4">
        {lessons.map((lesson) => (
          <AccordionItem key={lesson.id} value={lesson.id}>
            <AccordionTrigger className="text-base text-[#10243f]">{lesson.title}</AccordionTrigger>
            <AccordionContent>
              {lesson.paragraphs.map((paragraph) => (
                <p key={paragraph.slice(0, 24)}>{paragraph}</p>
              ))}
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
      <section className="rounded-2xl border border-[#e4d3a4] bg-[#fff8ea] p-4">
        <h2 className="text-xl text-[#10243f]">Disclosures</h2>
        <ul className="mt-3 grid gap-3 text-sm leading-6 text-[#3d3112]">
          {disclosures.map((item) => (
            <li key={item.slice(0, 32)}>{item}</li>
          ))}
        </ul>
      </section>
    </div>
  );
}
