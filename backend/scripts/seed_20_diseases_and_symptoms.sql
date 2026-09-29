-- ============================================================================
-- SUNFLOWER EXPERT SYSTEM: MASTER SEED SCRIPT (20 DISEASES & 62 SYMPTOMS)
-- Database Engine: PostgreSQL 13+
-- Locales: English ('en'), Khmer ('km')
-- Idempotency: Fully safe for multiple re-executions (ON CONFLICT DO NOTHING / UPDATE)
-- ============================================================================

BEGIN;

-- ============================================================================
-- SECTION 1: INSERT ALL 20 DISEASES
-- ============================================================================
INSERT INTO diseases (slug, pathogen_type, is_published, created_at, updated_at)
VALUES
    ('sclerotinia-basal-stalk-rot', 'fungal',    true, NOW(), NOW()),
    ('sclerotinia-head-rot',        'fungal',    true, NOW(), NOW()),
    ('sunflower-rust',              'fungal',    true, NOW(), NOW()),
    ('downy-mildew',                'other',     true, NOW(), NOW()),
    ('phomopsis-stem-canker',       'fungal',    true, NOW(), NOW()),
    ('phoma-black-stem',            'fungal',    true, NOW(), NOW()),
    ('verticillium-wilt',           'fungal',    true, NOW(), NOW()),
    ('charcoal-rot',                'fungal',    true, NOW(), NOW()),
    ('fusarium-wilt',               'fungal',    true, NOW(), NOW()),
    ('alternaria-leaf-spot',        'fungal',    true, NOW(), NOW()),
    ('septoria-leaf-spot',          'fungal',    true, NOW(), NOW()),
    ('cercospora-leaf-spot',        'fungal',    true, NOW(), NOW()),
    ('powdery-mildew',              'fungal',    true, NOW(), NOW()),
    ('white-rust',                  'other',     true, NOW(), NOW()),
    ('rhizopus-head-rot',           'fungal',    true, NOW(), NOW()),
    ('botrytis-gray-mold',          'fungal',    true, NOW(), NOW()),
    ('bacterial-stalk-head-rot',    'bacterial', true, NOW(), NOW()),
    ('bacterial-leaf-spot',         'bacterial', true, NOW(), NOW()),
    ('pythium-damping-off',         'other',     true, NOW(), NOW()),
    ('aster-yellows',               'bacterial', true, NOW(), NOW())
ON CONFLICT (slug) DO NOTHING;

