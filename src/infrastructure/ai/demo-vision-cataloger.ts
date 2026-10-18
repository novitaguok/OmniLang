import type { CatalogAnalysis, VisionCataloger } from '../../application/ports/vision-cataloger.js';
import type { ProductPhotoInput } from '../../application/ports/vision-cataloger.js';
import type { LanguageCode } from '../../domain/value-objects/language.js';

/**
 * Demo-mode vision cataloger: produces the canonical rattan-basket analysis
 * used across the prototype scenarios, without touching any cloud service.
 * Lets judges and developers exercise the full photo-to-catalog flow with
 * zero credentials.
 */
export class DemoVisionCataloger implements VisionCataloger {
  async analyze(_photo: ProductPhotoInput, merchantNote: string, _merchantLanguage: LanguageCode): Promise<CatalogAnalysis> {
    const noteMentionsBatik = /batik|kain/i.test(merchantNote);
    if (noteMentionsBatik) {
      return {
        title: 'Hand-Dyed Batik Textile Art (Pekalongan Style)',
        description:
          'A one-of-a-kind batik textile hand-drawn with traditional canting wax-resist techniques. Vibrant botanical motifs in deep indigo and warm soga brown, ready to frame, wear, or upholster.',
        tags: ['batik', 'handmade', 'textile', 'indonesian', 'art', 'handdyed', 'boho'],
        materials: ['cotton', 'beeswax', 'natural dyes'],
        colors: ['indigo', 'soga brown', 'cream'],
        craftsmanshipNotes: 'Hand-drawn canting technique; wax-resist dyeing in multiple passes.',
        careInstructions: 'Hand wash cold, dry in shade, iron on low with a cloth barrier.',
        estimatedDimensions: 'Approx. 100 cm × 100 cm',
      };
    }

    const noteMentionsInabel = /inabel|abel|banig|kumot|hablon|ilocos|pilipinas/i.test(merchantNote);
    if (noteMentionsInabel) {
      return {
        title: 'Handwoven Ilocos Inabel Cotton Blanket (Binakul Geometric Weave)',
        description:
          'Heirloom-quality Inabel cotton throw handwoven on traditional wooden pedal looms in Ilocos, Philippines. Features hypnotic Binakul optical-illusion patterns prized by interior designers worldwide.',
        tags: ['inabel', 'philippines', 'handwoven', 'binakul', 'artisan', 'textile', 'homedecor'],
        materials: ['100% hand-spun cotton', 'natural indigo dye'],
        colors: ['ocean blue', 'ivory white', 'terracotta'],
        craftsmanshipNotes: 'Woven on traditional 2-pedal wooden pangablan loom using double-toned warp threads.',
        careInstructions: 'Gentle cold wash with mild soap; line dry in shade.',
        estimatedDimensions: 'Approx. 150 cm × 200 cm',
      };
    }

    const noteMentionsJaipur = /jaipur|indigo|block|chadar|saree|dupatta|जयपुर|ब्लॉक|साड़ी|दुपट्टा|चादर/i.test(merchantNote);
    if (noteMentionsJaipur) {
      return {
        title: 'Hand-Block Printed Jaipur Indigo Cotton Throw (Natural Vegetable Dye)',
        description:
          'Artisanal Sanganeri hand-block printed cotton throw from Jaipur, Rajasthan. Stamped by master karigars using carved teakwood blocks and fermented natural indigo.',
        tags: ['jaipur', 'blockprint', 'indigo', 'indianartisan', 'handmade', 'sustainable', 'decor'],
        materials: ['organic mulmul cotton', 'natural indigo', 'madder root dye'],
        colors: ['deep indigo', 'madder red', 'unbleached cotton'],
        craftsmanshipNotes: 'Multi-stage Dabu mud-resist and carved teakwood block stamping.',
        careInstructions: 'Wash separately in cold water; dry away from direct sunlight.',
        estimatedDimensions: 'Approx. 140 cm × 220 cm',
      };
    }

    return {
      title: 'Handcrafted Boho Rattan Basket (Organic Natural Finish)',
      description:
        'Hand-woven rattan storage basket with a warm natural finish. Perfect as planter cover, market basket, or boho home storage. Each piece is unique and woven by a village artisan.',
      tags: ['handmade', 'rattan', 'basket', 'sustainable', 'bohohome', 'woven', 'storage'],
      materials: ['natural rattan', 'seagrass'],
      colors: ['natural brown', 'honey'],
      craftsmanshipNotes: 'Tight twill weave with reinforced rim; free-form organic shaping.',
      careInstructions: 'Wipe with a dry cloth; keep away from prolonged moisture.',
      estimatedDimensions: 'Approx. 28 cm diameter × 24 cm height',
    };
  }
}
