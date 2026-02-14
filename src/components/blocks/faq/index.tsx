import { Badge } from "@/components/ui/badge";
import { Section as SectionType } from "@/types/blocks/section";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

export default function FAQ({ section }: { section: SectionType }) {
  if (section.disabled) {
    return null;
  }

  return (
    <section id={section.name} className="py-16 lg:py-24">
      <div className="container">
        <div className="text-center mb-16">
          {section.label && (
            <Badge className="mb-4 bg-primary/10 text-primary border-primary/20 hover:bg-primary/20 transition-colors">
              {section.label}
            </Badge>
          )}
          <h2 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-black font-anime mb-6 bg-clip-text text-transparent bg-gradient-to-br from-foreground to-foreground/70 tracking-tight">
            {section.title}
          </h2>
          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto font-medium leading-relaxed">
            {section.description}
          </p>
        </div>
        <div className="mx-auto max-w-3xl">
          <Accordion type="single" collapsible className="w-full">
            {section.items?.map((item, index) => (
              <AccordionItem key={index} value={`item-${index}`}>
                <AccordionTrigger className="text-left font-semibold text-base hover:no-underline">
                  {item.title}
                </AccordionTrigger>
                <AccordionContent>
                  <p className="text-muted-foreground text-sm leading-relaxed">
                    {item.description}
                  </p>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </div>
    </section>
  );
}
