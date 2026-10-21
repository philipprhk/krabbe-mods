// Herausgeber und Bereich je Skill, nach dem Grundnamen (ohne „plugin:“-Vorsatz).
// Belegt heißt: steht so in den Skill-Dateien oder in der Herkunft der Installation.

export const HERAUSGEBER = {
  eigene: 'Eigene',
  emil: 'Emil Kowalski',
  meng: 'Meng To',
  owl: 'Designer Skills Pack (MC Dean)',
  claudekit: 'ClaudeKit',
  anthropic: 'Anthropic',
  claudeCode: 'Anthropic · in Claude Code eingebaut',
  taste: 'Taste-Skill',
  impeccable: 'impeccable',
  uiux: 'UI UX Pro Max',
  humanizer: 'humanizer',
  legal: 'Legal-Paket · Herausgeber unbekannt',
  video: 'claude-video (bradautomates)',
  typesafe: 'typesafe-ai',
  img2threejs: 'img2threejs (GitHub)',
  instagram: 'Instagram Agent (Jake Schincariol)',
  unbekannt: 'Herausgeber unbekannt',
} as const

export const BEREICHE = {
  design: 'Design & UI',
  animation: 'Animation & Motion',
  dreid: '3D & WebGL',
  marke: 'Marketing & Marke',
  recht: 'Recht & Verträge',
  texte: 'Texte & Dokumente',
  recherche: 'Recherche & Video',
  browser: 'Browser & Computer',
  code: 'Code & Entwicklung',
  claude: 'Claude einrichten & erweitern',
  sonstiges: 'Sonstiges',
} as const

type H = keyof typeof HERAUSGEBER
type B = keyof typeof BEREICHE

