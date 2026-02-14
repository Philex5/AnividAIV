"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import Icon from "@/components/icon";
import { getLogoUrl } from "@/lib/asset-loader";
import { cn } from "@/lib/utils";

export default function HomeFooter() {
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
    <footer className="mt-24 pb-12 px-4 md:px-8 lg:px-12">
      <div className="max-w-[90rem] mx-auto py-10 px-8 md:px-12">
        <div className="flex flex-col items-center justify-between gap-8 text-center lg:flex-row lg:items-start lg:text-left">
          {/* Brand Section */}
          <div className="flex w-full max-w-sm shrink flex-col items-center justify-between gap-6 lg:items-start">
            <div className="flex flex-col items-center lg:items-start gap-4">
              <Link
                href="/"
                className="transition-transform hover:scale-105 duration-300"
              >
                <img
                  src={getLogoUrl()}
                  alt="AnividAI"
                  className="h-8 md:h-10 w-auto object-contain"
                />
              </Link>
              <p className="text-sm md:text-base text-muted-foreground/80 leading-relaxed font-medium">
                {t("brand.description")}
              </p>
            </div>

            <div className="flex flex-col gap-4">
              <ul className="flex items-center gap-5 text-muted-foreground/60">
                {socialItems?.map((social, index) => (
                  <li
                    key={index}
                    className="transition-all duration-300 hover:text-primary hover:scale-110"
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

          {/* Nav Links */}
          {navItems?.map((navGroup, groupIndex) => (
            <div key={groupIndex} className="flex flex-col gap-4">
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-foreground/40 font-display">
                {navGroup.title}
              </p>
              <ul className="space-y-3">
                {navGroup.children?.map((link, linkIndex) => (
                  <li key={linkIndex} className="group/item">
                    {link.target === "_blank" ? (
                      <a
                        href={link.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm font-semibold text-muted-foreground/70 hover:text-primary transition-colors flex items-center justify-center lg:justify-start gap-2"
                      >
                        {link.title}
                        <Icon
                          name="RiArrowRightUpLine"
                          className="size-3 opacity-0 group-hover/item:opacity-100 transition-opacity"
                        />
                      </a>
                    ) : (
                      <Link
                        href={link.url}
                        className="text-sm font-semibold text-muted-foreground/70 hover:text-primary transition-colors flex items-center justify-center lg:justify-start gap-2"
                      >
                        {link.title}
                        <Icon
                          name="RiArrowRightUpLine"
                          className="size-3 opacity-0 group-hover/item:opacity-100 transition-opacity"
                        />
                      </Link>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Featured badges section */}
        <div className="mt-8 border-t border-border/10 pt-6">
          <div className="flex flex-col gap-6">
            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground/40 text-center lg:text-left">
              Featured On
            </p>
            {/* Badges Grid */}
            <div className="flex flex-wrap items-center justify-center lg:justify-start gap-x-8 gap-y-6 opacity-40 hover:opacity-100 transition-opacity duration-700">
              <a
                href="https://startupfa.me/s/anividai?utm_source=anividai.com"
                target="_blank"
                className="grayscale hover:grayscale-0 transition-all hover:scale-105"
              >
                <img
                  src="https://startupfa.me/badges/featured-badge-small.webp"
                  alt="Featured on Startup Fame"
                  width="100"
                />
              </a>
              <a
                href="https://aiagentsdirectory.com/agent/anividai"
                target="_blank"
                rel="noopener noreferrer"
                className="grayscale hover:grayscale-0 transition-all hover:scale-105"
              >
                <img
                  src="https://aiagentsdirectory.com/featured-badge.svg?v=2024"
                  alt="AnividAI - AI Agents Directory"
                  width="100"
                />
              </a>
              <a
                href="https://dang.ai/"
                target="_blank"
                className="grayscale hover:grayscale-0 transition-all hover:scale-105"
              >
                <img
                  src="https://cdn.prod.website-files.com/63d8afd87da01fb58ea3fbcb/6487e2868c6c8f93b4828827_dang-badge.png"
                  alt="Dang.ai"
                  width="100"
                />
              </a>
              <a
                href="https://goodaitools.com"
                target="_blank"
                className="grayscale hover:grayscale-0 transition-all hover:scale-105"
              >
                <img
                  src="https://goodaitools.com/assets/images/badge.png"
                  alt="Good AI Tools"
                  width="100"
                />
              </a>
              <a
                href="https://toolsfine.com"
                target="_blank"
                className="grayscale hover:grayscale-0 transition-all hover:scale-105"
              >
                <img
                  src="https://toolsfine.com/wp-content/uploads/2023/08/Toolsfine-logo-day-0531-80x320-1.webp"
                  alt="ToolsFine"
                  width="100"
                />
              </a>
              <a
                href="https://aitoolfame.com/item/anividai"
                target="_blank"
                className="grayscale hover:grayscale-0 transition-all hover:scale-105"
              >
                <img
                  src="https://aitoolfame.com/badge-light.svg"
                  alt="aitoolfame"
                  width="100"
                />
              </a>
              <a
                href="https://indie.deals?ref=anividai"
                target="_blank"
                className="grayscale hover:grayscale-0 transition-all hover:scale-105"
              >
                <img
                  src="https://indie.deals/logo_badge.png"
                  alt="Indie Deals"
                  width="40"
                />
              </a>
              <a
                href="https://mylaunchstash.com"
                target="_blank"
                className="grayscale hover:grayscale-0 transition-all hover:scale-105"
              >
                <img
                  src="https://mylaunchstash.com/assets/images/badge.png"
                  alt="My Launch St stash"
                  width="70"
                />
              </a>
              <a
                href="https://twelve.tools"
                target="_blank"
                className="grayscale hover:grayscale-0 transition-all hover:scale-105"
              >
                <img
                  src="https://twelve.tools/badge0-white.svg"
                  alt="Twelve Tools"
                  width="100"
                />
              </a>
              <a href="https://trylaunch.ai/launch/anividai" target="_blank">
                <img
                  src="https://trylaunch.ai/badges/badge-color.svg"
                  alt="Launch"
                  width="100"
                />
              </a>
              <a
                href="https://www.showmysites.com"
                target="_blank"
                rel="noopener noreferrer"
              >
                <img
                  src="https://www.showmysites.com/static/backlink/logo.webp"
                  alt="ShowMySites Badge"
                  width="40"
                  height="40"
                />
              </a>
              <a target="_blank" href="https://saaswheel.com">
                <img
                  src="https://saaswheel.com/assets/images/badge.png"
                  alt="SaaS Wheel"
                  width="80"
                />
              </a>
              <a
                href="https://indiehunt.io/project/anividai-your-ai-studio-for-anime-worlds"
                target="_blank"
                rel="noopener"
              >
                <img
                  src="https://indiehunt.io/badges/indiehunt-badge-light.svg"
                  alt="Featured on IndieHunt"
                  width="100"
                  height="58"
                />
              </a>
              <a
                href="https://earlyhunt.com/project/anividai-your-ai-studio-for-anime-worlds"
                target="_blank"
                rel="noopener"
              >
                <img
                  src="https://earlyhunt.com/badges/earlyhunt-badge-light.svg"
                  alt="Featured on EarlyHunt"
                  width="100"
                  height="58"
                />
              </a>
              <a
                href="https://famed.tools/products/anividai?utm_source=famed.tools"
                target="_blank"
                rel="noopener"
              >
                <img
                  src="https://famed.tools/badges/famed-tools-badge-light.svg"
                  alt="Featured on famed.tools"
                  width="100"
                />
              </a>

              <a
                href="https://newtool.site/item/anividai"
                target="_blank"
                rel="noopener noreferrer"
              >
                <img
                  src="https://newtool.site/badges/newtool-light.svg"
                  alt="Featured on newtool.site"
                  width="100"
                />
              </a>

              <a href="https://uno.directory" target="_blank" rel="noopener">
                <img
                  src="https://uno.directory/uno-directory.svg"
                  alt="Listed on Uno Directory"
                  width="100"
                />
              </a>

              <a
                href="https://www.agenthunter.io?utm_source=badge&utm_medium=embed&utm_campaign=AnividAI"
                target="_blank"
                rel="noopener noreferrer"
              >
                <img
                  src="https://www.agenthunter.io/logo-light.svg"
                  alt="AgentHunter Badge"
                  width="40"
                />
              </a>
              <a
                href="https://findly.tools/anividai?utm_source=anividai"
                target="_blank"
              >
                <img
                  src="https://findly.tools/badges/findly-tools-badge-light.svg"
                  alt="Featured on findly.tools"
                  width="100"
                />
              </a>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="mt-6 flex flex-col justify-between gap-4 border-t border-border/10 pt-6 text-center text-[10px] font-bold uppercase tracking-widest text-muted-foreground/40 lg:flex-row lg:items-center lg:text-left">
          <p className="hover:text-foreground transition-colors duration-300">
            {t("copyright")}
          </p>
          {agreementItems && agreementItems.length > 0 && (
            <ul className="flex items-center justify-center gap-6 lg:justify-end">
              {agreementItems.map((item, index) => (
                <li
                  key={index}
                  className="hover:text-primary transition-all duration-300"
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
