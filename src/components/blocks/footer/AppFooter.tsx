"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import Icon from "@/components/icon";
import { getLogoUrl } from "@/lib/asset-loader";

export default function AppFooter() {
  const t = useTranslations("footer");

  // Get configuration arrays from i18n
  const navItems = t.raw("nav.items") as Array<{
    title: string;
    children: Array<{ title: string; url: string; target: string }>;
  }>;
  const socialItems = t.raw("social.items") as Array<{
    title: string;
    icon: string;
    url: string;
    target: string;
  }>;
  const agreementItems = t.raw("agreement.items") as Array<{
    title: string;
    url: string;
  }>;

  return (
    <footer className="mt-20 border-t border-border/10 py-12">
      <div className="max-w-[90rem] mx-auto px-8">
        <div className="flex flex-col items-center justify-between gap-10 text-center lg:flex-row lg:items-start lg:text-left">
          <div className="flex w-full max-w-96 shrink flex-col items-center justify-between gap-6 lg:items-start">
            <div>
              <div className="flex items-center justify-center gap-2 lg:justify-start">
                <img src={getLogoUrl()} alt="AnividAI" className="h-10" />
              </div>
              <p className="mt-4 text-sm md:text-base text-muted-foreground/80 leading-relaxed font-medium">
                {t("brand.description")}
              </p>
            </div>

            <div className="flex flex-col gap-4">
              <ul className="flex items-center space-x-8 text-muted-foreground/60">
                {socialItems?.map((social, index) => (
                  <li
                    key={index}
                    className="font-medium hover:text-primary transition-colors"
                  >
                    <a
                      href={social.url}
                      target={social.target}
                      rel={
                        social.target === "_blank"
                          ? "noopener noreferrer"
                          : undefined
                      }
                      aria-label={social.title}
                    >
                      <Icon name={social.icon} className="size-5" />
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {navItems?.map((navGroup, groupIndex) => (
            <div key={groupIndex} className="flex flex-col gap-4">
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-foreground/40 font-display">
                {navGroup.title}
              </p>
              <ul className="space-y-3 text-sm font-semibold text-muted-foreground/70">
                {navGroup.children?.map((link, linkIndex) => (
                  <li
                    key={linkIndex}
                    className="hover:text-primary transition-colors"
                  >
                    {link.target === "_blank" ? (
                      <a
                        href={link.url}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        {link.title}
                      </a>
                    ) : (
                      <Link href={link.url}>{link.title}</Link>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-6 flex flex-col justify-between gap-6 border-t border-border/10 pt-6 text-center text-[10px] font-bold uppercase tracking-widest text-muted-foreground/40 lg:flex-row lg:items-center lg:text-left">
          <p className="opacity-70">{t("copyright")}</p>
          {agreementItems && agreementItems.length > 0 && (
            <ul className="flex items-center justify-center gap-8 lg:justify-end">
              {agreementItems.map((item, index) => (
                <li
                  key={index}
                  className="hover:text-primary transition-colors opacity-70 hover:opacity-100"
                >
                  <Link href={item.url}>{item.title}</Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </footer>
  );
}
