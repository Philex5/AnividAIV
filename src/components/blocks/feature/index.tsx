import Icon from "@/components/icon";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import { Section as SectionType } from "@/types/blocks/section";
import { cn } from "@/lib/utils";
import { toImageUrl } from "@/lib/r2-utils";

interface FeatureItemWithMedia {
  id?: string;
  title: string;
  description: string;
  icon?: string;
  media?: {
    type: 'image' | 'video' | 'generation-demo' | 'editing-demo' | 'before-after';
    src?: string;
    before_src?: string;
    after_src?: string;
    poster?: string;
    alt: string;
  };
  features?: string[];
  cta?: {
    title: string;
    url: string;
  };
}

const MediaDisplay = ({ media, priority = false }: { 
  media: FeatureItemWithMedia['media']; 
  priority?: boolean;
}) => {
  if (!media) return null;

  switch (media.type) {
    case 'image':
      return (
        <div className="relative group">
          <img
            src={toImageUrl(media.src)}
            alt={media.alt}
            loading={priority ? 'eager' : 'lazy'}
            className={cn(
              "w-full h-auto rounded-lg shadow-lg border border-border",
              "transform transition-all duration-300",
              "group-hover:scale-105 group-hover:shadow-xl"
            )}
          />
        </div>
      );

    case 'video':
      return (
        <div className="relative group">
          <video
            src={toImageUrl(media.src)}
            className={cn(
              "w-full h-auto rounded-lg shadow-lg border border-border",
              "transform transition-all duration-300",
              "group-hover:scale-105 group-hover:shadow-xl"
            )}
            controls
            preload="metadata"
            poster={media.poster ? toImageUrl(media.poster) : undefined}
          >
            {media.alt && (
              <track kind="captions" />
            )}
            Your browser does not support video playback.
          </video>
        </div>
      );

    case 'generation-demo':
    case 'editing-demo':
      return (
        <div className="relative group">
          <img
            src={toImageUrl(media.src)}
            alt={media.alt}
            loading={priority ? 'eager' : 'lazy'}
            className={cn(
              "w-full h-auto rounded-lg shadow-lg border border-border",
              "transform transition-all duration-300",
              "group-hover:scale-105 group-hover:shadow-xl"
            )}
          />
        </div>
      );

    case 'before-after':
      return (
        <div className="relative group">
          <div className="grid grid-cols-2 gap-4">
            <div className="relative">
              <img
                src={toImageUrl(media.before_src)}
                alt="Before conversion"
                loading={priority ? 'eager' : 'lazy'}
                className="w-full h-auto rounded-lg shadow-lg border border-border transform transition-all duration-300 group-hover:scale-105"
              />
              <div className="absolute top-2 left-2 bg-black/70 text-white px-2 py-1 rounded text-xs font-medium">
                Before
              </div>
            </div>
            <div className="relative">
              <img
                src={toImageUrl(media.after_src)}
                alt="After conversion"
                loading={priority ? 'eager' : 'lazy'}
                className="w-full h-auto rounded-lg shadow-lg border border-border transform transition-all duration-300 group-hover:scale-105"
              />
              <div className="absolute top-2 left-2 bg-primary/90 text-primary-foreground px-2 py-1 rounded text-xs font-medium">
                After
              </div>
            </div>
          </div>
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="w-12 h-12 bg-primary rounded-full flex items-center justify-center shadow-lg">
              <Icon name="RiArrowRightLine" className="w-6 h-6 text-primary-foreground" />
            </div>
          </div>
        </div>
      );
    
    default:
      return null;
  }
};

const FeatureSection = ({ 
  feature, 
  index, 
  isReversed 
}: { 
  feature: FeatureItemWithMedia; 
  index: number;
  isReversed: boolean;
}) => {
  return (
    <div 
      className={cn(
        "feature-section py-16 lg:py-24 first:pt-8",
        "grid lg:grid-cols-2 gap-8 lg:gap-16 items-center",
        isReversed && "lg:grid-flow-col-dense"
      )}
    >
      {/* Content Section */}
      <div 
        className={cn(
          "feature-content space-y-6",
          isReversed ? "lg:col-start-2" : "lg:col-start-1"
        )}
      >
        <div className="space-y-4">
          <h3 className="text-2xl lg:text-3xl font-bold text-foreground">
            {feature.title}
          </h3>
          
          <p className="text-lg text-muted-foreground leading-relaxed">
            {feature.description}
          </p>
        </div>
        
        {feature.features && feature.features.length > 0 && (
          <div className="space-y-3">
            {feature.features.map((featureText, i) => (
              <div key={i} className="flex items-start space-x-3">
                <div className="w-2 h-2 rounded-full bg-primary flex-shrink-0 mt-2" />
                <span className="text-foreground leading-relaxed">{featureText}</span>
              </div>
            ))}
          </div>
        )}
        
        {feature.cta && (
          <div className="pt-4">
            <Link href={feature.cta.url as any}>
              <Button 
                size="lg"
                className="group hover:scale-105 transition-all duration-200"
              >
                {feature.cta.title}
                <Icon name="RiArrowRightLine" className="ml-2 w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </Button>
            </Link>
          </div>
        )}
      </div>
      
      {/* Media Section */}
      <div 
        className={cn(
          "feature-media",
          isReversed ? "lg:col-start-1" : "lg:col-start-2"
        )}
      >
        {feature.media && (
          <MediaDisplay
            media={feature.media}
            priority={index === 0}
          />
        )}
      </div>
    </div>
  );
};

export default function Feature({ section }: { section: SectionType }) {
  if (section.disabled) {
    return null;
  }

  // Check if items have media property - if so, use enhanced layout
  const hasMediaItems = section.items?.some(item => 'media' in item);

  if (hasMediaItems) {
    return (
      <section id={section.name} className="py-16 lg:py-24">
        <div className="container max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl lg:text-4xl xl:text-5xl max-w-6xl font-bold text-foreground mb-6">
              {section.title}
            </h2>
            <p className="text-xl text-muted-foreground max-w-5xl mx-auto leading-relaxed">
              {section.description}
            </p>
          </div>
          
          <div className="space-y-0 divide-y divide-border/50">
            {section.items?.map((item, index) => (
              <FeatureSection
                key={(item as FeatureItemWithMedia).id || index}
                feature={item as FeatureItemWithMedia}
                index={index}
                isReversed={index % 2 === 1}
              />
            ))}
          </div>
        </div>
      </section>
    );
  }

  // Fallback to original simple grid layout
  return (
    <section id={section.name} className="py-16">
      <div className="container">
        <div className="mx-auto flex max-w-(--breakpoint-md) flex-col items-center gap-2">
          <h2 className="mb-2 text-pretty text-3xl font-bold lg:text-4xl">
            {section.title}
          </h2>
          <p className="mb-8 max-w-4xl text-muted-foreground lg:max-w-none lg:text-lg">
            {section.description}
          </p>
        </div>
        <div className="grid gap-10 md:grid-cols-2 lg:grid-cols-3">
          {section.items?.map((item, i) => (
            <div key={i} className="flex flex-col">
              <h3 className="mb-2 text-xl font-semibold">{item.title}</h3>
              <p className="text-muted-foreground">{item.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
