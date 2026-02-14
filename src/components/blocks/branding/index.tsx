import { Section as SectionType } from "@/types/blocks/section";

export default function Branding({ section }: { section: SectionType }) {
  if (section.disabled) {
    return null;
  }

  return (
    <section id={section.name} className="py-12 bg-transparent">
      <div className="container px-4 md:px-8">
        <div className="flex flex-col items-center gap-6">
          <h2 className="text-center text-muted-foreground/60 text-xs md:text-sm font-bold uppercase tracking-widest font-anime">
            {section.title}
          </h2>
          <div className="flex flex-wrap items-center justify-center gap-x-8 md:gap-x-12 gap-y-6 md:gap-y-8 opacity-50 grayscale hover:grayscale-0 transition-all duration-500">
            {section.items?.map((item, idx) => {
              if (item.image) {
                return (
                  <img
                    key={idx}
                    src={item.image.src}
                    alt={item.image.alt || item.title}
                    className="h-6 md:h-8 object-contain dark:invert"
                  />
                );
              }
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
