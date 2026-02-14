import { Button } from "@/components/ui/button";
import { Button as ButtonType } from "@/types/blocks/base";
import Icon from "@/components/icon";
import { Link } from "@/i18n/navigation";
import { getCreamyCharacterUrl } from "@/lib/asset-loader";

function renderButtonTitle(title?: string) {
  if (!title) {
    return null;
  }

  if (!title.includes("[MC]")) {
    return title;
  }

  const parts = title.split("[MC]");
  return parts.map((part, index) => (
    <span key={`${part}-${index}`} className="inline-flex items-center">
      {part}
      {index < parts.length - 1 && (
        <img
          src={getCreamyCharacterUrl("meow_coin")}
          className="mx-1 h-4 w-4 object-contain"
          alt="MC"
        />
      )}
    </span>
  ));
}

export default function Toolbar({ items }: { items?: ButtonType[] }) {
  return (
    <div className="flex space-x-4 mb-8">
      {items?.map((item, idx) => {
        const content = (
          <>
            {item.icon && <Icon name={item.icon} />}
            {renderButtonTitle(item.title)}
          </>
        );

        if (item.onClick) {
          return (
            <Button
              key={idx}
              variant={item.variant}
              size="sm"
              className={item.className}
              onClick={item.onClick}
            >
              {content}
            </Button>
          );
        }

        return (
          <Button
            key={idx}
            variant={item.variant}
            size="sm"
            className={item.className}
            asChild
          >
            <Link
              href={item.url as any}
              target={item.target}
              className="flex items-center gap-1"
            >
              {content}
            </Link>
          </Button>
        );
      })}
    </div>
  );
}
