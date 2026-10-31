import { ButtonLink, Card, CardContent } from '@terra-symposium/styling/ui';

export type StandardsHeroData = {
  tagline?: string;
  actions?: Array<{ text: string; link: string; variant?: string }>;
};

export function StandardsHero({ hero }: { hero: StandardsHeroData }) {
  if (!hero.tagline && !hero.actions?.length) return null;

  return (
    <section data-standards-docs-hero>
    <Card data-standards-hero-card variant="gray-tonal" size="sm" style={{ marginBottom: 28 }}>
      <CardContent>
        {hero.tagline && <p style={{ margin: '0 0 14px' }}>{hero.tagline}</p>}
        {hero.actions?.length ? (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
            {hero.actions.map((action) => (
              <ButtonLink
                key={`${action.text}:${action.link}`}
                href={action.link}
                variant={action.variant === 'minimal' ? 'secondary-outline' : 'primary'}
              >
                {action.text}<span aria-hidden="true">↗</span>
              </ButtonLink>
            ))}
          </div>
        ) : null}
      </CardContent>
    </Card>
    </section>
  );
}