-- ============================================================================
-- SECTION 2: INSERT DISEASE TRANSLATIONS (EN & KM)
-- ============================================================================
INSERT INTO translations (entity_type, entity_id, locale, field, value)
VALUES
    -- 1. Sclerotinia Basal Stalk Rot
    ('disease', (SELECT id FROM diseases WHERE slug = 'sclerotinia-basal-stalk-rot'), 'en', 'name', 'Sclerotinia Basal Stalk Rot (White Mold)'),
    ('disease', (SELECT id FROM diseases WHERE slug = 'sclerotinia-basal-stalk-rot'), 'en', 'description', 'Soilborne fungal infection causing water-soaked basal cankers, chalky bleached stems, shredded internal pith, and plant lodging during flowering and seed fill.'),
    ('disease', (SELECT id FROM diseases WHERE slug = 'sclerotinia-basal-stalk-rot'), 'en', 'treatment', 'Incurable post-infection once vascular bundles are girdled. Rogue out and incinerate or deeply bury infected stalks to prevent sclerotia return to soil.'),
    ('disease', (SELECT id FROM diseases WHERE slug = 'sclerotinia-basal-stalk-rot'), 'en', 'prevention', '4 to 5 year crop rotation with non-host monocots (corn, wheat, sorghum), avoid rotating with soybeans or canola, optimize plant spacing for canopy aeration.'),
    ('disease', (SELECT id FROM diseases WHERE slug = 'sclerotinia-basal-stalk-rot'), 'km', 'name', 'ជំងឺរលួយគល់ដើម Sclerotinia (ផ្សិតស)'),
    ('disease', (SELECT id FROM diseases WHERE slug = 'sclerotinia-basal-stalk-rot'), 'km', 'description', 'ជំងឺផ្សិតក្នុងដីដែលបណ្តាលឱ្យគល់ដើមជាំទឹក សំបកដើមឡើងសស្លេកដូចដីស បណ្តូលដើមរលួយសរសៃស្វិត និងដើមបាក់រលំក្នុងដំណាក់កាលចេញផ្កានិងដាក់គ្រាប់។'),
    ('disease', (SELECT id FROM diseases WHERE slug = 'sclerotinia-basal-stalk-rot'), 'km', 'treatment', 'គ្មានថ្នាំគីមីព្យាបាលជាសះស្បើយពេលមេរោគចូលដើមឡើយ។ ត្រូវដកដើមឈឺដាក់ថង់ដុតចោល ឬកប់ឱ្យជ្រៅដើម្បីកុំឱ្យគ្រាប់កកផ្សិតធ្លាក់ចូលដី។'),
    ('disease', (SELECT id FROM diseases WHERE slug = 'sclerotinia-basal-stalk-rot'), 'km', 'prevention', 'ផ្លាស់ប្តូរមុខដំណាំ ៤ ទៅ ៥ ឆ្នាំជាមួយពោតឬស្រូវសាលី ចៀសវាងដាំឆ្លាស់ជាមួយសណ្តែកសៀងឬកាណូឡា និងរក្សាគម្លាតគុម្ពឱ្យមានខ្យល់ចេញចូលល្អ។'),

    -- 2. Sclerotinia Head Rot
    ('disease', (SELECT id FROM diseases WHERE slug = 'sclerotinia-head-rot'), 'en', 'name', 'Sclerotinia Head Rot'),
    ('disease', (SELECT id FROM diseases WHERE slug = 'sclerotinia-head-rot'), 'en', 'description', 'Airborne fungal infection of blooming flower heads causing water-soaked soft rot of the receptacle, skeletonized fiber matrices, and internal black sclerotia.'),
    ('disease', (SELECT id FROM diseases WHERE slug = 'sclerotinia-head-rot'), 'en', 'treatment', 'Post-infection fungicide sprays are ineffective. Harvest early to salvage remaining clean seed and mechanically separate sclerotia using gravity tables.'),
    ('disease', (SELECT id FROM diseases WHERE slug = 'sclerotinia-head-rot'), 'en', 'prevention', 'Apply preventative fungicides (boscalid or fluopyram) at bloom onset (R5.1–R5.2), avoid overhead irrigation during flowering, and choose downward-nodding hybrids.'),
    ('disease', (SELECT id FROM diseases WHERE slug = 'sclerotinia-head-rot'), 'km', 'name', 'ជំងឺរលួយក្បាលផ្កា Sclerotinia'),
    ('disease', (SELECT id FROM diseases WHERE slug = 'sclerotinia-head-rot'), 'km', 'description', 'ជំងឺផ្សិតហោះតាមខ្យល់ធ្លាក់លើក្បាលផ្ការីក បណ្តាលឱ្យខ្នងផ្ការលួយជាំទឹកទន់ ក្បាលផ្ការលួយសរសៃសុទ្ធដូចអំបោស និងកកើតគ្រាប់កកខ្មៅរឹងក្នុងក្បាលផ្កា។'),
    ('disease', (SELECT id FROM diseases WHERE slug = 'sclerotinia-head-rot'), 'km', 'treatment', 'ថ្នាំបាញ់ក្រោយពេលផ្ការលួយគ្មានប្រសិទ្ធភាពទេ។ ត្រូវប្រមូលផលឱ្យលឿនដើម្បីស្រង់គ្រាប់ល្អ និងរើសគ្រាប់កកខ្មៅចេញដោយប្រើតម្រងរែង។'),
    ('disease', (SELECT id FROM diseases WHERE slug = 'sclerotinia-head-rot'), 'km', 'prevention', 'បាញ់ថ្នាំការពារ (Boscalid ឬ Fluopyram) នៅពេលផ្កាចាប់ផ្តើមរីក (R5.1–R5.2) ចៀសវាងស្រោចស្រពទឹកពីលើផ្កា និងជ្រើសរើសពូជផ្កាងក់ក្បាលចុះក្រោម។'),

    -- 3. Sunflower Rust
    ('disease', (SELECT id FROM diseases WHERE slug = 'sunflower-rust'), 'en', 'name', 'Sunflower Rust (Puccinia helianthi)'),
    ('disease', (SELECT id FROM diseases WHERE slug = 'sunflower-rust'), 'en', 'description', 'Foliar fungal disease characterized by cinnamon-brown powdery urediniospores and late-season black teliospores causing premature defoliation and severe yield loss.'),
    ('disease', (SELECT id FROM diseases WHERE slug = 'sunflower-rust'), 'en', 'treatment', 'Foliar fungicides (pyraclostrobin, azoxystrobin, tebuconazole, or fluxapyroxad) applied when average rust severity on upper leaves reaches 1% before bloom completion.'),
    ('disease', (SELECT id FROM diseases WHERE slug = 'sunflower-rust'), 'en', 'prevention', 'Plant resistant sunflower hybrids with stacked rust resistance genes (R-genes), destroy wild volunteer sunflowers that harbor overwintering teliospores, and avoid excessive nitrogen fertilization.'),
    ('disease', (SELECT id FROM diseases WHERE slug = 'sunflower-rust'), 'km', 'name', 'ជំងឺច្រែះផ្កាឈូករ័ត្ន (Sunflower Rust)'),
    ('disease', (SELECT id FROM diseases WHERE slug = 'sunflower-rust'), 'km', 'description', 'ជំងឺផ្សិតលើស្លឹកដែលបង្កើតជាពងបែកម្សៅពណ៌ត្នោតច្រែះ និងពងបែករឹងពណ៌ខ្មៅនៅចុងរដូវ ធ្វើឱ្យស្លឹកស្ងួតជ្រុះ និងថយចុះទិន្នផលគ្រាប់យ៉ាងខ្លាំង។'),
    ('disease', (SELECT id FROM diseases WHERE slug = 'sunflower-rust'), 'km', 'treatment', 'បាញ់ថ្នាំផ្សិតលើស្លឹក (Pyraclostrobin, Azoxystrobin, Tebuconazole) នៅពេលកម្រិតរាលដាលលើស្លឹកខាងលើឡើងដល់ ១% មុនពេលផ្ការីកចប់។'),
    ('disease', (SELECT id FROM diseases WHERE slug = 'sunflower-rust'), 'km', 'prevention', 'ដាំពូជផ្កាឈូករ័ត្នធន់ជំងឺ កម្ចាត់កូនផ្កាឈូករ័ត្នព្រៃដែលដុះឯកឯង (ដែលជាប្រភពរក្សាមេរោគឆ្លងរដូវ) និងចៀសវាងការដាក់ជីអាសូតច្រើនហួសប្រមាណ។'),

    -- 4. Downy Mildew
    ('disease', (SELECT id FROM diseases WHERE slug = 'downy-mildew'), 'en', 'name', 'Downy Mildew (Plasmopara halstedii)'),
    ('disease', (SELECT id FROM diseases WHERE slug = 'downy-mildew'), 'en', 'description', 'Soilborne and seedborne oomycete pathogen causing systemic chlorosis, dense white downy felt on leaf undersides, extreme plant stunting, and erect sterile heads.'),
    ('disease', (SELECT id FROM diseases WHERE slug = 'downy-mildew'), 'en', 'treatment', 'Foliar post-infection fungicides are ineffective against systemic infections. Immediately rogue out and dispose of systemically infected dwarf plants.'),
    ('disease', (SELECT id FROM diseases WHERE slug = 'downy-mildew'), 'en', 'prevention', 'Plant certified hybrid seed treated with oxathiapiprolin or metalaxyl/mefenoxam fungicides, improve field drainage to prevent waterlogging, and implement a 4+ year crop rotation.'),
    ('disease', (SELECT id FROM diseases WHERE slug = 'downy-mildew'), 'km', 'name', 'ជំងឺផ្សិតផ្កាស្លែ (Downy Mildew)'),
    ('disease', (SELECT id FROM diseases WHERE slug = 'downy-mildew'), 'km', 'description', 'ជំងឺអូមីសែតឆ្លងតាមគ្រាប់និងដី បណ្តាលឱ្យស្លឹកឡើងឆ្នូតលឿង មានស្រទាប់រោមសដូចកប្បាសនៅបាតក្រោមស្លឹក ដើមក្រិនខ្លាំងមិនលូតកម្ពស់ និងផ្កាឈរត្រង់គ្មានគ្រាប់។'),
    ('disease', (SELECT id FROM diseases WHERE slug = 'downy-mildew'), 'km', 'treatment', 'ថ្នាំបាញ់លើស្លឹកគ្មានប្រសិទ្ធភាពលើរុក្ខជាតិដែលមេរោគចូលក្នុងដើមនោះទេ។ ត្រូវដកដើមក្រិនដែលកើតជំងឺចោលជាបន្ទាន់។'),
    ('disease', (SELECT id FROM diseases WHERE slug = 'downy-mildew'), 'km', 'prevention', 'ដាំគ្រាប់ពូជដែលបានប្រឡាក់ថ្នាំការពារ (Oxathiapiprolin ឬ Mefenoxam) រៀបចំប្រព័ន្ធរំដោះទឹកកុំឱ្យជាំទឹកក្នុងដី និងអនុវត្តការដាំដំណាំឆ្លាស់យ៉ាងតិច ៤ ឆ្នាំ។'),

    -- 5. Phomopsis Stem Canker
    ('disease', (SELECT id FROM diseases WHERE slug = 'phomopsis-stem-canker'), 'en', 'name', 'Phomopsis Stem Canker (Diaporthe helianthi)'),
    ('disease', (SELECT id FROM diseases WHERE slug = 'phomopsis-stem-canker'), 'en', 'description', 'Destructive fungal disease producing large sunken tan-to-gray stem lesions centered on leaf petioles, hollow degraded stems that crush easily, and widespread lodging.'),
    ('disease', (SELECT id FROM diseases WHERE slug = 'phomopsis-stem-canker'), 'en', 'treatment', 'Apply protectant fungicides (pyraclostrobin, prothioconazole, fluxapyroxad) between developmental stages V8 and R1 before petiole infections reach the main stem.'),
    ('disease', (SELECT id FROM diseases WHERE slug = 'phomopsis-stem-canker'), 'en', 'prevention', 'Select tolerant sunflower hybrids, manage plant population to limit dense humid microclimates, and chop/bury crop residues to accelerate overwintering stalk decomposition.'),
    ('disease', (SELECT id FROM diseases WHERE slug = 'phomopsis-stem-canker'), 'km', 'name', 'ជំងឺដំបៅដើម Phomopsis (Stem Canker)'),
    ('disease', (SELECT id FROM diseases WHERE slug = 'phomopsis-stem-canker'), 'km', 'description', 'ជំងឺផ្សិតបំផ្លាញដើមយ៉ាងធ្ងន់ធ្ងរ បង្កើតជាដំបៅផតពណ៌ត្នោតប្រផេះធំៗចំថ្នាំងទងស្លឹក ដើមប្រហោងស្វិតងាយស្រួយសង្កត់បាក់ដោយមេដៃ និងបណ្តាលឱ្យបាក់រលំពេញស្រែ។'),
    ('disease', (SELECT id FROM diseases WHERE slug = 'phomopsis-stem-canker'), 'km', 'treatment', 'បាញ់ថ្នាំការពារ (Pyraclostrobin, Prothioconazole, Fluxapyroxad) នៅចន្លោះដំណាក់កាល V8 ដល់ R1 មុនពេលមេរោគឆ្លងពីទងស្លឹកចូលទៅដល់ដើមធំ។'),
    ('disease', (SELECT id FROM diseases WHERE slug = 'phomopsis-stem-canker'), 'km', 'prevention', 'ជ្រើសរើសពូជធន់ កំណត់ដង់ស៊ីតេដើមកុំឱ្យក្រាស់ពេកដើម្បីកាត់បន្ថយសំណើមខ្ពស់ក្នុងចម្ការ និងកិនកប់កាកសំណល់ដើមចាស់ៗចូលដីឱ្យឆាប់រលួយ។'),

    -- 6. Phoma Black Stem
    ('disease', (SELECT id FROM diseases WHERE slug = 'phoma-black-stem'), 'en', 'name', 'Phoma Black Stem (Plenodomus lindquistii)'),
    ('disease', (SELECT id FROM diseases WHERE slug = 'phoma-black-stem'), 'en', 'description', 'Common foliar and stem fungus producing superficial, shiny jet-black patches at leaf nodes with embedded pycnidia, while pith remains intact and white.'),
    ('disease', (SELECT id FROM diseases WHERE slug = 'phoma-black-stem'), 'en', 'treatment', 'Fungicides are rarely economically justified unless high disease pressure combines with stem-infesting insects. Strobilurin fungicides at R1 offer suppression.'),
    ('disease', (SELECT id FROM diseases WHERE slug = 'phoma-black-stem'), 'en', 'prevention', 'Rotate away from sunflowers for 3 to 4 years, control sunflower stem weevils (Apion occidentale) which act as inoculation vectors, and practice clean tillage.'),
    ('disease', (SELECT id FROM diseases WHERE slug = 'phoma-black-stem'), 'km', 'name', 'ជំងឺដើមខ្មៅ Phoma (Black Stem)'),
    ('disease', (SELECT id FROM diseases WHERE slug = 'phoma-black-stem'), 'km', 'description', 'ជំងឺផ្សិតទូទៅដែលបង្កើតជាស្នាមខ្មៅរលោងលើសំបកដើមចំថ្នាំងស្លឹក មានគ្រាប់ខ្មៅតូចៗកប់ក្នុងដំបៅ ប៉ុន្តែបណ្តូលខាងក្នុងដើមនៅតែសស្អាតធម្មតា។'),
    ('disease', (SELECT id FROM diseases WHERE slug = 'phoma-black-stem'), 'km', 'treatment', 'ជាទូទៅមិនសូវចំណាយថ្នាំបាញ់ទេ លើកលែងតែរាលដាលខ្លាំងលាយឡំនឹងសត្វល្អិតចោះដើម។ អាចបាញ់ពពួកថ្នាំ Strobilurin នៅដំណាក់កាល R1 ដើម្បីទប់ស្កាត់។'),
    ('disease', (SELECT id FROM diseases WHERE slug = 'phoma-black-stem'), 'km', 'prevention', 'ផ្លាស់ប្តូរមុខដំណាំ ៣ ទៅ ៤ ឆ្នាំ កម្ចាត់សត្វល្អិតខ្មូតចោះដើម (Stem Weevils) ដែលជាអ្នកចម្លងមេរោគ និងភ្ជួរលប់ដីសម្អាតកាកសំណល់។'),

    -- 7. Verticillium Wilt
    ('disease', (SELECT id FROM diseases WHERE slug = 'verticillium-wilt'), 'en', 'name', 'Verticillium Wilt (Verticillium dahliae)'),
    ('disease', (SELECT id FROM diseases WHERE slug = 'verticillium-wilt'), 'en', 'description', 'Persistent soilborne vascular pathogen causing prominent interveinal leaf chlorosis and necrosis (mottled leaf appearance), blackened vascular rings, and early death.'),
    ('disease', (SELECT id FROM diseases WHERE slug = 'verticillium-wilt'), 'en', 'treatment', 'No post-infection chemical remedies exist. Mark infected field sectors and rogue out isolated symptomatic plants to minimize microsclerotia loading in soil.'),
    ('disease', (SELECT id FROM diseases WHERE slug = 'verticillium-wilt'), 'en', 'prevention', 'Plant Verticillium-resistant hybrids (V-1/V-2 resistant genetics), avoid rotating with susceptible broadleaf crops (potatoes, cotton, mint), and employ 5+ year rotations with corn/wheat.'),
    ('disease', (SELECT id FROM diseases WHERE slug = 'verticillium-wilt'), 'km', 'name', 'ជំងឺក្រៀមស្វិត Verticillium'),
    ('disease', (SELECT id FROM diseases WHERE slug = 'verticillium-wilt'), 'km', 'description', 'ជំងឺផ្សិតក្នុងដីរស់បានយូរ ដែលបណ្តាលឱ្យស្លឹកឡើងលឿងនិងស្ងួតឆេះចន្លោះទ្រនុង (ស្លឹកក្រឡាខ្លា) សរសៃនាំក្នុងដើមប្រែជាខ្មៅជារង្វង់ និងដើមងាប់មុនអាយុ។'),
    ('disease', (SELECT id FROM diseases WHERE slug = 'verticillium-wilt'), 'km', 'treatment', 'គ្មានថ្នាំគីមីព្យាបាលពេលរុក្ខជាតិកើតជំងឺឡើយ។ ត្រូវសម្គាល់តំបន់ឆ្លង និងដកដើមឈឺចោលដើម្បីការពារកុំឱ្យមេរោគកកកុញកាន់តែច្រើនក្នុងដី។'),
    ('disease', (SELECT id FROM diseases WHERE slug = 'verticillium-wilt'), 'km', 'prevention', 'ដាំពូជដែលមានហ្សែនធន់ (V-1/V-2 Resistance) ចៀសវាងដាំឆ្លាស់ជាមួយដំឡូងបារាំងឬកប្បាស និងដាំឆ្លាស់ជាមួយពោតឬស្រូវសាលីយ៉ាងតិច ៥ ឆ្នាំ។'),

    -- 8. Charcoal Rot
    ('disease', (SELECT id FROM diseases WHERE slug = 'charcoal-rot'), 'en', 'name', 'Charcoal Rot (Macrophomina phaseolina)'),
    ('disease', (SELECT id FROM diseases WHERE slug = 'charcoal-rot'), 'en', 'description', 'High-temperature, drought-driven fungal pathogen causing silvery-gray basal stem discoloration and internal pith disintegration packed with peppery black microsclerotia.'),
    ('disease', (SELECT id FROM diseases WHERE slug = 'charcoal-rot'), 'en', 'treatment', 'No in-season chemical control available. Harvest immediately upon physiological maturity to prevent severe field lodging and combine header losses.'),
    ('disease', (SELECT id FROM diseases WHERE slug = 'charcoal-rot'), 'en', 'prevention', 'Maintain soil moisture with supplemental drip/furrow irrigation during flowering and grain fill, reduce seeding rates in dryland areas to minimize moisture stress.'),
    ('disease', (SELECT id FROM diseases WHERE slug = 'charcoal-rot'), 'km', 'name', 'ជំងឺរលួយធ្យូង Charcoal Rot'),
    ('disease', (SELECT id FROM diseases WHERE slug = 'charcoal-rot'), 'km', 'description', 'ជំងឺផ្សិតកើតឡើងខ្លាំងក្នុងអាកាសធាតុក្តៅស្ងួតហួតហែង បណ្តាលឱ្យគល់ដើមឡើងពណ៌ប្រផេះដូចផេះ បណ្តូលដើមរលួយសរសៃស្វិត និងពោរពេញដោយគ្រាប់ខ្មៅតូចៗដូចគ្រាប់ម្រេច។'),
    ('disease', (SELECT id FROM diseases WHERE slug = 'charcoal-rot'), 'km', 'treatment', 'គ្មានថ្នាំគីមីបាញ់ព្យាបាលក្នុងរដូវឡើយ។ ត្រូវប្រមូលផលឱ្យបានឆាប់រហ័សនៅពេលផ្កាទុំ ដើម្បីកុំឱ្យដើមបាក់រលំពិបាកច្រូតកាត់។'),
    ('disease', (SELECT id FROM diseases WHERE slug = 'charcoal-rot'), 'km', 'prevention', 'រក្សាសំណើមដីដោយស្រោចស្រពទឹកបន្ថែមក្នុងដំណាក់កាលចេញផ្កានិងដាក់គ្រាប់ កាត់បន្ថយដង់ស៊ីតេគ្រាប់ដាំនៅតំបន់រាំងស្ងួត និងដាំដំណាំឆ្លាស់ជាមួយពោត។'),

    -- 9. Fusarium Wilt
    ('disease', (SELECT id FROM diseases WHERE slug = 'fusarium-wilt'), 'en', 'name', 'Fusarium Wilt & Root Rot (Fusarium oxysporum / F. solani)'),
    ('disease', (SELECT id FROM diseases WHERE slug = 'fusarium-wilt'), 'en', 'description', 'Soilborne vascular fungal infection causing one-sided (unilateral) leaf wilting and chlorosis, reddish-brown vascular discolouration, and feeder root rot under warm soil conditions.'),
    ('disease', (SELECT id FROM diseases WHERE slug = 'fusarium-wilt'), 'en', 'treatment', 'Incurable in standing crops. Rogue out diseased individuals to prevent localized pathogen concentration.'),
    ('disease', (SELECT id FROM diseases WHERE slug = 'fusarium-wilt'), 'en', 'prevention', 'Utilize premium seed treatments with fludioxonil or sedaxane, correct soil compaction, avoid field work during saturated wet conditions, and maintain 4-year non-host rotations.'),
    ('disease', (SELECT id FROM diseases WHERE slug = 'fusarium-wilt'), 'km', 'name', 'ជំងឺក្រៀមស្វិត Fusarium និងរលួយឫស'),
    ('disease', (SELECT id FROM diseases WHERE slug = 'fusarium-wilt'), 'km', 'description', 'ជំងឺផ្សិតក្នុងដីដែលធ្វើឱ្យស្លឹកស្រពោននិងលឿងតែម្ខាង (Unilateral Wilt) សរសៃនាំក្នុងដើមឡើងឆ្នូតពណ៌ត្នោតក្រហម ឬទឹកក្រូច និងរលួយដាច់ឫសស្រូបក្នុងដីក្តៅឧណ្ហៗ។'),
    ('disease', (SELECT id FROM diseases WHERE slug = 'fusarium-wilt'), 'km', 'treatment', 'គ្មានថ្នាំគីមីព្យាបាលជាសះស្បើយក្នុងស្រែឡើយ។ ត្រូវដកដើមដែលកើតជំងឺចោលដើម្បីកុំឱ្យមេរោគរីករាលដាលទៅដើមជិតខាង។'),
    ('disease', (SELECT id FROM diseases WHERE slug = 'fusarium-wilt'), 'km', 'prevention', 'ប្រើថ្នាំប្រឡាក់ពូជ (Fludioxonil ឬ Sedaxane) បន្ធូរដីកុំឱ្យណែន កែលម្អប្រព័ន្ធបង្ហូរទឹក និងផ្លាស់ប្តូរមុខដំណាំ ៤ ឆ្នាំជាមួយដំណាំមិនមែនជាម្ចាស់ផ្ទះ។'),

    -- 10. Alternaria Leaf Spot
    ('disease', (SELECT id FROM diseases WHERE slug = 'alternaria-leaf-spot'), 'en', 'name', 'Alternaria Leaf & Stem Spot (Alternaria helianthi)'),
    ('disease', (SELECT id FROM diseases WHERE slug = 'alternaria-leaf-spot'), 'en', 'description', 'Foliar and stem pathogen producing dark circular-to-angular necrotic lesions with distinctive concentric rings (target boards), elongated stem streaks, and severe defoliation.'),
    ('disease', (SELECT id FROM diseases WHERE slug = 'alternaria-leaf-spot'), 'en', 'treatment', 'Apply foliar strobilurin or triazole fungicides (pyraclostrobin, azoxystrobin, difenoconazole) at first sign of target lesions if hot, humid weather persists.'),
    ('disease', (SELECT id FROM diseases WHERE slug = 'alternaria-leaf-spot'), 'en', 'prevention', 'Utilize high-germination certified disease-free seed, manage weeds, avoid overhead sprinkler irrigation, and incorporate residue post-harvest.'),
    ('disease', (SELECT id FROM diseases WHERE slug = 'alternaria-leaf-spot'), 'km', 'name', 'ជំងឺអុជស្លឹក Alternaria (Target Spot)'),
    ('disease', (SELECT id FROM diseases WHERE slug = 'alternaria-leaf-spot'), 'km', 'description', 'ជំងឺផ្សិតលើស្លឹកនិងដើម បង្កើតជាស្នាមដំបៅមូលឬជ្រុងពណ៌ត្នោតខ្មៅមានរង្វង់ជាន់គ្នាដូចផ្ទាំងស៊ីប (Target Boards) ឆ្នូតខ្មៅលើដើម និងធ្វើឱ្យជ្រុះស្លឹកធ្ងន់ធ្ងរ។'),
    ('disease', (SELECT id FROM diseases WHERE slug = 'alternaria-leaf-spot'), 'km', 'treatment', 'បាញ់ថ្នាំផ្សិតលើស្លឹក (Pyraclostrobin, Azoxystrobin, Difenoconazole) នៅពេលឃើញស្នាមដំបៅដំបូង ប្រសិនបើតំបន់មានអាកាសធាតុក្តៅហើយសើមខ្លាំង។'),
    ('disease', (SELECT id FROM diseases WHERE slug = 'alternaria-leaf-spot'), 'km', 'prevention', 'ប្រើប្រាស់គ្រាប់ពូជស្អាតគ្មានមេរោគ កម្ចាត់ស្មៅចង្រៃ ចៀសវាងស្រោចទឹកពីលើស្លឹក និងភ្ជួរលប់កាកសំណល់ដើមចាស់ៗក្រោយប្រមូលផល។'),

    -- 11. Septoria Leaf Spot
    ('disease', (SELECT id FROM diseases WHERE slug = 'septoria-leaf-spot'), 'en', 'name', 'Septoria Leaf Spot (Septoria helianthi)'),
    ('disease', (SELECT id FROM diseases WHERE slug = 'septoria-leaf-spot'), 'en', 'description', 'Early-to-mid season foliar disease featuring small water-soaked spots that become diamond-shaped or circular with gray centers, narrow yellow halos, and tiny black pycnidia.'),
    ('disease', (SELECT id FROM diseases WHERE slug = 'septoria-leaf-spot'), 'en', 'treatment', 'Foliar triazole or strobilurin fungicides applied before bloom if lesions advance rapidly into the upper third of the canopy.'),
    ('disease', (SELECT id FROM diseases WHERE slug = 'septoria-leaf-spot'), 'en', 'prevention', 'Rotate out of sunflowers for 2 to 3 years, bury infected residue through moldboard plowing, and avoid high-density plant spacing.'),
    ('disease', (SELECT id FROM diseases WHERE slug = 'septoria-leaf-spot'), 'km', 'name', 'ជំងឺអុជស្លឹក Septoria'),
    ('disease', (SELECT id FROM diseases WHERE slug = 'septoria-leaf-spot'), 'km', 'description', 'ជំងឺផ្សិតដើមរដូវ បង្កើតជាស្នាមអុជជាំទឹក រួចក្លាយជាស្នាមជ្រុងឬមូលពណ៌ប្រផេះកណ្តាល មានរង្វង់លឿងព័ទ្ធជុំវិញ និងមានគ្រាប់ពងបែកខ្មៅតូចៗកប់នៅចំកណ្តាល។'),
    ('disease', (SELECT id FROM diseases WHERE slug = 'septoria-leaf-spot'), 'km', 'treatment', 'បាញ់ថ្នាំពពួក Triazole ឬ Strobilurin មុនពេលផ្ការីក ប្រសិនបើស្នាមអុជរាលដាលឡើងដល់ ១ ភាគ ៣ នៃកម្ពស់ស្លឹកខាងលើ។'),
    ('disease', (SELECT id FROM diseases WHERE slug = 'septoria-leaf-spot'), 'km', 'prevention', 'ផ្លាស់ប្តូរមុខដំណាំ ២ ទៅ ៣ ឆ្នាំ ភ្ជួរលប់កាកសំណល់ស្លឹកចាស់ៗចូលដី និងកុំដាំគុម្ពញឹកពេក។'),

    -- 12. Cercospora Leaf Spot
    ('disease', (SELECT id FROM diseases WHERE slug = 'cercospora-leaf-spot'), 'en', 'name', 'Cercospora Leaf Spot (Cercospora helianthi)'),
    ('disease', (SELECT id FROM diseases WHERE slug = 'cercospora-leaf-spot'), 'en', 'description', 'Foliar fungal spots with distinct pale gray-white centers and pronounced dark reddish-brown to purple margins, causing leaf yellowing and blighting under humid conditions.'),
    ('disease', (SELECT id FROM diseases WHERE slug = 'cercospora-leaf-spot'), 'en', 'treatment', 'Broad-spectrum foliar fungicides (chlorothalonil, azoxystrobin, propiconazole) if severe infection threatens flag leaves and bracts during early reproductive stages.'),
    ('disease', (SELECT id FROM diseases WHERE slug = 'cercospora-leaf-spot'), 'en', 'prevention', 'Plant resistant hybrids, control volunteer sunflowers, allow adequate row spacing for sunlight penetration, and rotate crops.'),
    ('disease', (SELECT id FROM diseases WHERE slug = 'cercospora-leaf-spot'), 'km', 'name', 'ជំងឺអុជស្លឹក Cercospora'),
    ('disease', (SELECT id FROM diseases WHERE slug = 'cercospora-leaf-spot'), 'km', 'description', 'ជំងឺផ្សិតលើស្លឹកដែលបង្កើតជាស្នាមអុជពណ៌សស្លេកនៅកណ្តាល និងមានគែមពណ៌ត្នោតក្រហមចាស់ឬស្វាយយ៉ាងច្បាស់ ធ្វើឱ្យស្លឹកឆេះក្រៀមក្នុងអាកាសធាតុក្តៅហើយសើម។'),
    ('disease', (SELECT id FROM diseases WHERE slug = 'cercospora-leaf-spot'), 'km', 'treatment', 'បាញ់ថ្នាំផ្សិត (Chlorothalonil, Azoxystrobin, Propiconazole) ប្រសិនបើស្នាមអុជរាលដាលគំរាមកំហែងដល់ស្លឹកទ្រនុងខាងលើ និងត្របកផ្កាក្នុងវគ្គបង្កើតផ្កា។'),
    ('disease', (SELECT id FROM diseases WHERE slug = 'cercospora-leaf-spot'), 'km', 'prevention', 'ដាំពូជធន់ កម្ចាត់កូនផ្កាឈូករ័ត្នព្រៃ រក្សាគម្លាតជួរឱ្យពន្លឺថ្ងៃចាំងចូលបានល្អ និងផ្លាស់ប្តូរមុខដំណាំ។'),

    -- 13. Powdery Mildew
    ('disease', (SELECT id FROM diseases WHERE slug = 'powdery-mildew'), 'en', 'name', 'Powdery Mildew (Golovinomyces cichoracearum)'),
    ('disease', (SELECT id FROM diseases WHERE slug = 'powdery-mildew'), 'en', 'description', 'Superficial foliar fungal coating of powdery white mycelia and conidia on upper leaf surfaces, leading to leaf yellowing, downward curling, and premature drying.'),
    ('disease', (SELECT id FROM diseases WHERE slug = 'powdery-mildew'), 'en', 'treatment', 'Apply foliar sulfur sprays, potassium bicarbonate, or systemic triazole/strobilurin fungicides (difenoconazole, kresoxim-methyl) at first appearance of white colonies.'),
    ('disease', (SELECT id FROM diseases WHERE slug = 'powdery-mildew'), 'en', 'prevention', 'Avoid excessive shade, maintain optimal plant spacing to maximize air movement, and plant resistant or late-maturing sunflower varieties.'),
    ('disease', (SELECT id FROM diseases WHERE slug = 'powdery-mildew'), 'km', 'name', 'ជំងឺផ្សិតម្សៅស (Powdery Mildew)'),
    ('disease', (SELECT id FROM diseases WHERE slug = 'powdery-mildew'), 'km', 'description', 'ស្រទាប់ផ្សិតពណ៌សដូចម្សៅផាត់គ្របដណ្តប់លើផ្ទៃខាងលើនៃស្លឹក ធ្វើឱ្យស្លឹកឡើងលឿង កោងក្ដោបចុះក្រោម និងស្ងួតក្រៀមមុនពេលកំណត់។'),
    ('disease', (SELECT id FROM diseases WHERE slug = 'powdery-mildew'), 'km', 'treatment', 'បាញ់ថ្នាំស្ពាន់ធ័រ (Sulfur), ប៉ូតាស្យូមប៊ីកាបូណាត ឬថ្នាំផ្សិត (Difenoconazole, Kresoxim-methyl) នៅពេលឃើញដុំម្សៅសដំបូង។'),
    ('disease', (SELECT id FROM diseases WHERE slug = 'powdery-mildew'), 'km', 'prevention', 'ចៀសវាងដាំនៅកន្លែងម្លប់ រក្សាគម្លាតដើមឱ្យមានខ្យល់ចេញចូលបានល្អ និងជ្រើសរើសពូជធន់។'),

    -- 14. White Rust
    ('disease', (SELECT id FROM diseases WHERE slug = 'white-rust'), 'en', 'name', 'White Rust / White Blister (Pustula helianthi)'),
    ('disease', (SELECT id FROM diseases WHERE slug = 'white-rust'), 'en', 'description', 'Oomycete disease causing raised, smooth, porcelain-white chalky blisters on leaf undersides, corresponding yellow swellings on upper leaf surfaces, and severe foliar distortion.'),
    ('disease', (SELECT id FROM diseases WHERE slug = 'white-rust'), 'en', 'treatment', 'Foliar oomycide treatments (mefenoxam, fosetyl-Al, dimethomorph, mandipropamid) when blisters begin spreading rapidly during cool, humid periods.'),
    ('disease', (SELECT id FROM diseases WHERE slug = 'white-rust'), 'en', 'prevention', '3-year crop rotation with non-Asteraceae crops, eradicate wild weed hosts (Xanthium, Ambrosia), and avoid overhead nighttime irrigation.'),
    ('disease', (SELECT id FROM diseases WHERE slug = 'white-rust'), 'km', 'name', 'ជំងឺច្រែះស (White Rust / Blister)'),
    ('disease', (SELECT id FROM diseases WHERE slug = 'white-rust'), 'km', 'description', 'ជំងឺអូមីសែតដែលបង្កើតជាពងបែកពណ៌សរលោងដូចកុលាលភាជន៍នៅផ្ទៃខាងក្រោមស្លឹក មានពកពណ៌លឿងប៉ោងនៅផ្ទៃខាងលើ និងធ្វើឱ្យស្លឹកខូចទ្រង់ទ្រាយរួញក្ដោប។'),
    ('disease', (SELECT id FROM diseases WHERE slug = 'white-rust'), 'km', 'treatment', 'បាញ់ថ្នាំសម្លាប់អូមីសែត (Mefenoxam, Fosetyl-Al, Dimethomorph) នៅពេលពងបែកចាប់ផ្តើមរាលដាលក្នុងរដូវត្រជាក់ហើយសើម។'),
    ('disease', (SELECT id FROM diseases WHERE slug = 'white-rust'), 'km', 'prevention', 'ដាំដំណាំឆ្លាស់ ៣ ឆ្នាំជាមួយដំណាំក្រៅពីអំបូរ Asteraceae កម្ចាត់ស្មៅព្រៃចង្រៃ និងចៀសវាងការស្រោចទឹកជោរជាំនៅពេលយប់។'),

    -- 15. Rhizopus Head Rot
    ('disease', (SELECT id FROM diseases WHERE slug = 'rhizopus-head-rot'), 'en', 'name', 'Rhizopus Head Rot (Rhizopus oryzae / R. stolonifer)'),
    ('disease', (SELECT id FROM diseases WHERE slug = 'rhizopus-head-rot'), 'en', 'description', 'Fungal opportunistic decay characterized by coarse gray whisker-like mycelium with black pinhead sporangia, water-soaked brown rot originating at wounds, and rapid head shredding.'),
    ('disease', (SELECT id FROM diseases WHERE slug = 'rhizopus-head-rot'), 'en', 'treatment', 'Fungicide applications are ineffective once infection establishes. Control head-feeding insects (sunflower moth larvae, headclipping weevils) that create entry wounds.'),
    ('disease', (SELECT id FROM diseases WHERE slug = 'rhizopus-head-rot'), 'en', 'prevention', 'Apply targeted insecticides during early bloom (R5.1) to manage sunflower moth larvae, select bird-resistant downward-facing heads, and avoid mechanical field damage.'),
    ('disease', (SELECT id FROM diseases WHERE slug = 'rhizopus-head-rot'), 'km', 'name', 'ជំងឺរលួយក្បាលផ្កា Rhizopus (Whisker Mold)'),
    ('disease', (SELECT id FROM diseases WHERE slug = 'rhizopus-head-rot'), 'km', 'description', 'ជំងឺផ្សិតឆ្លៀតឱកាសដែលបង្កើតជាសរសៃវែងៗពណ៌ប្រផេះដូចពុកចង្កា មានក្បាលខ្មៅតូចៗលើក្បាលផ្កា ក្បាលផ្ការលួយជាំទឹកពណ៌ត្នោតផ្តើមចេញពីកន្លែងមានរបួស និងរលួយសរសៃស្វិត។'),
    ('disease', (SELECT id FROM diseases WHERE slug = 'rhizopus-head-rot'), 'km', 'treatment', 'ការបាញ់ថ្នាំផ្សិតគ្មានប្រសិទ្ធភាពទេនៅពេលមេរោគចូលផ្កាហើយ។ ត្រូវបាញ់ថ្នាំសម្លាប់សត្វល្អិតដង្កូវស៊ីផ្កា (Sunflower Moth) ដែលជាអ្នកចោះបង្កើតរបួស។'),
    ('disease', (SELECT id FROM diseases WHERE slug = 'rhizopus-head-rot'), 'km', 'prevention', 'បាញ់ថ្នាំការពារសត្វល្អិតដង្កូវស៊ីផ្កានៅពេលផ្កាចាប់ផ្តើមរីក (R5.1) ជ្រើសរើសពូជផ្កាងក់ចុះក្រោម និងចៀសវាងការប៉ះទង្គិចធ្វើឱ្យផ្កាមានរបួស។'),

    -- 16. Botrytis Gray Mold
    ('disease', (SELECT id FROM diseases WHERE slug = 'botrytis-gray-mold'), 'en', 'name', 'Botrytis Gray Mold (Botrytis cinerea)'),
    ('disease', (SELECT id FROM diseases WHERE slug = 'botrytis-gray-mold'), 'en', 'description', 'Cool, wet-weather fungal blight causing water-soaked head rot covered by dense mouse-gray velvety spore mats, thin black crust-like sclerotia, and empty seed bracts.'),
    ('disease', (SELECT id FROM diseases WHERE slug = 'botrytis-gray-mold'), 'en', 'treatment', 'Foliar botryticide sprays (fenhexamid, cyprodinil + fludioxonil, iprodione) applied at bloom under continuous foggy or wet conditions.'),
    ('disease', (SELECT id FROM diseases WHERE slug = 'botrytis-gray-mold'), 'en', 'prevention', 'Avoid high plant densities, ensure good field drainage, harvest promptly upon maturity, and dry seed to below 9% moisture immediately.'),
    ('disease', (SELECT id FROM diseases WHERE slug = 'botrytis-gray-mold'), 'km', 'name', 'ជំងឺផ្សិតប្រផេះ Botrytis (Gray Mold)'),
    ('disease', (SELECT id FROM diseases WHERE slug = 'botrytis-gray-mold'), 'km', 'description', 'ជំងឺផ្សិតកើតក្នុងអាកាសធាតុត្រជាក់សើម បណ្តាលឱ្យក្បាលផ្ការលួយជាំទឹកគ្របដោយស្រទាប់ផ្សិតកម្ញីពណ៌ប្រផេះកណ្តុរ មានស្រទាប់កកខ្មៅស្តើងលើផ្កា និងគ្រាប់ស្កកគ្មានសាច់។'),
    ('disease', (SELECT id FROM diseases WHERE slug = 'botrytis-gray-mold'), 'km', 'treatment', 'បាញ់ថ្នាំកម្ចាត់ផ្សិត Botrytis (Fenhexamid, Cyprodinil, Iprodione) នៅពេលផ្ការីក ប្រសិនបើអាកាសធាតុបន្តចុះអ័ព្ទឬភ្លៀងជាប់រហូត។'),
    ('disease', (SELECT id FROM diseases WHERE slug = 'botrytis-gray-mold'), 'km', 'prevention', 'កុំដាំដើមញឹកពេក ធានាការបង្ហូរទឹកបានល្អ ប្រមូលផលភ្លាមៗនៅពេលផ្កាទុំ និងសម្ងួតគ្រាប់ឱ្យមានសំណើមក្រោម ៩% ជាបន្ទាន់។'),

    -- 17. Bacterial Stalk & Head Rot
    ('disease', (SELECT id FROM diseases WHERE slug = 'bacterial-stalk-head-rot'), 'en', 'name', 'Bacterial Stalk & Head Rot (Pectobacterium carotovorum / Dickeya spp.)'),
    ('disease', (SELECT id FROM diseases WHERE slug = 'bacterial-stalk-head-rot'), 'en', 'description', 'Aggressive bacterial soft rot dissolving internal pith into foul-smelling, putrid, slimy slurry with external dark greasy water-soaked stem lesions and stalk collapse.'),
    ('disease', (SELECT id FROM diseases WHERE slug = 'bacterial-stalk-head-rot'), 'en', 'treatment', 'No chemical or antibiotic curative treatments exist. Severely infected stalks must be rogued and buried far from clean water sources.'),
    ('disease', (SELECT id FROM diseases WHERE slug = 'bacterial-stalk-head-rot'), 'en', 'prevention', 'Avoid overhead sprinkler irrigation with untreated surface water, prevent mechanical injuries and insect tunneling during cultivation, and disinfect field machinery.'),
    ('disease', (SELECT id FROM diseases WHERE slug = 'bacterial-stalk-head-rot'), 'km', 'name', 'ជំងឺបាក់តេរីរលួយដើមនិងក្បាលផ្កា (Bacterial Soft Rot)'),
    ('disease', (SELECT id FROM diseases WHERE slug = 'bacterial-stalk-head-rot'), 'km', 'description', 'ជំងឺបាក់តេរីរលួយទន់កាចសាហាវ ដែលរំលាយបណ្តូលដើមឱ្យក្លាយជាទឹករំអិលស្អុយគគ្រុកខ្លាំង សំបកដើមខាងក្រៅឡើងដំបៅជាំទឹកពណ៌ត្នោតរលោង និងបាក់ដើមរលំ។'),
    ('disease', (SELECT id FROM diseases WHERE slug = 'bacterial-stalk-head-rot'), 'km', 'treatment', 'គ្មានថ្នាំគីមីឬអង់ទីប៊ីយោទិចព្យាបាលជាសះស្បើយឡើយ។ ត្រូវដកដើមដែលរលួយស្អុយយកទៅកប់ចោលឱ្យឆ្ងាយពីប្រភពទឹកប្រើប្រាស់។'),
    ('disease', (SELECT id FROM diseases WHERE slug = 'bacterial-stalk-head-rot'), 'km', 'prevention', 'ចៀសវាងស្រោចស្រពទឹកមិនស្អាតពីលើដើម ការពារកុំឱ្យដើមមានរបួសឬសត្វល្អិតចោះ និងលាងសម្អាតសម្លាប់មេរោគលើឧបករណ៍កសិកម្មមុនប្រើប្រាស់។'),

    -- 18. Bacterial Leaf Spot
    ('disease', (SELECT id FROM diseases WHERE slug = 'bacterial-leaf-spot'), 'en', 'name', 'Bacterial Leaf Spot & Apical Chlorosis (Pseudomonas syringae pv. helianthi)'),
    ('disease', (SELECT id FROM diseases WHERE slug = 'bacterial-leaf-spot'), 'en', 'description', 'Bacterial infection producing angular, vein-delimited translucent water-soaked spots, wide bright-yellow chlorotic halos, apical leaf bleaching, and severe foliage distortion.'),
    ('disease', (SELECT id FROM diseases WHERE slug = 'bacterial-leaf-spot'), 'en', 'treatment', 'Preventative copper bactericides (copper hydroxide, copper octanoate) applied during early stages under persistent driving rains; no systemic curative exists.'),
    ('disease', (SELECT id FROM diseases WHERE slug = 'bacterial-leaf-spot'), 'en', 'prevention', 'Use pathogen-free certified seed, avoid field operations when foliage is wet to prevent bacterial spreading, and practice 3-year crop rotations.'),
    ('disease', (SELECT id FROM diseases WHERE slug = 'bacterial-leaf-spot'), 'km', 'name', 'ជំងឺបាក់តេរីអុជស្លឹក (Bacterial Leaf Spot)'),
    ('disease', (SELECT id FROM diseases WHERE slug = 'bacterial-leaf-spot'), 'km', 'description', 'ជំងឺបាក់តេរីដែលបង្កើតជាស្នាមអុជជ្រុងតាមក្រឡាសរសៃស្លឹកជាំទឹកមើលឆ្លុះពន្លឺធ្លុះ មានរង្វង់ពណ៌លឿងព័ទ្ធជុំវិញ ចុងត្រួយឡើងលឿងស្លេកខ្លាំង និងស្លឹកខូចទ្រង់ទ្រាយ។'),
    ('disease', (SELECT id FROM diseases WHERE slug = 'bacterial-leaf-spot'), 'km', 'treatment', 'បាញ់ថ្នាំការពារពពួកស្ពាន់ (Copper Hydroxide) នៅដំណាក់កាលដំបូងក្នុងរដូវភ្លៀងធ្លាក់ខ្លាំង គ្មានថ្នាំបាញ់ព្យាបាលខាងក្នុងដើមឡើយ។'),
    ('disease', (SELECT id FROM diseases WHERE slug = 'bacterial-leaf-spot'), 'km', 'prevention', 'ប្រើគ្រាប់ពូជស្អាតគ្មានមេរោគ ចៀសវាងការដើរចូលធ្វើការក្នុងចម្ការពេលស្លឹកកំពុងសើមទឹក និងដាំដំណាំឆ្លាស់ ៣ ឆ្នាំ។'),

    -- 19. Pythium Damping-Off
    ('disease', (SELECT id FROM diseases WHERE slug = 'pythium-damping-off'), 'en', 'name', 'Pythium Seedling Blight & Damping-Off (Pythium spp.)'),
    ('disease', (SELECT id FROM diseases WHERE slug = 'pythium-damping-off'), 'en', 'description', 'Water mold pathogen attacking germinating seeds and young seedlings in cold, waterlogged soils, causing pinched water-soaked brown stem collars and rapid seedling collapse.'),
    ('disease', (SELECT id FROM diseases WHERE slug = 'pythium-damping-off'), 'en', 'treatment', 'Rescue soil drenches with mefenoxam, propamocarb, or phosphonates if seedling damping-off occurs in valuable seed production nurseries.'),
    ('disease', (SELECT id FROM diseases WHERE slug = 'pythium-damping-off'), 'en', 'prevention', 'Plant high-vigor fungicide-treated seed (metalaxyl/mefenoxam + ethaboxam), delay planting until soil temperatures exceed 10°C, and ensure optimal seedbed drainage.'),
    ('disease', (SELECT id FROM diseases WHERE slug = 'pythium-damping-off'), 'km', 'name', 'ជំងឺងាប់កូន Pythium (Damping-Off)'),
    ('disease', (SELECT id FROM diseases WHERE slug = 'pythium-damping-off'), 'km', 'description', 'ជំងឺផ្សិតទឹកដែលបំផ្លាញគ្រាប់កំពុងដុះពន្លក និងកូនផ្កាតូចៗក្នុងដីត្រជាក់ជាំទឹក បណ្តាលឱ្យគល់កូនដើមរួមស្វិតជាំទឹកពណ៌ត្នោតជាប់ដី និងដួលរលំងាប់ភ្លាមៗ។'),
    ('disease', (SELECT id FROM diseases WHERE slug = 'pythium-damping-off'), 'km', 'treatment', 'ស្រោចថ្នាំគីមីជំនួយ (Mefenoxam, Propamocarb) លើដីជុំវិញគល់កូនដំណាំ ប្រសិនបើកើតមានការដួលងាប់កូនក្នុងថ្នាលបណ្តុះ។'),
    ('disease', (SELECT id FROM diseases WHERE slug = 'pythium-damping-off'), 'km', 'prevention', 'ប្រើគ្រាប់ពូជដែលបានប្រឡាក់ថ្នាំការពារ (Metalaxyl + Ethaboxam) ពន្យារពេលដាំរហូតដល់សីតុណ្ហភាពដីលើសពី ១០°C និងរៀបចំដីឱ្យស្រឡះទឹកល្អ។'),

    -- 20. Aster Yellows
    ('disease', (SELECT id FROM diseases WHERE slug = 'aster-yellows'), 'en', 'name', 'Aster Yellows Phytoplasma'),
    ('disease', (SELECT id FROM diseases WHERE slug = 'aster-yellows'), 'en', 'description', 'Insect-vectored phytoplasma causing floral virescence, phyllody (petals turning into deformed green leafy structures), wedge-shaped stunted head sectors, and witches'' broom shoots.'),
    ('disease', (SELECT id FROM diseases WHERE slug = 'aster-yellows'), 'en', 'treatment', 'No curative chemical treatments available for phytoplasma-infected plants. Rogue out symptomatic individuals immediately to remove pathogen reservoirs.'),
    ('disease', (SELECT id FROM diseases WHERE slug = 'aster-yellows'), 'en', 'prevention', 'Control aster leafhopper (Macrosteles quadrilineatus) vector populations with registered foliar insecticides, eliminate perennial broadleaf weed reservoirs along field borders.'),
    ('disease', (SELECT id FROM diseases WHERE slug = 'aster-yellows'), 'km', 'name', 'ជំងឺ Aster Yellows (ហ្វីតូប្លាស្មា)'),
    ('disease', (SELECT id FROM diseases WHERE slug = 'aster-yellows'), 'km', 'description', 'ជំងឺឆ្លងតាមសត្វល្អិតទិចជញ្ជក់ បណ្តាលឱ្យផ្កាឡើងពណ៌បៃតង ត្របកផ្កាក្លាយជាស្លឹកខូចទ្រង់ទ្រាយ (Phyllody) ផ្កាខូចទ្រង់ទ្រាយក្រិនស្វិតមួយចំហៀង និងដុះខ្នែងញឹកដូចអំបោសធ្មប់។'),
    ('disease', (SELECT id FROM diseases WHERE slug = 'aster-yellows'), 'km', 'treatment', 'គ្មានថ្នាំគីមីព្យាបាលជំងឺហ្វីតូប្លាស្មាឡើយ។ ត្រូវដកដើមដែលចេញរោគសញ្ញាចោលជាបន្ទាន់ ដើម្បីកុំឱ្យសត្វល្អិតបឺតជញ្ជក់យកមេរោគទៅចម្លងបន្ត។'),
    ('disease', (SELECT id FROM diseases WHERE slug = 'aster-yellows'), 'km', 'prevention', 'បាញ់ថ្នាំកម្ចាត់សត្វល្អិតចង្រៃមមាចស្លឹក (Aster Leafhopper) និងកម្ចាត់ស្មៅចង្រៃជុំវិញភ្លឺស្រែដែលជាជម្រកមេរោគ។')
