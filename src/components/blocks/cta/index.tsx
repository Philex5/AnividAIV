import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Section as SectionType } from "@/types/blocks/section";
import { getPublicAssetUrl } from "@/lib/asset-loader";

export default function CTA({ section }: { section: SectionType }) {
  if (section.disabled) {
    return null;
  }

  return (
    <section id={section.name} className="py-16 lg:py-24">
      <div className="container px-4 md:px-8">
        <div className="flex items-center justify-center rounded-3xl px-8 py-16 text-center md:py-24 overflow-hidden">
          <div className="mx-auto max-w-3xl">
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-black font-anime mb-6 tracking-tight leading-tight">
              {section.title}
            </h2>
            <p className="text-base sm:text-lg text-muted-foreground font-medium mb-10 max-w-2xl mx-auto">
              {section.description}
            </p>
            {section.buttons && (
              <div className="flex flex-col justify-center gap-4 sm:flex-row items-center">
                {section.buttons.map((item, idx) => (
                  <Button
                    key={idx}
                    variant={item.variant || "default"}
                    size="lg"
                    className="h-12 px-8 rounded-full text-base font-bold"
                    asChild
                  >
                    <Link
                      href={item.url || ""}
                      target={item.target}
                      className="flex items-center justify-center gap-2"
                    >
                      {item.icon && (
                        <img
                          src={getPublicAssetUrl(item.icon)}
                          alt={`${item.title} icon`}
                          width="24"
                          height="24"
                          className="w-5 h-5"
                        />
                      )}
                      {item.title}
                    </Link>
                  </Button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
