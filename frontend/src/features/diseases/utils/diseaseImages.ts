/**
 * Static Disease Image Mapping & Visual Asset Registry
 *
 * Provides high-resolution clinical pathology images for all 20+ sunflower diseases
 * with fallback support to backend media uploads.
 */

// Import clinical images
import alternariaConcentric from "@/assets/images/Sunflower/Alternaria concentric leaf spots.jpeg";
import alternariaSource from "@/assets/images/Sunflower/Alternaria. Source.jpeg";
import asterYellows from "@/assets/images/Sunflower/Aster Yellows.jpeg";
import bacterialLeafSpot from "@/assets/images/Sunflower/Bacterial Leaf Spot.jpeg";
import bacterialStalkRot from "@/assets/images/Sunflower/Bacterial Stalk Rot.jpeg";
import charcoalRotPith from "@/assets/images/Sunflower/Charcoal rot peppery pith.jpeg";
import charcoalRotStem from "@/assets/images/Sunflower/Charcoal rot stem discoloration.jpeg";
import downyMildew from "@/assets/images/Sunflower/downey.jpeg";
import fusariumWilt from "@/assets/images/Sunflower/Fusarium Wilt.jpeg";
import licensedImage from "@/assets/images/Sunflower/licensed-image.jpeg";
import powderyMildew from "@/assets/images/Sunflower/owdery mildew foliar coating..jpeg";
import phomaBlackStem from "@/assets/images/Sunflower/Phoma black stem lesion.jpeg";
import phomopsisStemCanker from "@/assets/images/Sunflower/Phomopsis Stem Canker.jpeg";
import pythiumDampingOff from "@/assets/images/Sunflower/Post-emergence Pythium damping-off. Source- ResearchGate.jpeg";
import rhizopusHeadRot from "@/assets/images/Sunflower/Rhizopus head rot decay.jpeg";
import rustStages from "@/assets/images/Sunflower/Rust stages.jpeg";
import rustImage from "@/assets/images/Sunflower/rust-image.jpeg";
import sclerotiniaSkeleton from "@/assets/images/Sunflower/Sclerotinia skeleton.jpeg";
import sclerotiniaStalkRot from "@/assets/images/Sunflower/Sclerotinia Stalk Rot.jpeg";
import sunflowerMosaicVirus from "@/assets/images/Sunflower/unflower mosaic virus.jpeg";
import verticilliumVascular from "@/assets/images/Sunflower/Verticillium vascular discoloration.jpeg";
import verticilliumMottle from "@/assets/images/Sunflower/Verticillium wilt leaf mottle.jpeg";
import whiteRust from "@/assets/images/Sunflower/White rust blister pustules.jpeg";

/**
 * Primary image lookup table by disease slug
 */
const DISEASE_IMAGE_MAP: Record<string, string> = {
  // Sclerotinia
  "sclerotinia-basal-stalk-rot": sclerotiniaStalkRot,
  "sclerotinia-head-rot": sclerotiniaSkeleton,
  "head-rot": sclerotiniaSkeleton,

  // Rust
  "sunflower-rust": rustImage,
  rust: rustImage,

  // Mildews
  "downy-mildew": downyMildew,
  "powdery-mildew": powderyMildew,
  "white-rust": whiteRust,

  // Stalk & Stem diseases
  "phomopsis-stem-canker": phomopsisStemCanker,
  "phoma-black-stem": phomaBlackStem,
  "charcoal-rot": charcoalRotPith,

  // Wilts
  "verticillium-wilt": verticilliumMottle,
  "fusarium-wilt": fusariumWilt,

  // Leaf spots
  "alternaria-leaf-spot": alternariaConcentric,
  "alternaria-leaf-blight": alternariaConcentric,
  "septoria-leaf-spot": alternariaSource,
  "cercospora-leaf-spot": licensedImage,

  // Head rots
  "rhizopus-head-rot": rhizopusHeadRot,
  "botrytis-gray-mold": sclerotiniaSkeleton,

  // Bacterial
  "bacterial-stalk-head-rot": bacterialStalkRot,
  "bacterial-leaf-spot": bacterialLeafSpot,

  // Seedling, Viral, Anthracnose & Parasites
  "pythium-damping-off": pythiumDampingOff,
  "aster-yellows": asterYellows,
  "sunflower-mosaic-virus": sunflowerMosaicVirus,
  "sunflower-necrosis-virus": sunflowerMosaicVirus,
  "sunflower-anthracnose": alternariaSource,
  "sunflower-broomrape": licensedImage,
};

/**
 * Gallery images for detailed multi-angle pathology inspection
 */
const DISEASE_GALLERY_MAP: Record<string, string[]> = {
  "alternaria-leaf-spot": [alternariaConcentric, alternariaSource],
  "charcoal-rot": [charcoalRotPith, charcoalRotStem],
  "sunflower-rust": [rustImage, rustStages],
  rust: [rustImage, rustStages],
  "sclerotinia-basal-stalk-rot": [sclerotiniaStalkRot, sclerotiniaSkeleton],
  "sclerotinia-head-rot": [sclerotiniaSkeleton, sclerotiniaStalkRot],
  "verticillium-wilt": [verticilliumMottle, verticilliumVascular],
};

/**
 * Resolves the disease image with priority:
 * 1. Backend uploaded media URL (if valid)
 * 2. Static bundled high-resolution clinical image by slug
 * 3. undefined (falls back to UI placeholder)
 */
export function getDiseaseImage(slug?: string | null, backendUrl?: string | null): string | undefined {
  if (backendUrl && backendUrl.trim() !== "") {
    return backendUrl;
  }
  if (!slug) return undefined;
  return DISEASE_IMAGE_MAP[slug];
}

/**
 * Returns a gallery list of clinical photos for a disease if available.
 */
export function getDiseaseGallery(slug?: string | null): string[] {
  if (!slug) return [];
  const gallery = DISEASE_GALLERY_MAP[slug];
  if (gallery && gallery.length > 0) {
    return gallery;
  }
  const single = DISEASE_IMAGE_MAP[slug];
  return single ? [single] : [];
}
