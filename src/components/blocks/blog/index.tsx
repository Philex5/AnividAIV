import { ArrowRight } from "lucide-react";
import { Blog as BlogType } from "@/types/blocks/blog";
import { Link } from "@/i18n/navigation";
import { Category } from "@/types/category";
import { useTranslations } from "next-intl";

export default function Blog({
  blog,
  categories,
  category,
}: {
  blog: BlogType;
  categories?: Category[];
  category?: string;
}) {
  const t = useTranslations();

  if (blog.disabled) {
    return null;
  }

  return (
    <section className="w-full py-16 lg:py-24">
      <div className="container px-4 md:px-8">
        <div className="text-center mb-12">
          {blog.label && (
            <p className="mb-6 text-xs font-medium uppercase tracking-wider">
              {blog.label}
            </p>
          )}
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-black font-anime mb-6 tracking-tight leading-tight mx-auto max-w-3xl">
            {blog.title}
          </h2>
          <p className="text-base sm:text-lg text-muted-foreground font-medium mb-10 max-w-2xl mx-auto">
            {blog.description}
          </p>
        </div>

        {categories && categories.length > 0 && (
          <div className="mb-8 flex flex-wrap items-center justify-center gap-4">
            <Link
              href={`/posts`}
              className={`px-4 py-1 rounded-full border transition-colors ${
                !category
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-background text-foreground hover:bg-muted"
              }`}
            >
              {t("blog.all")}
            </Link>
            {categories?.map((c) => (
              <Link
                key={c.uuid}
                href={`/posts?category=${encodeURIComponent(c.name)}`}
                className={`px-4 py-1 rounded-full border transition-colors ${
                  category === c.name
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-background text-foreground hover:bg-muted"
                }`}
              >
                {c.title || c.name}
              </Link>
            ))}
          </div>
        )}

        {blog.items && blog.items.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
            {blog.items?.map((item, idx) => (
              <a
                key={idx}
                href={item.url || `/${item.locale}/posts/${item.slug}`}
                target={item.target || "_self"}
                className="group flex flex-col overflow-clip rounded-2xl border border-border bg-background transition-all hover:shadow-lg"
              >
                {item.cover_url && (
                  <div className="aspect-[16/9] overflow-hidden">
                    <img
                      src={item.cover_url}
                      alt={item.title || ""}
                      className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                    />
                  </div>
                )}
                <div className="flex flex-1 flex-col p-6">
                  <h3 className="mb-3 text-xl font-bold line-clamp-2">
                    {item.title}
                  </h3>
                  <p className="mb-6 text-muted-foreground line-clamp-3 flex-1">
                    {item.description}
                  </p>
                  {blog.read_more_text && (
                    <p className="flex items-center text-sm font-bold text-primary group-hover:underline">
                      {blog.read_more_text}
                      <ArrowRight className="ml-2 size-4" />
                    </p>
                  )}
                </div>
              </a>
            ))}
          </div>
        ) : (
          <div className="text-center text-muted-foreground text-md py-12">
            {t("blog.no_content")}
          </div>
        )}
      </div>
    </section>
  );
}