const eintraege: [string, H, B][] = [
  // Emil Kowalski
  ['animate', 'emil', 'animation'],
  ['animate-expo', 'emil', 'animation'],
  ['animation-vocabulary', 'emil', 'animation'],
  ['find-animation-opportunities', 'emil', 'animation'],
  ['improve-animations', 'emil', 'animation'],
  ['review-animations', 'emil', 'animation'],
  ['animation-performance', 'emil', 'animation'],
  ['ask-sonner', 'emil', 'design'],
  ['break-ui', 'emil', 'design'],
  ['emil-design-eng', 'emil', 'design'],
  ['mobile-native', 'emil', 'design'],
  ['pick-ui-library', 'emil', 'design'],
  ['prototype', 'emil', 'design'],
  ['apple-design', 'emil', 'design'],
  ['write-swift', 'emil', 'code'],

  // Meng To (github.com/MengTo/Skills, Auswahl)
  ['landing-page', 'meng', 'design'],
  ['pricing-page', 'meng', 'design'],
  ['product-proof-saas', 'meng', 'design'],
  ['no-ai-design-slop', 'meng', 'design'],
  ['audit-ai-design-slop', 'meng', 'design'],
  ['design-first-ui-prompting', 'meng', 'design'],
  ['beautiful-shadows', 'meng', 'design'],
  ['css-border-gradient', 'meng', 'design'],
  ['progressive-blur', 'meng', 'design'],
  ['marquee-loop', 'meng', 'design'],
  ['company-logos', 'meng', 'design'],
  ['unsplash-asset-images', 'meng', 'design'],
  ['gsap', 'meng', 'animation'],
  ['masked-reveal', 'meng', 'animation'],
  ['staggered-word-reveal', 'meng', 'animation'],
  ['animation-on-scroll', 'meng', 'animation'],
  ['scroll-scrubbed-visual-sequence', 'meng', 'animation'],
  ['cinematic-scroll-storytelling', 'meng', 'animation'],
  ['optimize-web-animations', 'meng', 'animation'],
  ['threejs', 'meng', 'dreid'],
  ['webgl-3d-object', 'meng', 'dreid'],
  ['3d-cloth-material', 'meng', 'dreid'],
  ['3d-falling-leaves', 'meng', 'dreid'],
  ['3d-four-seasons', 'meng', 'dreid'],
  ['3d-high-poly-models', 'meng', 'dreid'],
  ['3d-high-resolution-textures', 'meng', 'dreid'],
  ['3d-metal-material', 'meng', 'dreid'],
  ['3d-orbit-inspect-demo', 'meng', 'dreid'],
  ['3d-paper-material', 'meng', 'dreid'],
  ['3d-retina-resolution', 'meng', 'dreid'],
  ['3d-sky-background', 'meng', 'dreid'],
  ['3d-sky-rays', 'meng', 'dreid'],
  ['3d-ultra-realistic-water', 'meng', 'dreid'],
  ['3d-underwater-god-rays', 'meng', 'dreid'],
  ['3d-virtual-tour', 'meng', 'dreid'],
  ['3d-wood-lighting-scorecard', 'meng', 'dreid'],
  ['3d-wood-material', 'meng', 'dreid'],
  ['video-to-superprompt', 'meng', 'recherche'],
  ['html-to-interaction-prompts', 'meng', 'recherche'],
  ['stitched-full-page-capture', 'meng', 'recherche'],

  // Designer Skills Pack (github.com/Owl-Listener/designer-skills, Marktplatz designer-skills)
  ['behavioural-analytics', 'owl', 'recherche'],
  ['critique-screen', 'owl', 'design'],
  ['critique-ux', 'owl', 'design'],
  ['critique-visual-hierarchy', 'owl', 'design'],
  ['critique-affordance', 'owl', 'design'],
  ['critique-information-density', 'owl', 'design'],
  ['critique-composition', 'owl', 'design'],
  ['critique-typography', 'owl', 'design'],
  ['critique-color', 'owl', 'design'],
  ['critique-brand-consistency', 'owl', 'design'],

  // Lokal installiert, ohne Herausgeber in den Dateien
  ['find-skills', 'unbekannt', 'claude'],
  ['brandkit', 'unbekannt', 'marke'],
  ['ponytail', 'unbekannt', 'design'],

  // ClaudeKit (author: claudekit)
  ['banner-design', 'claudekit', 'marke'],
  ['brand', 'claudekit', 'marke'],
  ['design', 'claudekit', 'marke'],
  ['design-system', 'claudekit', 'design'],
  ['slides', 'claudekit', 'texte'],
  ['ui-styling', 'claudekit', 'design'],

  // Weitere Pakete
  ['design-taste-frontend', 'taste', 'design'],
  ['design-taste-frontend-v1', 'taste', 'design'],
  ['high-end-visual-design', 'taste', 'design'],
  ['redesign-existing-projects', 'taste', 'design'],
  ['minimalist-ui', 'taste', 'design'],
  ['industrial-brutalist-ui', 'taste', 'design'],
  ['gpt-taste', 'taste', 'design'],
  ['stitch-design-taste', 'taste', 'design'],
  ['image-to-code', 'taste', 'design'],
  ['imagegen-frontend-web', 'taste', 'design'],
  ['imagegen-frontend-mobile', 'taste', 'design'],
  ['full-output-enforcement', 'taste', 'code'],
  ['impeccable', 'impeccable', 'design'],
  ['ui-ux-pro-max', 'uiux', 'design'],
  ['humanizer', 'humanizer', 'texte'],

  // Recht
  ['contract-comparison', 'legal', 'recht'],
  ['counter-proposal-generator', 'legal', 'recht'],
  ['custom-nda-generator', 'legal', 'recht'],
  ['deep-risk-analysis', 'legal', 'recht'],
  ['missing-protections-finder', 'legal', 'recht'],
  ['plain-english-translation', 'legal', 'recht'],
  ['terms-of-service-generator', 'legal', 'recht'],

  // Anthropic
  ['docx', 'anthropic', 'texte'],
  ['xlsx', 'anthropic', 'texte'],
  ['pptx', 'anthropic', 'texte'],
  ['pdf', 'anthropic', 'texte'],
  ['docs', 'anthropic', 'texte'],
  ['setup-writing-style', 'anthropic', 'texte'],
  ['deep-research', 'anthropic', 'recherche'],
  ['morning', 'anthropic', 'recherche'],
  ['chrome-browser', 'anthropic', 'browser'],
  ['built-in-browser', 'anthropic', 'browser'],
  ['computer-use', 'anthropic', 'browser'],
  ['google-workspace', 'anthropic', 'browser'],
  ['skill-creator', 'anthropic', 'claude'],
  ['import-memory', 'anthropic', 'claude'],
  ['consolidate-memory', 'anthropic', 'claude'],
  ['explain-usage', 'anthropic', 'claude'],
  ['setup-claude', 'anthropic', 'claude'],
  ['schedule', 'anthropic', 'claude'],
  ['cowork-plugin-customizer', 'anthropic', 'claude'],
  ['create-cowork-plugin', 'anthropic', 'claude'],

  // In Claude Code eingebaut
  ['dataviz', 'claudeCode', 'design'],
  ['artifact-design', 'claudeCode', 'design'],
  ['artifact-diagramming', 'claudeCode', 'design'],
  ['artifact-capabilities', 'claudeCode', 'claude'],
  ['update-config', 'claudeCode', 'claude'],
  ['keybindings-help', 'claudeCode', 'claude'],
  ['fewer-permission-prompts', 'claudeCode', 'claude'],
  ['loop', 'claudeCode', 'claude'],
  ['plugin-authoring', 'claudeCode', 'claude'],
  ['code-review', 'claudeCode', 'code'],
  ['simplify', 'claudeCode', 'code'],
  ['security-review', 'claudeCode', 'code'],
  ['init', 'claudeCode', 'code'],
  ['run', 'claudeCode', 'code'],
  ['claude-api', 'claudeCode', 'code'],

  // Plugins aus fremden Marktplätzen
  ['watch', 'video', 'recherche'],
  ['typesafe-ai', 'typesafe', 'code'],

  // Von GitHub geklont
  ['img2threejs', 'img2threejs', 'dreid'],

  // github.com/Jakeschincariol/instagram-agent-skill (MIT, Autor in LICENSE und plugin.json)
  ['ig-audit', 'instagram', 'marke'],
  ['ig-caption', 'instagram', 'marke'],
  ['ig-carousel', 'instagram', 'marke'],
  ['ig-comment', 'instagram', 'marke'],
  ['ig-dm', 'instagram', 'marke'],
  ['ig-human', 'instagram', 'marke'],
  ['ig-plan', 'instagram', 'marke'],
  ['ig-profile', 'instagram', 'marke'],
  ['ig-reel', 'instagram', 'marke'],
  ['ig-reply', 'instagram', 'marke'],
  ['ig-repurpose', 'instagram', 'marke'],
  ['ig-story', 'instagram', 'marke'],
  ['ig-viral', 'instagram', 'marke'],

  // img2-Plugins (über den img2-Plugin-Manager, verlinkt aus ~/.img2/plugins)
  ['img2-character', 'img2threejs', 'dreid'],
]

export type Eintrag = { herausgeber: string; bereich: string }

export const KATALOG: ReadonlyMap<string, Eintrag> = new Map(
  eintraege.map(([name, h, b]) => [name, { herausgeber: HERAUSGEBER[h], bereich: BEREICHE[b] }]),
)

// Reihenfolge der Gruppen im Fenster: eigene und häufig genutzte zuerst.
export const REIHENFOLGE_HERAUSGEBER: readonly string[] = Object.values(HERAUSGEBER)
export const REIHENFOLGE_BEREICHE: readonly string[] = Object.values(BEREICHE)