ON CONFLICT (entity_type, entity_id, locale, field) 
DO UPDATE SET value = EXCLUDED.value;

-- ============================================================================
-- SECTION 3: INSERT ALL 62 SYMPTOMS
-- ============================================================================
INSERT INTO symptoms (code, category_id, is_environmental, created_at, updated_at)
VALUES
    -- Whole Plant (1-8)
    ('whole_plant_sudden_canopy_wilting',           (SELECT id FROM symptom_categories WHERE code = 'whole_plant'), false, NOW(), NOW()),
    ('whole_plant_severe_stunting_dwarfism',        (SELECT id FROM symptom_categories WHERE code = 'whole_plant'), false, NOW(), NOW()),
    ('whole_plant_premature_death_drying',          (SELECT id FROM symptom_categories WHERE code = 'whole_plant'), false, NOW(), NOW()),
    ('whole_plant_unilateral_wilting_yellowing',    (SELECT id FROM symptom_categories WHERE code = 'whole_plant'), false, NOW(), NOW()),
    ('whole_plant_dark_vascular_ring',              (SELECT id FROM symptom_categories WHERE code = 'whole_plant'), false, NOW(), NOW()),
    ('whole_plant_orange_reddish_vascular_streaks', (SELECT id FROM symptom_categories WHERE code = 'whole_plant'), false, NOW(), NOW()),
    ('whole_plant_stalk_lodging_collapse',          (SELECT id FROM symptom_categories WHERE code = 'whole_plant'), false, NOW(), NOW()),
    ('whole_plant_witches_broom_proliferation',     (SELECT id FROM symptom_categories WHERE code = 'whole_plant'), false, NOW(), NOW()),
    
    -- Seedling (9-10, 12-13)
    ('seedling_damping_off_collapse',               (SELECT id FROM symptom_categories WHERE code = 'seedling'), false, NOW(), NOW()),
    ('seedling_pre_emergence_seed_rot',             (SELECT id FROM symptom_categories WHERE code = 'seedling'), false, NOW(), NOW()),
    ('seedling_pinched_water_soaked_collar',        (SELECT id FROM symptom_categories WHERE code = 'seedling'), false, NOW(), NOW()),
    ('seedling_uneven_emergence_bare_patches',      (SELECT id FROM symptom_categories WHERE code = 'seedling'), false, NOW(), NOW()),

    -- Root (11)
    ('root_decay_feeder_tips',                      (SELECT id FROM symptom_categories WHERE code = 'root'), false, NOW(), NOW()),

    -- Stem (14-27)
    ('stem_sunken_tan_gray_cankers',                (SELECT id FROM symptom_categories WHERE code = 'stem'), false, NOW(), NOW()),
    ('stem_jet_black_shiny_patches',                (SELECT id FROM symptom_categories WHERE code = 'stem'), false, NOW(), NOW()),
    ('stem_water_soaked_greasy_lesions',            (SELECT id FROM symptom_categories WHERE code = 'stem'), false, NOW(), NOW()),
    ('stem_silvery_ash_gray_discoloration',         (SELECT id FROM symptom_categories WHERE code = 'stem'), false, NOW(), NOW()),
    ('stem_chalky_white_bleached_surface',          (SELECT id FROM symptom_categories WHERE code = 'stem'), false, NOW(), NOW()),
    ('stem_elongated_black_streaks',                (SELECT id FROM symptom_categories WHERE code = 'stem'), false, NOW(), NOW()),
    ('stem_pith_disintegration_hollow_stalk',       (SELECT id FROM symptom_categories WHERE code = 'stem'), false, NOW(), NOW()),
    ('stem_slimy_mushy_pith_dissolution',           (SELECT id FROM symptom_categories WHERE code = 'stem'), false, NOW(), NOW()),
    ('stem_foul_putrid_rotting_odor',               (SELECT id FROM symptom_categories WHERE code = 'stem'), false, NOW(), NOW()),
    ('stem_large_black_sclerotia',                  (SELECT id FROM symptom_categories WHERE code = 'stem'), false, NOW(), NOW()),
    ('stem_peppery_microsclerotia_shredded_pith',   (SELECT id FROM symptom_categories WHERE code = 'stem'), false, NOW(), NOW()),
    ('stem_cottony_white_mycelium',                 (SELECT id FROM symptom_categories WHERE code = 'stem'), false, NOW(), NOW()),
    ('stem_pycnidia_embedded_lesions',              (SELECT id FROM symptom_categories WHERE code = 'stem'), false, NOW(), NOW()),
    ('stem_easily_crushed_thumb_pressure',          (SELECT id FROM symptom_categories WHERE code = 'stem'), false, NOW(), NOW()),

    -- Leaf (28-47, +2 indicators = 22 leaf symptoms)
    ('leaf_interveinal_chlorosis_mottling',         (SELECT id FROM symptom_categories WHERE code = 'leaf'), false, NOW(), NOW()),
    ('leaf_systemic_chlorosis_banding',             (SELECT id FROM symptom_categories WHERE code = 'leaf'), false, NOW(), NOW()),
    ('leaf_bright_bleached_apical_chlorosis',       (SELECT id FROM symptom_categories WHERE code = 'leaf'), false, NOW(), NOW()),
    ('leaf_circular_angular_necrotic_spots',        (SELECT id FROM symptom_categories WHERE code = 'leaf'), false, NOW(), NOW()),
    ('leaf_concentric_target_board_rings',          (SELECT id FROM symptom_categories WHERE code = 'leaf'), false, NOW(), NOW()),
    ('leaf_angular_water_soaked_translucent_spots', (SELECT id FROM symptom_categories WHERE code = 'leaf'), false, NOW(), NOW()),
    ('leaf_spots_ash_gray_pycnidia',                (SELECT id FROM symptom_categories WHERE code = 'leaf'), false, NOW(), NOW()),
    ('leaf_spots_pale_center_reddish_margin',       (SELECT id FROM symptom_categories WHERE code = 'leaf'), false, NOW(), NOW()),
    ('leaf_triangular_marginal_necrotic_lesions',   (SELECT id FROM symptom_categories WHERE code = 'leaf'), false, NOW(), NOW()),
    ('leaf_chlorotic_yellow_halos',                 (SELECT id FROM symptom_categories WHERE code = 'leaf'), false, NOW(), NOW()),
    ('leaf_premature_defoliation_drop',             (SELECT id FROM symptom_categories WHERE code = 'leaf'), false, NOW(), NOW()),
    ('leaf_thickened_brittle_downward_cupped',      (SELECT id FROM symptom_categories WHERE code = 'leaf'), false, NOW(), NOW()),
    ('leaf_distortion_puckering_ragged_margins',    (SELECT id FROM symptom_categories WHERE code = 'leaf'), false, NOW(), NOW()),
    ('leaf_light_dark_green_mosaic',                (SELECT id FROM symptom_categories WHERE code = 'leaf'), false, NOW(), NOW()),
    ('leaf_cinnamon_brown_powdery_pustules',        (SELECT id FROM symptom_categories WHERE code = 'leaf'), false, NOW(), NOW()),
    ('leaf_black_raised_late_season_pustules',      (SELECT id FROM symptom_categories WHERE code = 'leaf'), false, NOW(), NOW()),
    ('leaf_dense_white_felt_undersides',            (SELECT id FROM symptom_categories WHERE code = 'leaf'), false, NOW(), NOW()),
    ('leaf_white_talcum_powder_patches',            (SELECT id FROM symptom_categories WHERE code = 'leaf'), false, NOW(), NOW()),
    ('leaf_porcelain_white_chalky_blisters',        (SELECT id FROM symptom_categories WHERE code = 'leaf'), false, NOW(), NOW()),
    ('leaf_chlorotic_swellings_upper_surface',      (SELECT id FROM symptom_categories WHERE code = 'leaf'), false, NOW(), NOW()),
    ('leaf_mosaic_yellow_green_mottling',           (SELECT id FROM symptom_categories WHERE code = 'leaf'), false, NOW(), NOW()),
    ('leaf_vein_clearing_chlorosis',                (SELECT id FROM symptom_categories WHERE code = 'leaf'), false, NOW(), NOW()),

    -- Head (48-60)
    ('head_water_soaked_soft_brown_decay',          (SELECT id FROM symptom_categories WHERE code = 'head'), false, NOW(), NOW()),
    ('head_shredded_skeletonized_matrix',           (SELECT id FROM symptom_categories WHERE code = 'head'), false, NOW(), NOW()),
    ('head_white_mycelium_black_sclerotia',         (SELECT id FROM symptom_categories WHERE code = 'head'), false, NOW(), NOW()),
    ('head_coarse_gray_whisker_mold',               (SELECT id FROM symptom_categories WHERE code = 'head'), false, NOW(), NOW()),
    ('head_rot_initiating_around_wounds',           (SELECT id FROM symptom_categories WHERE code = 'head'), false, NOW(), NOW()),
    ('head_mouse_gray_velvety_spore_mat',           (SELECT id FROM symptom_categories WHERE code = 'head'), false, NOW(), NOW()),
    ('head_black_crust_sclerotia',                  (SELECT id FROM symptom_categories WHERE code = 'head'), false, NOW(), NOW()),
    ('head_phyllody_floral_transformation',         (SELECT id FROM symptom_categories WHERE code = 'head'), false, NOW(), NOW()),
    ('head_virescence_green_discoloration',         (SELECT id FROM symptom_categories WHERE code = 'head'), false, NOW(), NOW()),
    ('head_asymmetrical_distorted_wedge_sector',    (SELECT id FROM symptom_categories WHERE code = 'head'), false, NOW(), NOW()),
    ('head_abnormal_upright_flat_rigid',            (SELECT id FROM symptom_categories WHERE code = 'head'), false, NOW(), NOW()),
    ('head_premature_seed_shattering',              (SELECT id FROM symptom_categories WHERE code = 'head'), false, NOW(), NOW()),
    ('head_reduced_seed_size_shriveled',            (SELECT id FROM symptom_categories WHERE code = 'head'), false, NOW(), NOW())
