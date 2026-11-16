import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { faqs } from "../content";
import { Eyebrow } from "./section-heading";

/** FAQ. */
export function FaqSection() {
  return (
    <section
      id="faq"
      className="scroll-mt-16 border-t border-foreground/10"
    >
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-20 md:px-6 md:py-28 lg:grid-cols-[0.8fr_1.2fr]">
        <div className="flex flex-col gap-4">
          <Eyebrow>প্রশ্নোত্তর</Eyebrow>
          <h2 className="text-3xl leading-tight font-extrabold tracking-tight text-balance md:text-5xl">
            দোকানদাররা যা জানতে চান
          </h2>
        </div>
        <Accordion>
          {faqs.map((faq) => (
            <AccordionItem
              key={faq.q}
              value={faq.q}
              className="border-foreground/15"
            >
              <AccordionTrigger className="py-5 text-lg font-semibold">
                {faq.q}
              </AccordionTrigger>
              <AccordionContent className="text-base leading-relaxed text-muted-foreground">
                {faq.a}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </section>
  );
}
