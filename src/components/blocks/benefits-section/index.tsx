"use client";

import { motion } from "framer-motion";
import Icon from "@/components/icon";
import { cn } from "@/lib/utils";
import { getR2ImageUrl } from "@/lib/asset-loader";

interface BenefitsSectionProps {
  section?: {
    title?: string;
    description?: string;
    items?: Array<{
      icon?: string;
      title?: string;
      description?: string;
    }>;
  };
}

export default function BenefitsSection({ section }: BenefitsSectionProps) {
  // Use pageData config or fallback to default
  const benefits = section?.items || [];

  // Schema.org ItemList for SEO
  const benefitsJsonLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: "AnividAI Platform Benefits",
    description: "Why choose AnividAI for OC creation, anime art generation, and character world-building",
    itemListElement: benefits.map((benefit: any, index: number) => ({
      "@type": "ListItem",
      position: index + 1,
      name: benefit.title,
      description: benefit.description,
    })),
  };

  return (
    <>
      {/* Schema.org ItemList for SEO */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(benefitsJsonLd) }}
      />
      <section className="py-24 relative overflow-hidden">
        {/* Background Glows - Subtle unified glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-primary/3 blur-[120px] rounded-full -z-10" />

      <div className="container mx-auto px-4 relative z-10">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="flex items-center justify-center gap-3 mb-4"
          >
            <div className="w-12 h-[2px] bg-primary" />
            <span className="text-primary font-bold tracking-[0.3em] uppercase text-xs">Why AnividAI</span>
            <div className="w-12 h-[2px] bg-primary" />
          </motion.div>
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="text-3xl md:text-5xl font-black font-anime mb-6 leading-[1] tracking-tighter"
          >
            {section?.title || "Why Choose AnividAI?"}
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
            className="text-lg text-muted-foreground leading-relaxed font-medium"
          >
            {section?.description || "We provide an all-in-one engine to bring your original characters to life through advanced AI generation and world-building tools."}
          </motion.p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {benefits.map((benefit, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              className={cn(
                "group relative p-8 rounded-3xl border transition-all duration-500",
                "bg-card/40 dark:bg-muted/20 backdrop-blur-xl",
                "border-border/50 dark:border-white/10",
                "hover:border-primary/50 hover:bg-card/60 dark:hover:bg-muted/30 hover:shadow-2xl hover:shadow-primary/5 hover:-translate-y-2"
              )}
            >
              {/* Card Accent Glow */}
              <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-primary/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              
              <div className="relative z-10">
                {benefit.icon && (
                  <div className={cn(
                    "w-14 h-14 mb-8 flex items-center justify-center transition-all duration-500",
                    "group-hover:scale-110 group-hover:rotate-3"
                  )}>
                    {benefit.icon.includes("/") ? (
                      <img
                        src={getR2ImageUrl(benefit.icon)}
                        alt={benefit.title || ""}
                        className="w-12 h-12 object-contain transition-all duration-500 drop-shadow-xl"
                      />
                    ) : (
                      <Icon
                        name={benefit.icon}
                        className={cn(
                          "w-10 h-10 transition-all duration-500",
                          "text-primary/80 dark:text-primary/60",
                          "group-hover:text-primary group-hover:scale-110",
                        )}
                      />
                    )}
                  </div>
                )}
                <h3 className={cn(
                  "text-2xl font-black font-anime mb-4 tracking-tight transition-colors",
                  "text-foreground",
                  "group-hover:text-primary"
                )}>
                  {benefit.title}
                </h3>
                <p className={cn(
                  "text-muted-foreground text-[15px] leading-relaxed transition-colors font-medium",
                  "group-hover:text-foreground/90"
                )}>
                  {benefit.description}
                </p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
    </>
  );
}