ON CONFLICT (code) DO NOTHING;

-- ============================================================================
-- SECTION 4: INSERT SYMPTOM TRANSLATIONS (EN & KM)
-- ============================================================================
INSERT INTO translations (entity_type, entity_id, locale, field, value)
VALUES
    -- 1-8: Whole Plant
    ('symptom', (SELECT id FROM symptoms WHERE code = 'whole_plant_sudden_canopy_wilting'), 'en', 'label', 'Sudden canopy wilting'),
    ('symptom', (SELECT id FROM symptoms WHERE code = 'whole_plant_sudden_canopy_wilting'), 'km', 'label', 'ការស្រពោនស្វិតចុងត្រួយនិងស្លឹកភ្លាមៗ'),
    ('symptom', (SELECT id FROM symptoms WHERE code = 'whole_plant_severe_stunting_dwarfism'), 'en', 'label', 'Severe plant stunting and dwarfism with compressed internodes'),
    ('symptom', (SELECT id FROM symptoms WHERE code = 'whole_plant_severe_stunting_dwarfism'), 'km', 'label', 'ការក្រិនខ្លាំង លូតលាស់ទាប និងថ្នាំងដើមខ្លីខុសប្រក្រតី'),
    ('symptom', (SELECT id FROM symptoms WHERE code = 'whole_plant_premature_death_drying'), 'en', 'label', 'Premature plant death and drying from lower canopy upward'),
    ('symptom', (SELECT id FROM symptoms WHERE code = 'whole_plant_premature_death_drying'), 'km', 'label', 'ដើមងាប់និងស្ងួតក្រៀមមុនអាយុពីរង្វង់ស្លឹកក្រោមឡើងលើ'),
    ('symptom', (SELECT id FROM symptoms WHERE code = 'whole_plant_unilateral_wilting_yellowing'), 'en', 'label', 'Unilateral or one-sided leaf wilting and yellowing'),
    ('symptom', (SELECT id FROM symptoms WHERE code = 'whole_plant_unilateral_wilting_yellowing'), 'km', 'label', 'ស្លឹកស្រពោនឬឡើងលឿងតែម្ខាងនៃទង'),
    ('symptom', (SELECT id FROM symptoms WHERE code = 'whole_plant_dark_vascular_ring'), 'en', 'label', 'Dark brown to solid black continuous vascular ring inside lower stem'),
    ('symptom', (SELECT id FROM symptoms WHERE code = 'whole_plant_dark_vascular_ring'), 'km', 'label', 'សរសៃនាំខាងក្នុងគល់ដើមប្រែជាខ្មៅជារង្វង់'),
    ('symptom', (SELECT id FROM symptoms WHERE code = 'whole_plant_orange_reddish_vascular_streaks'), 'en', 'label', 'Orange to reddish-brown vascular streaks inside stem'),
    ('symptom', (SELECT id FROM symptoms WHERE code = 'whole_plant_orange_reddish_vascular_streaks'), 'km', 'label', 'ឆ្នូតពណ៌ទឹកក្រូចទៅត្នោតក្រហមក្នុងសរសៃនាំដើម'),
    ('symptom', (SELECT id FROM symptoms WHERE code = 'whole_plant_stalk_lodging_collapse'), 'en', 'label', 'Stalk lodging and stem collapse'),
    ('symptom', (SELECT id FROM symptoms WHERE code = 'whole_plant_stalk_lodging_collapse'), 'km', 'label', 'ដើមបាក់រលំដួលផ្កាប់មុខ'),
    ('symptom', (SELECT id FROM symptoms WHERE code = 'whole_plant_witches_broom_proliferation'), 'en', 'label', 'Proliteration of abnormal secondary shoots or witches'' broom'),
    ('symptom', (SELECT id FROM symptoms WHERE code = 'whole_plant_witches_broom_proliferation'), 'km', 'label', 'ការបែកខ្នែងញឹកខុសប្រក្រតីដូចអំបោសធ្មប់'),

    -- 9-10, 12-13: Seedling
    ('symptom', (SELECT id FROM symptoms WHERE code = 'seedling_damping_off_collapse'), 'en', 'label', 'Sudden seedling damping-off and lodging collapse'),
    ('symptom', (SELECT id FROM symptoms WHERE code = 'seedling_damping_off_collapse'), 'km', 'label', 'កូនផ្កាដួលរលំងាប់ភ្លាមៗក្រោយដុះពន្លក'),
    ('symptom', (SELECT id FROM symptoms WHERE code = 'seedling_pre_emergence_seed_rot'), 'en', 'label', 'Pre-emergence seed rot'),
    ('symptom', (SELECT id FROM symptoms WHERE code = 'seedling_pre_emergence_seed_rot'), 'km', 'label', 'គ្រាប់រលួយក្នុងដីមុនពេលដុះពន្លក'),
    ('symptom', (SELECT id FROM symptoms WHERE code = 'seedling_pinched_water_soaked_collar'), 'en', 'label', 'Pinched, water-soaked brown stem collar at soil line'),
    ('symptom', (SELECT id FROM symptoms WHERE code = 'seedling_pinched_water_soaked_collar'), 'km', 'label', 'គល់កូនដើមរួមស្វិតជាំទឹកពណ៌ត្នោតជាប់ដី'),
    ('symptom', (SELECT id FROM symptoms WHERE code = 'seedling_uneven_emergence_bare_patches'), 'en', 'label', 'Uneven stand emergence and bare patches in field'),
    ('symptom', (SELECT id FROM symptoms WHERE code = 'seedling_uneven_emergence_bare_patches'), 'km', 'label', 'កូនដំណាំដុះមិនស្មើគ្នានិងមានចន្លោះទំនេរច្រើនក្នុងស្រែ'),

    -- 11: Root
    ('symptom', (SELECT id FROM symptoms WHERE code = 'root_decay_feeder_tips'), 'en', 'label', 'Root decay and rotted feeder root tips'),
    ('symptom', (SELECT id FROM symptoms WHERE code = 'root_decay_feeder_tips'), 'km', 'label', 'ឫសរលួយនិងដាច់ចុងឫសស្រូប'),

    -- 14-27: Stem
    ('symptom', (SELECT id FROM symptoms WHERE code = 'stem_sunken_tan_gray_cankers'), 'en', 'label', 'Sunken tan-to-gray cankers centered at leaf nodes'),
    ('symptom', (SELECT id FROM symptoms WHERE code = 'stem_sunken_tan_gray_cankers'), 'km', 'label', 'ដំបៅផតពណ៌ត្នោតប្រផេះចំថ្នាំងដើម'),
    ('symptom', (SELECT id FROM symptoms WHERE code = 'stem_jet_black_shiny_patches'), 'en', 'label', 'Superficial shiny jet-black patches on stem'),
    ('symptom', (SELECT id FROM symptoms WHERE code = 'stem_jet_black_shiny_patches'), 'km', 'label', 'ស្នាមខ្មៅរលោងលើសំបកដើម'),
    ('symptom', (SELECT id FROM symptoms WHERE code = 'stem_water_soaked_greasy_lesions'), 'en', 'label', 'Water-soaked, greasy, dark brown to black stem lesions'),
    ('symptom', (SELECT id FROM symptoms WHERE code = 'stem_water_soaked_greasy_lesions'), 'km', 'label', 'ដំបៅជាំទឹករលោងពណ៌ត្នោតចាស់ទៅខ្មៅលើដើម'),
    ('symptom', (SELECT id FROM symptoms WHERE code = 'stem_silvery_ash_gray_discoloration'), 'en', 'label', 'Silvery-gray or ash-gray discoloration of lower stem'),
    ('symptom', (SELECT id FROM symptoms WHERE code = 'stem_silvery_ash_gray_discoloration'), 'km', 'label', 'គល់ដើមប្រែពណ៌ប្រផេះដូចផេះ'),
    ('symptom', (SELECT id FROM symptoms WHERE code = 'stem_chalky_white_bleached_surface'), 'en', 'label', 'Chalky-white or bleached lower stem surface'),
    ('symptom', (SELECT id FROM symptoms WHERE code = 'stem_chalky_white_bleached_surface'), 'km', 'label', 'សំបកគល់ដើមឡើងសស្លេកដូចដីស'),
    ('symptom', (SELECT id FROM symptoms WHERE code = 'stem_elongated_black_streaks'), 'en', 'label', 'Elongated narrow black streaks on stems and petioles'),
    ('symptom', (SELECT id FROM symptoms WHERE code = 'stem_elongated_black_streaks'), 'km', 'label', 'ឆ្នូតខ្មៅវែងៗតូចៗលើដើមនិងទងស្លឹក'),
    ('symptom', (SELECT id FROM symptoms WHERE code = 'stem_pith_disintegration_hollow_stalk'), 'en', 'label', 'Pith disintegration and hollow stalk from dry decay'),
    ('symptom', (SELECT id FROM symptoms WHERE code = 'stem_pith_disintegration_hollow_stalk'), 'km', 'label', 'បណ្តូលដើមរលួយស្ងួតប្រហោងក្នុង'),
    ('symptom', (SELECT id FROM symptoms WHERE code = 'stem_slimy_mushy_pith_dissolution'), 'en', 'label', 'Slimy, mushy dissolution of internal pith'),
    ('symptom', (SELECT id FROM symptoms WHERE code = 'stem_slimy_mushy_pith_dissolution'), 'km', 'label', 'បណ្តូលដើមរលួយក្លាយជាទឹករំអិល'),
    ('symptom', (SELECT id FROM symptoms WHERE code = 'stem_foul_putrid_rotting_odor'), 'en', 'label', 'Foul, putrid rotting odor from stem'),
    ('symptom', (SELECT id FROM symptoms WHERE code = 'stem_foul_putrid_rotting_odor'), 'km', 'label', 'ក្លិនស្អុយគគ្រុកចេញពីដើម'),
    ('symptom', (SELECT id FROM symptoms WHERE code = 'stem_large_black_sclerotia'), 'en', 'label', 'Large, black, irregular sclerotia inside hollow stem'),
    ('symptom', (SELECT id FROM symptoms WHERE code = 'stem_large_black_sclerotia'), 'km', 'label', 'គ្រាប់កកខ្មៅរឹងធំៗក្នុងប្រហោងដើម'),
    ('symptom', (SELECT id FROM symptoms WHERE code = 'stem_peppery_microsclerotia_shredded_pith'), 'en', 'label', 'Microscopic black specks or peppery microsclerotia inside shredded pith'),
    ('symptom', (SELECT id FROM symptoms WHERE code = 'stem_peppery_microsclerotia_shredded_pith'), 'km', 'label', 'បណ្តូលដើមរលួយសរសៃស្វិតនិងមានចំណុចខ្មៅដូចគ្រាប់ម្រេច'),
    ('symptom', (SELECT id FROM symptoms WHERE code = 'stem_cottony_white_mycelium'), 'en', 'label', 'Fluffy, cottony white mycelium on stem exterior'),
    ('symptom', (SELECT id FROM symptoms WHERE code = 'stem_cottony_white_mycelium'), 'km', 'label', 'សរសៃផ្សិតសដូចសំឡីលើសំបកដើម'),
    ('symptom', (SELECT id FROM symptoms WHERE code = 'stem_pycnidia_embedded_lesions'), 'en', 'label', 'Tiny black pimple-like pycnidia embedded in stem lesions'),
    ('symptom', (SELECT id FROM symptoms WHERE code = 'stem_pycnidia_embedded_lesions'), 'km', 'label', 'គ្រាប់ពងបែកខ្មៅតូចៗកប់ក្នុងដំបៅដើម'),
    ('symptom', (SELECT id FROM symptoms WHERE code = 'stem_easily_crushed_thumb_pressure'), 'en', 'label', 'Stem easily crushed under thumb pressure'),
    ('symptom', (SELECT id FROM symptoms WHERE code = 'stem_easily_crushed_thumb_pressure'), 'km', 'label', 'ដើមងាយស្រួយសង្កត់បាក់ដោយមេដៃ'),

    -- 28-47, +2 indicators: Leaf (22 leaf symptoms)
    ('symptom', (SELECT id FROM symptoms WHERE code = 'leaf_interveinal_chlorosis_mottling'), 'en', 'label', 'Interveinal chlorosis and mottled yellowing between green veins'),
    ('symptom', (SELECT id FROM symptoms WHERE code = 'leaf_interveinal_chlorosis_mottling'), 'km', 'label', 'ស្លឹកឡើងលឿងនិងស្ងួតឆេះចន្លោះទ្រនុង (ស្លឹកក្រឡាខ្លា)'),
    ('symptom', (SELECT id FROM symptoms WHERE code = 'leaf_systemic_chlorosis_banding'), 'en', 'label', 'Systemic chlorosis banding along primary leaf veins'),
    ('symptom', (SELECT id FROM symptoms WHERE code = 'leaf_systemic_chlorosis_banding'), 'km', 'label', 'ស្លឹកឡើងឆ្នូតលឿងតាមទ្រនុងមេ'),
    ('symptom', (SELECT id FROM symptoms WHERE code = 'leaf_bright_bleached_apical_chlorosis'), 'en', 'label', 'Bright, bleached apical chlorosis on topmost foliage'),
    ('symptom', (SELECT id FROM symptoms WHERE code = 'leaf_bright_bleached_apical_chlorosis'), 'km', 'label', 'ចុងត្រួយឡើងលឿងស្លេកខ្លាំង'),
    ('symptom', (SELECT id FROM symptoms WHERE code = 'leaf_circular_angular_necrotic_spots'), 'en', 'label', 'Circular-to-angular brown or black necrotic leaf spots'),
    ('symptom', (SELECT id FROM symptoms WHERE code = 'leaf_circular_angular_necrotic_spots'), 'km', 'label', 'ស្នាមអុជមូលឬជ្រុងពណ៌ត្នោតឬខ្មៅលើស្លឹក'),
    ('symptom', (SELECT id FROM symptoms WHERE code = 'leaf_concentric_target_board_rings'), 'en', 'label', 'Concentric target-board rings within leaf spots'),
    ('symptom', (SELECT id FROM symptoms WHERE code = 'leaf_concentric_target_board_rings'), 'km', 'label', 'ស្នាមអុជមានរង្វង់មូលជាន់គ្នាដូចផ្ទាំងស៊ីបលើស្លឹក'),
    ('symptom', (SELECT id FROM symptoms WHERE code = 'leaf_angular_water_soaked_translucent_spots'), 'en', 'label', 'Angular, vein-delimited water-soaked spots translucent under light'),
    ('symptom', (SELECT id FROM symptoms WHERE code = 'leaf_angular_water_soaked_translucent_spots'), 'km', 'label', 'ស្នាមអុជជ្រុងតាមក្រឡាសរសៃស្លឹកជាំទឹកមើលឆ្លុះពន្លឺធ្លុះ'),
    ('symptom', (SELECT id FROM symptoms WHERE code = 'leaf_spots_ash_gray_pycnidia'), 'en', 'label', 'Ash-gray leaf spots speckled with black pycnidia'),
    ('symptom', (SELECT id FROM symptoms WHERE code = 'leaf_spots_ash_gray_pycnidia'), 'km', 'label', 'ស្នាមអុជពណ៌ប្រផេះមានគ្រាប់ខ្មៅតូចៗកប់នៅកណ្តាល'),
    ('symptom', (SELECT id FROM symptoms WHERE code = 'leaf_spots_pale_center_reddish_margin'), 'en', 'label', 'Leaf spots with pale centers and distinct reddish-purple to dark brown margins'),
    ('symptom', (SELECT id FROM symptoms WHERE code = 'leaf_spots_pale_center_reddish_margin'), 'km', 'label', 'ស្នាមអុជកណ្តាលសស្លេកគែមពណ៌ស្វាយក្រហមឬត្នោតចាស់'),
    ('symptom', (SELECT id FROM symptoms WHERE code = 'leaf_triangular_marginal_necrotic_lesions'), 'en', 'label', 'Triangular necrotic lesions starting at leaf margins and moving down petioles'),
    ('symptom', (SELECT id FROM symptoms WHERE code = 'leaf_triangular_marginal_necrotic_lesions'), 'km', 'label', 'ស្នាមងាប់រាងត្រីកោណផ្តើមពីចុងស្លឹកចូលតាមទ្រនុង'),
    ('symptom', (SELECT id FROM symptoms WHERE code = 'leaf_chlorotic_yellow_halos'), 'en', 'label', 'Chlorotic yellow halos surrounding necrotic spots'),
    ('symptom', (SELECT id FROM symptoms WHERE code = 'leaf_chlorotic_yellow_halos'), 'km', 'label', 'រង្វង់លឿងព័ទ្ធជុំវិញស្នាមអុជខ្មៅលើស្លឹក'),
    ('symptom', (SELECT id FROM symptoms WHERE code = 'leaf_premature_defoliation_drop'), 'en', 'label', 'Premature defoliation and leaf drop'),
    ('symptom', (SELECT id FROM symptoms WHERE code = 'leaf_premature_defoliation_drop'), 'km', 'label', 'ជ្រុះស្លឹកមុនអាយុ'),
    ('symptom', (SELECT id FROM symptoms WHERE code = 'leaf_thickened_brittle_downward_cupped'), 'en', 'label', 'Thickened, brittle, downward-cupped foliage'),
    ('symptom', (SELECT id FROM symptoms WHERE code = 'leaf_thickened_brittle_downward_cupped'), 'km', 'label', 'ស្លឹកឡើងក្រាស់ ស្រួយ និងកោងក្ដោបចុះក្រោម'),
    ('symptom', (SELECT id FROM symptoms WHERE code = 'leaf_distortion_puckering_ragged_margins'), 'en', 'label', 'Leaf distortion, puckering, or ragged margins'),
    ('symptom', (SELECT id FROM symptoms WHERE code = 'leaf_distortion_puckering_ragged_margins'), 'km', 'label', 'ស្លឹកជ្រួញរួញ ឬគែមធ្លុះធ្លាយ'),
    ('symptom', (SELECT id FROM symptoms WHERE code = 'leaf_light_dark_green_mosaic'), 'en', 'label', 'Interspersed light-and-dark green mosaic patterns on leaves'),
    ('symptom', (SELECT id FROM symptoms WHERE code = 'leaf_light_dark_green_mosaic'), 'km', 'label', 'ស្លឹកឡើងក្រឡាអុជពណ៌បៃតងខ្ចីលាយបៃតងចាស់'),
    ('symptom', (SELECT id FROM symptoms WHERE code = 'leaf_cinnamon_brown_powdery_pustules'), 'en', 'label', 'Cinnamon-brown powdery pustules on leaf surfaces'),
    ('symptom', (SELECT id FROM symptoms WHERE code = 'leaf_cinnamon_brown_powdery_pustules'), 'km', 'label', 'ពងបែកម្សៅពណ៌ត្នោតច្រែះលើផ្ទៃស្លឹក'),
    ('symptom', (SELECT id FROM symptoms WHERE code = 'leaf_black_raised_late_season_pustules'), 'en', 'label', 'Black, raised pustules on leaves in late season'),
    ('symptom', (SELECT id FROM symptoms WHERE code = 'leaf_black_raised_late_season_pustules'), 'km', 'label', 'ពងបែកឡើងខ្មៅលើស្លឹកនៅចុងរដូវ'),
    ('symptom', (SELECT id FROM symptoms WHERE code = 'leaf_dense_white_felt_undersides'), 'en', 'label', 'Dense, white, carpet-like felt strictly on leaf undersides'),
    ('symptom', (SELECT id FROM symptoms WHERE code = 'leaf_dense_white_felt_undersides'), 'km', 'label', 'ស្រទាប់រោមពណ៌សកម្រាស់ក្រាស់នៅផ្ទៃខាងក្រោមស្លឹក'),
    ('symptom', (SELECT id FROM symptoms WHERE code = 'leaf_white_talcum_powder_patches'), 'en', 'label', 'White, talcum-powder-like patches on upper leaf surfaces'),
    ('symptom', (SELECT id FROM symptoms WHERE code = 'leaf_white_talcum_powder_patches'), 'km', 'label', 'ស្រទាប់ម្សៅពណ៌សដូចម្សៅផាត់លើផ្ទៃខាងលើស្លឹក'),
    ('symptom', (SELECT id FROM symptoms WHERE code = 'leaf_porcelain_white_chalky_blisters'), 'en', 'label', 'Raised, smooth, porcelain-white to chalky blisters on leaf undersides'),
    ('symptom', (SELECT id FROM symptoms WHERE code = 'leaf_porcelain_white_chalky_blisters'), 'km', 'label', 'ពងបែកពណ៌សដូចកុលាលភាជន៍នៅផ្ទៃខាងក្រោមស្លឹក'),
    ('symptom', (SELECT id FROM symptoms WHERE code = 'leaf_chlorotic_swellings_upper_surface'), 'en', 'label', 'Yellow chlorotic swellings on upper leaf surface corresponding to blisters below'),
    ('symptom', (SELECT id FROM symptoms WHERE code = 'leaf_chlorotic_swellings_upper_surface'), 'km', 'label', 'ពកប៉ោងពណ៌លឿងនៅផ្ទៃខាងលើស្លឹកចំពីលើពងបែក'),
    ('symptom', (SELECT id FROM symptoms WHERE code = 'leaf_mosaic_yellow_green_mottling'), 'en', 'label', 'Vivid yellow-green foliar mosaic and leaf mottling'),
    ('symptom', (SELECT id FROM symptoms WHERE code = 'leaf_mosaic_yellow_green_mottling'), 'km', 'label', 'ស្លឹកឡើងក្រឡាអុជពណ៌លឿងលាយបៃតងច្បាស់'),
    ('symptom', (SELECT id FROM symptoms WHERE code = 'leaf_vein_clearing_chlorosis'), 'en', 'label', 'Vein clearing and yellow chlorotic banding along leaf veins'),
    ('symptom', (SELECT id FROM symptoms WHERE code = 'leaf_vein_clearing_chlorosis'), 'km', 'label', 'សរសៃស្លឹកប្រែជាថ្លានិងលឿងតាមបណ្តាញទ្រនុង'),

    -- 48-60: Head (13 head symptoms)
    ('symptom', (SELECT id FROM symptoms WHERE code = 'head_water_soaked_soft_brown_decay'), 'en', 'label', 'Water-soaked, soft brown decay on receptacle at the back of head'),
    ('symptom', (SELECT id FROM symptoms WHERE code = 'head_water_soaked_soft_brown_decay'), 'km', 'label', 'រលួយជាំទឹកពណ៌ត្នោតទន់នៅខ្នងក្បាលផ្កា'),
    ('symptom', (SELECT id FROM symptoms WHERE code = 'head_shredded_skeletonized_matrix'), 'en', 'label', 'Shredded, skeletonized floral head matrix'),
    ('symptom', (SELECT id FROM symptoms WHERE code = 'head_shredded_skeletonized_matrix'), 'km', 'label', 'ក្បាលផ្ការលួយសរសៃសុទ្ធដូចអំបោស'),
    ('symptom', (SELECT id FROM symptoms WHERE code = 'head_white_mycelium_black_sclerotia'), 'en', 'label', 'White fluffy mycelium and large black sclerotia embedded among seeds'),
    ('symptom', (SELECT id FROM symptoms WHERE code = 'head_white_mycelium_black_sclerotia'), 'km', 'label', 'សរសៃផ្សិតសដូចសំឡី និងគ្រាប់កកខ្មៅធំៗក្នុងរន្ធគ្រាប់ផ្កា'),
    ('symptom', (SELECT id FROM symptoms WHERE code = 'head_coarse_gray_whisker_mold'), 'en', 'label', 'Coarse gray whisker-like mold covered with tiny black pinhead sporangia'),
    ('symptom', (SELECT id FROM symptoms WHERE code = 'head_coarse_gray_whisker_mold'), 'km', 'label', 'ផ្សិតសរសៃវែងពណ៌ប្រផេះដូចពុកចង្កា មានក្បាលខ្មៅតូចៗលើផ្កា'),
    ('symptom', (SELECT id FROM symptoms WHERE code = 'head_rot_initiating_around_wounds'), 'en', 'label', 'Head rot strictly initiating around mechanical wounds, hail cuts, or insect boreholes'),
    ('symptom', (SELECT id FROM symptoms WHERE code = 'head_rot_initiating_around_wounds'), 'km', 'label', 'ក្បាលផ្ការលួយផ្តើមចេញពីកន្លែងសត្វល្អិតចោះ ឬស្នាមរបួសធ្លុះ'),
    ('symptom', (SELECT id FROM symptoms WHERE code = 'head_mouse_gray_velvety_spore_mat'), 'en', 'label', 'Dense, mouse-gray velvety spore mat covering head face and seeds'),
    ('symptom', (SELECT id FROM symptoms WHERE code = 'head_mouse_gray_velvety_spore_mat'), 'km', 'label', 'ស្រទាប់ផ្សិតកម្ញីពណ៌ប្រផេះគ្របពីលើផ្កា និងគ្រាប់'),
    ('symptom', (SELECT id FROM symptoms WHERE code = 'head_black_crust_sclerotia'), 'en', 'label', 'Thin, black crust-like sclerotia on head surface'),
    ('symptom', (SELECT id FROM symptoms WHERE code = 'head_black_crust_sclerotia'), 'km', 'label', 'ស្រទាប់កកពណ៌ខ្មៅស្តើងលើផ្ទៃផ្កា'),
    ('symptom', (SELECT id FROM symptoms WHERE code = 'head_phyllody_floral_transformation'), 'en', 'label', 'Phyllody transformation of floral florets into deformed green leafy structures'),
    ('symptom', (SELECT id FROM symptoms WHERE code = 'head_phyllody_floral_transformation'), 'km', 'label', 'ស្រទាប់ផ្កាក្លាយទៅជាស្លឹកបៃតងខូចទ្រង់ទ្រាយ'),
    ('symptom', (SELECT id FROM symptoms WHERE code = 'head_virescence_green_discoloration'), 'en', 'label', 'Virescence and green discoloration of floral organs'),
    ('symptom', (SELECT id FROM symptoms WHERE code = 'head_virescence_green_discoloration'), 'km', 'label', 'ផ្កាឬត្របកផ្កាឡើងពណ៌បៃតង'),
    ('symptom', (SELECT id FROM symptoms WHERE code = 'head_asymmetrical_distorted_wedge_sector'), 'en', 'label', 'Asymmetrical, distorted flower head with a stunted sterile wedge sector'),
    ('symptom', (SELECT id FROM symptoms WHERE code = 'head_asymmetrical_distorted_wedge_sector'), 'km', 'label', 'ផ្កាខូចទ្រង់ទ្រាយ ក្រិនស្វិតមួយចំហៀង'),
    ('symptom', (SELECT id FROM symptoms WHERE code = 'head_abnormal_upright_flat_rigid'), 'en', 'label', 'Abnormal upright, flat, rigid, and sterile flower heads'),
    ('symptom', (SELECT id FROM symptoms WHERE code = 'head_abnormal_upright_flat_rigid'), 'km', 'label', 'ផ្កាឈរត្រង់ ប៉ាតស្មើ និងគ្មានគ្រាប់'),
    ('symptom', (SELECT id FROM symptoms WHERE code = 'head_premature_seed_shattering'), 'en', 'label', 'Premature seed shattering and loose seeds dropping from head'),
    ('symptom', (SELECT id FROM symptoms WHERE code = 'head_premature_seed_shattering'), 'km', 'label', 'គ្រាប់ជ្រុះរោយមុនពេលប្រមូលផល'),
    ('symptom', (SELECT id FROM symptoms WHERE code = 'head_reduced_seed_size_shriveled'), 'en', 'label', 'Reduced seed size, blank seeds, or shriveled kernels'),
    ('symptom', (SELECT id FROM symptoms WHERE code = 'head_reduced_seed_size_shriveled'), 'km', 'label', 'គ្រាប់ស្កក គ្រាប់ស្រកទម្ងន់ ឬគ្រាប់រួមតូច')
ON CONFLICT (entity_type, entity_id, locale, field) 
DO UPDATE SET value = EXCLUDED.value;

-- ============================================================================
-- SECTION 5: INSERT ALL 80 DISEASE-SYMPTOM WEIGHTS & CLINICAL RULES
-- ============================================================================
INSERT INTO disease_symptoms (disease_id, symptom_id, weight, is_pathognomonic, is_required)
VALUES
    -- 1. Sclerotinia Basal Stalk Rot
    ((SELECT id FROM diseases WHERE slug = 'sclerotinia-basal-stalk-rot'), (SELECT id FROM symptoms WHERE code = 'stem_chalky_white_bleached_surface'), 0.30, true, false),
    ((SELECT id FROM diseases WHERE slug = 'sclerotinia-basal-stalk-rot'), (SELECT id FROM symptoms WHERE code = 'stem_large_black_sclerotia'), 0.35, true, false),
    ((SELECT id FROM diseases WHERE slug = 'sclerotinia-basal-stalk-rot'), (SELECT id FROM symptoms WHERE code = 'whole_plant_sudden_canopy_wilting'), 0.20, false, false),
    ((SELECT id FROM diseases WHERE slug = 'sclerotinia-basal-stalk-rot'), (SELECT id FROM symptoms WHERE code = 'stem_cottony_white_mycelium'), 0.15, false, false),

    -- 2. Sclerotinia Head Rot
    ((SELECT id FROM diseases WHERE slug = 'sclerotinia-head-rot'), (SELECT id FROM symptoms WHERE code = 'head_water_soaked_soft_brown_decay'), 0.25, false, false),
    ((SELECT id FROM diseases WHERE slug = 'sclerotinia-head-rot'), (SELECT id FROM symptoms WHERE code = 'head_white_mycelium_black_sclerotia'), 0.35, true, false),
    ((SELECT id FROM diseases WHERE slug = 'sclerotinia-head-rot'), (SELECT id FROM symptoms WHERE code = 'head_shredded_skeletonized_matrix'), 0.25, true, false),
    ((SELECT id FROM diseases WHERE slug = 'sclerotinia-head-rot'), (SELECT id FROM symptoms WHERE code = 'head_premature_seed_shattering'), 0.15, false, false),

    -- 3. Sunflower Rust
    ((SELECT id FROM diseases WHERE slug = 'sunflower-rust'), (SELECT id FROM symptoms WHERE code = 'leaf_cinnamon_brown_powdery_pustules'), 0.40, true, true),
    ((SELECT id FROM diseases WHERE slug = 'sunflower-rust'), (SELECT id FROM symptoms WHERE code = 'leaf_black_raised_late_season_pustules'), 0.25, false, false),
    ((SELECT id FROM diseases WHERE slug = 'sunflower-rust'), (SELECT id FROM symptoms WHERE code = 'leaf_premature_defoliation_drop'), 0.20, false, false),
    ((SELECT id FROM diseases WHERE slug = 'sunflower-rust'), (SELECT id FROM symptoms WHERE code = 'head_reduced_seed_size_shriveled'), 0.15, false, false),

    -- 4. Downy Mildew
    ((SELECT id FROM diseases WHERE slug = 'downy-mildew'), (SELECT id FROM symptoms WHERE code = 'leaf_dense_white_felt_undersides'), 0.35, true, true),
    ((SELECT id FROM diseases WHERE slug = 'downy-mildew'), (SELECT id FROM symptoms WHERE code = 'whole_plant_severe_stunting_dwarfism'), 0.25, false, false),
    ((SELECT id FROM diseases WHERE slug = 'downy-mildew'), (SELECT id FROM symptoms WHERE code = 'leaf_systemic_chlorosis_banding'), 0.25, false, false),
    ((SELECT id FROM diseases WHERE slug = 'downy-mildew'), (SELECT id FROM symptoms WHERE code = 'head_abnormal_upright_flat_rigid'), 0.15, false, false),

    -- 5. Phomopsis Stem Canker
    ((SELECT id FROM diseases WHERE slug = 'phomopsis-stem-canker'), (SELECT id FROM symptoms WHERE code = 'stem_sunken_tan_gray_cankers'), 0.35, true, true),
    ((SELECT id FROM diseases WHERE slug = 'phomopsis-stem-canker'), (SELECT id FROM symptoms WHERE code = 'stem_easily_crushed_thumb_pressure'), 0.25, false, false),
    ((SELECT id FROM diseases WHERE slug = 'phomopsis-stem-canker'), (SELECT id FROM symptoms WHERE code = 'leaf_triangular_marginal_necrotic_lesions'), 0.25, false, false),
    ((SELECT id FROM diseases WHERE slug = 'phomopsis-stem-canker'), (SELECT id FROM symptoms WHERE code = 'whole_plant_stalk_lodging_collapse'), 0.15, false, false),

    -- 6. Phoma Black Stem
    ((SELECT id FROM diseases WHERE slug = 'phoma-black-stem'), (SELECT id FROM symptoms WHERE code = 'stem_jet_black_shiny_patches'), 0.40, true, true),
    ((SELECT id FROM diseases WHERE slug = 'phoma-black-stem'), (SELECT id FROM symptoms WHERE code = 'stem_pycnidia_embedded_lesions'), 0.30, false, false),
    ((SELECT id FROM diseases WHERE slug = 'phoma-black-stem'), (SELECT id FROM symptoms WHERE code = 'stem_pith_disintegration_hollow_stalk'), 0.15, false, false),
    ((SELECT id FROM diseases WHERE slug = 'phoma-black-stem'), (SELECT id FROM symptoms WHERE code = 'whole_plant_premature_death_drying'), 0.15, false, false),

    -- 7. Verticillium Wilt
    ((SELECT id FROM diseases WHERE slug = 'verticillium-wilt'), (SELECT id FROM symptoms WHERE code = 'leaf_interveinal_chlorosis_mottling'), 0.35, true, true),
    ((SELECT id FROM diseases WHERE slug = 'verticillium-wilt'), (SELECT id FROM symptoms WHERE code = 'whole_plant_dark_vascular_ring'), 0.30, true, false),
    ((SELECT id FROM diseases WHERE slug = 'verticillium-wilt'), (SELECT id FROM symptoms WHERE code = 'whole_plant_premature_death_drying'), 0.20, false, false),
    ((SELECT id FROM diseases WHERE slug = 'verticillium-wilt'), (SELECT id FROM symptoms WHERE code = 'whole_plant_stalk_lodging_collapse'), 0.15, false, false),

    -- 8. Charcoal Rot
    ((SELECT id FROM diseases WHERE slug = 'charcoal-rot'), (SELECT id FROM symptoms WHERE code = 'stem_silvery_ash_gray_discoloration'), 0.35, true, true),
    ((SELECT id FROM diseases WHERE slug = 'charcoal-rot'), (SELECT id FROM symptoms WHERE code = 'stem_peppery_microsclerotia_shredded_pith'), 0.35, true, false),
    ((SELECT id FROM diseases WHERE slug = 'charcoal-rot'), (SELECT id FROM symptoms WHERE code = 'whole_plant_premature_death_drying'), 0.15, false, false),
    ((SELECT id FROM diseases WHERE slug = 'charcoal-rot'), (SELECT id FROM symptoms WHERE code = 'whole_plant_stalk_lodging_collapse'), 0.15, false, false),

    -- 9. Fusarium Wilt
    ((SELECT id FROM diseases WHERE slug = 'fusarium-wilt'), (SELECT id FROM symptoms WHERE code = 'whole_plant_unilateral_wilting_yellowing'), 0.35, true, true),
    ((SELECT id FROM diseases WHERE slug = 'fusarium-wilt'), (SELECT id FROM symptoms WHERE code = 'whole_plant_orange_reddish_vascular_streaks'), 0.30, true, false),
    ((SELECT id FROM diseases WHERE slug = 'fusarium-wilt'), (SELECT id FROM symptoms WHERE code = 'root_decay_feeder_tips'), 0.20, false, false),
    ((SELECT id FROM diseases WHERE slug = 'fusarium-wilt'), (SELECT id FROM symptoms WHERE code = 'whole_plant_severe_stunting_dwarfism'), 0.15, false, false),

    -- 10. Alternaria Leaf Spot
    ((SELECT id FROM diseases WHERE slug = 'alternaria-leaf-spot'), (SELECT id FROM symptoms WHERE code = 'leaf_concentric_target_board_rings'), 0.35, true, true),
    ((SELECT id FROM diseases WHERE slug = 'alternaria-leaf-spot'), (SELECT id FROM symptoms WHERE code = 'leaf_circular_angular_necrotic_spots'), 0.25, false, false),
    ((SELECT id FROM diseases WHERE slug = 'alternaria-leaf-spot'), (SELECT id FROM symptoms WHERE code = 'stem_elongated_black_streaks'), 0.20, false, false),
    ((SELECT id FROM diseases WHERE slug = 'alternaria-leaf-spot'), (SELECT id FROM symptoms WHERE code = 'leaf_premature_defoliation_drop'), 0.20, false, false),

    -- 11. Septoria Leaf Spot
    ((SELECT id FROM diseases WHERE slug = 'septoria-leaf-spot'), (SELECT id FROM symptoms WHERE code = 'leaf_spots_ash_gray_pycnidia'), 0.40, true, true),
    ((SELECT id FROM diseases WHERE slug = 'septoria-leaf-spot'), (SELECT id FROM symptoms WHERE code = 'leaf_circular_angular_necrotic_spots'), 0.30, false, false),
    ((SELECT id FROM diseases WHERE slug = 'septoria-leaf-spot'), (SELECT id FROM symptoms WHERE code = 'leaf_chlorotic_yellow_halos'), 0.15, false, false),
    ((SELECT id FROM diseases WHERE slug = 'septoria-leaf-spot'), (SELECT id FROM symptoms WHERE code = 'leaf_premature_defoliation_drop'), 0.15, false, false),

    -- 12. Cercospora Leaf Spot
    ((SELECT id FROM diseases WHERE slug = 'cercospora-leaf-spot'), (SELECT id FROM symptoms WHERE code = 'leaf_spots_pale_center_reddish_margin'), 0.40, true, true),
    ((SELECT id FROM diseases WHERE slug = 'cercospora-leaf-spot'), (SELECT id FROM symptoms WHERE code = 'leaf_circular_angular_necrotic_spots'), 0.30, false, false),
    ((SELECT id FROM diseases WHERE slug = 'cercospora-leaf-spot'), (SELECT id FROM symptoms WHERE code = 'leaf_chlorotic_yellow_halos'), 0.15, false, false),
    ((SELECT id FROM diseases WHERE slug = 'cercospora-leaf-spot'), (SELECT id FROM symptoms WHERE code = 'leaf_premature_defoliation_drop'), 0.15, false, false),

    -- 13. Powdery Mildew
    ((SELECT id FROM diseases WHERE slug = 'powdery-mildew'), (SELECT id FROM symptoms WHERE code = 'leaf_white_talcum_powder_patches'), 0.40, true, true),
    ((SELECT id FROM diseases WHERE slug = 'powdery-mildew'), (SELECT id FROM symptoms WHERE code = 'stem_cottony_white_mycelium'), 0.25, false, false),
    ((SELECT id FROM diseases WHERE slug = 'powdery-mildew'), (SELECT id FROM symptoms WHERE code = 'leaf_thickened_brittle_downward_cupped'), 0.20, false, false),
    ((SELECT id FROM diseases WHERE slug = 'powdery-mildew'), (SELECT id FROM symptoms WHERE code = 'leaf_premature_defoliation_drop'), 0.15, false, false),

    -- 14. White Rust
    ((SELECT id FROM diseases WHERE slug = 'white-rust'), (SELECT id FROM symptoms WHERE code = 'leaf_porcelain_white_chalky_blisters'), 0.40, true, true),
    ((SELECT id FROM diseases WHERE slug = 'white-rust'), (SELECT id FROM symptoms WHERE code = 'leaf_chlorotic_swellings_upper_surface'), 0.30, false, false),
    ((SELECT id FROM diseases WHERE slug = 'white-rust'), (SELECT id FROM symptoms WHERE code = 'leaf_distortion_puckering_ragged_margins'), 0.15, false, false),
    ((SELECT id FROM diseases WHERE slug = 'white-rust'), (SELECT id FROM symptoms WHERE code = 'whole_plant_severe_stunting_dwarfism'), 0.15, false, false),

    -- 15. Rhizopus Head Rot
    ((SELECT id FROM diseases WHERE slug = 'rhizopus-head-rot'), (SELECT id FROM symptoms WHERE code = 'head_coarse_gray_whisker_mold'), 0.40, true, true),
    ((SELECT id FROM diseases WHERE slug = 'rhizopus-head-rot'), (SELECT id FROM symptoms WHERE code = 'head_rot_initiating_around_wounds'), 0.25, false, false),
    ((SELECT id FROM diseases WHERE slug = 'rhizopus-head-rot'), (SELECT id FROM symptoms WHERE code = 'head_water_soaked_soft_brown_decay'), 0.20, false, false),
    ((SELECT id FROM diseases WHERE slug = 'rhizopus-head-rot'), (SELECT id FROM symptoms WHERE code = 'head_premature_seed_shattering'), 0.15, false, false),

    -- 16. Botrytis Gray Mold
    ((SELECT id FROM diseases WHERE slug = 'botrytis-gray-mold'), (SELECT id FROM symptoms WHERE code = 'head_mouse_gray_velvety_spore_mat'), 0.40, true, true),
    ((SELECT id FROM diseases WHERE slug = 'botrytis-gray-mold'), (SELECT id FROM symptoms WHERE code = 'head_black_crust_sclerotia'), 0.25, false, false),
    ((SELECT id FROM diseases WHERE slug = 'botrytis-gray-mold'), (SELECT id FROM symptoms WHERE code = 'head_water_soaked_soft_brown_decay'), 0.20, false, false),
    ((SELECT id FROM diseases WHERE slug = 'botrytis-gray-mold'), (SELECT id FROM symptoms WHERE code = 'head_reduced_seed_size_shriveled'), 0.15, false, false),

    -- 17. Bacterial Stalk & Head Rot
    ((SELECT id FROM diseases WHERE slug = 'bacterial-stalk-head-rot'), (SELECT id FROM symptoms WHERE code = 'stem_slimy_mushy_pith_dissolution'), 0.35, true, true),
    ((SELECT id FROM diseases WHERE slug = 'bacterial-stalk-head-rot'), (SELECT id FROM symptoms WHERE code = 'stem_foul_putrid_rotting_odor'), 0.30, true, false),
    ((SELECT id FROM diseases WHERE slug = 'bacterial-stalk-head-rot'), (SELECT id FROM symptoms WHERE code = 'stem_water_soaked_greasy_lesions'), 0.20, false, false),
    ((SELECT id FROM diseases WHERE slug = 'bacterial-stalk-head-rot'), (SELECT id FROM symptoms WHERE code = 'whole_plant_stalk_lodging_collapse'), 0.15, false, false),

    -- 18. Bacterial Leaf Spot
    ((SELECT id FROM diseases WHERE slug = 'bacterial-leaf-spot'), (SELECT id FROM symptoms WHERE code = 'leaf_angular_water_soaked_translucent_spots'), 0.40, true, true),
    ((SELECT id FROM diseases WHERE slug = 'bacterial-leaf-spot'), (SELECT id FROM symptoms WHERE code = 'leaf_bright_bleached_apical_chlorosis'), 0.25, false, false),
    ((SELECT id FROM diseases WHERE slug = 'bacterial-leaf-spot'), (SELECT id FROM symptoms WHERE code = 'leaf_chlorotic_yellow_halos'), 0.20, false, false),
    ((SELECT id FROM diseases WHERE slug = 'bacterial-leaf-spot'), (SELECT id FROM symptoms WHERE code = 'leaf_distortion_puckering_ragged_margins'), 0.15, false, false),

    -- 19. Pythium Damping-Off
    ((SELECT id FROM diseases WHERE slug = 'pythium-damping-off'), (SELECT id FROM symptoms WHERE code = 'seedling_damping_off_collapse'), 0.35, true, true),
    ((SELECT id FROM diseases WHERE slug = 'pythium-damping-off'), (SELECT id FROM symptoms WHERE code = 'seedling_pinched_water_soaked_collar'), 0.30, false, false),
    ((SELECT id FROM diseases WHERE slug = 'pythium-damping-off'), (SELECT id FROM symptoms WHERE code = 'seedling_uneven_emergence_bare_patches'), 0.20, false, false),
    ((SELECT id FROM diseases WHERE slug = 'pythium-damping-off'), (SELECT id FROM symptoms WHERE code = 'seedling_pre_emergence_seed_rot'), 0.15, false, false),

    -- 20. Aster Yellows
    ((SELECT id FROM diseases WHERE slug = 'aster-yellows'), (SELECT id FROM symptoms WHERE code = 'head_phyllody_floral_transformation'), 0.35, true, true),
    ((SELECT id FROM diseases WHERE slug = 'aster-yellows'), (SELECT id FROM symptoms WHERE code = 'head_virescence_green_discoloration'), 0.25, false, false),
    ((SELECT id FROM diseases WHERE slug = 'aster-yellows'), (SELECT id FROM symptoms WHERE code = 'head_asymmetrical_distorted_wedge_sector'), 0.20, false, false),
    ((SELECT id FROM diseases WHERE slug = 'aster-yellows'), (SELECT id FROM symptoms WHERE code = 'whole_plant_witches_broom_proliferation'), 0.20, false, false)
ON CONFLICT (disease_id, symptom_id) DO UPDATE 
SET weight = EXCLUDED.weight,
    is_pathognomonic = EXCLUDED.is_pathognomonic,
    is_required = EXCLUDED.is_required;

COMMIT;
