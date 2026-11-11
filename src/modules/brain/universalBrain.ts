export type IndianLanguage = 'hinglish' | 'hi' | 'ta' | 'mr' | 'en';

export interface ActionIntent {
  id: string;
  label: string;
  icon: string;
  badge: string;
  summary: string;
  spokenResponses: Record<IndianLanguage, string>;
  arOverlay: {
    coordinates: { x: number; y: number; width: number; height: number };
    calloutText: string;
    styleType: 'recycle-zones' | 'shopping-matches' | 'cut-lines' | 'schematic-box' | 'hazard-perimeter';
    matchCards?: Array<{ name: string; price: string; score: string; delta: string }>;
    stepInstructions: string[];
  };
  agentSkill: {
    skillName: string;
    actionStatus: string;
    detail: string;
    bigQueryTable: string;
    telemetry: Record<string, string | number | boolean>;
  };
  diagnosticBrain: {
    componentOrSubject: string;
    conditionOrFault: string;
    citationOrSpec: string;
    safetyWarning: string;
    imageEditPrompt: string;
  };
}

export interface UniversalObjectPreset {
  id: string;
  label: string;
  category: 'consumer' | 'tech' | 'industrial' | 'camera';
  domain: string;
  objectName: string;
  material: string;
  condition: string;
  sampleImage: string;
  proactiveQuestions: Record<IndianLanguage, string>;
  intents: ActionIntent[];
}

export interface LearnedRule {
  id: string;
  timestamp: string;
  trigger: string;
  ruleText: string;
  confidence: number;
  impact: string;
  feedback: 'helpful' | 'improved' | 'auto';
  thumbnail?: string;
}

export interface ScannedSpecimen {
  id: string;
  timestamp: string;
  objectName: string;
  category: string;
  thumbnail: string;
  ruleText: string;
  verified?: boolean;
}

export interface BrainMemoryState {
  version: string;
  level: number;
  experience: number;
  experienceNext: number;
  totalObjectsScanned: number;
  accuracyScore: number;
  rules: LearnedRule[];
  specimens?: ScannedSpecimen[];
  recentInteractions: string[];
}

export const UNIVERSAL_OBJECT_PRESETS: UniversalObjectPreset[] = [
  {
    id: 'juice-bottle',
    label: '🧃 Empty Juice Bottle (Eco / Consumer)',
    category: 'consumer',
    domain: 'Everyday Consumer Item & Packaging (Eco/Recycle)',
    objectName: 'Empty PET Plastic Juice Bottle (500ml)',
    material: 'PET (Polyethylene Terephthalate, Resin Code 1) + HDPE Cap',
    condition: 'Empty, rinsed clean, label and cap intact',
    sampleImage: 'https://images.unsplash.com/photo-1527661591475-527312dd65f5?auto=format&fit=crop&w=800&q=80',
    proactiveQuestions: {
      hinglish: 'Maine yeh empty juice bottle identify kiya hai! Aap iske sath kya karna chahte hain? Recycle karna hai, healthier alternative dhundna hai, ya DIY upcycle karna hai?',
      hi: 'मैंने यह खाली जूस की बोतल पहचानी है! आप इसके साथ क्या करना चाहते हैं? रीसायकल, स्वस्थ विकल्प, या DIY दोबारा उपयोग?',
      ta: 'நான் இந்த காலியான ஜூஸ் பாட்டிலை அடையாளம் கண்டுள்ளேன்! இதை மறுசுழற்சி செய்ய விரும்புகிறீர்களா அல்லது ஆரோக்கியமான மாற்றீட்டைத் தேட விரும்புகிறீர்களா?',
      mr: 'मी ही रिकामी ज्यूस बाटली ओळखली आहे! आपल्याला याचे रिसायकल करायचे आहे, निरोगी पर्याय शोधायचा आहे, की DIY पुनर्वापर करायचा आहे?',
      en: 'I recognized this empty PET juice bottle! What would you like to do? Recycle & dispose, find a healthier alternative online, or DIY upcycle it?'
    },
    intents: [
      {
        id: 'recycle-guide',
        label: '🗑️ Recycle & Dispose Guide',
        icon: '🗑️',
        badge: 'Eco Grade 1',
        summary: 'Identifies plastic resin grade, segregation rules & carbon offset.',
        spokenResponses: {
          hinglish: 'Yeh Grade 1 PET plastic hai. Cap ko alag karke blue dry waste bin mein crush karke daalein. Isse 45 grams CO2 emissions save honge!',
          hi: 'यह ग्रेड 1 पीईटी प्लास्टिक है। ढक्कन अलग करें और बोतल को दबाकर नीले सूखे कचरे के डिब्बे में डालें। 45 ग्राम कार्बन की बचत होगी!',
          ta: 'இது தரம் 1 PET பிளாஸ்டிக். மூடியைக் கழற்றி, நசுக்கி உலர்ந்த கழிவுத் தொட்டியில் போடுங்கள்.',
          mr: 'हे ग्रेड १ पीईटी प्लास्टिक आहे. टोपण वेगळे करून सुक्या कचऱ्याच्या डब्यात टाका.',
          en: 'This is Grade 1 PET plastic. Detach the cap, crush the bottle, and place it in the dry recyclables bin to save 45g of CO2 emissions.'
        },
        arOverlay: {
          coordinates: { x: 28, y: 18, width: 44, height: 68 },
          calloutText: 'ECO RECYCLE SEGREGATION',
          styleType: 'recycle-zones',
          stepInstructions: [
            'STEP 1: Twist off the HDPE cap (Resin Code 2 - separate processing stream).',
            'STEP 2: Peel off printed PVC shrink sleeve along the dotted perforation.',
            'STEP 3: Flatten bottle vertically to reduce haulage volume by 70% in blue bin.'
          ]
        },
        agentSkill: {
          skillName: 'SmartRecycleEcoSkill',
          actionStatus: 'EMISSIONS_LOGGED',
          detail: 'Logged 45g CO2 abatement to Municipal ESG ledger; Kiosk #42 notified.',
          bigQueryTable: 'kriyaos_eco.recycling_events',
          telemetry: { resinCode: 1, polymer: 'PET', co2GramsSaved: 45, binColor: 'blue_dry' }
        },
        diagnosticBrain: {
          componentOrSubject: 'PET Polyethylene Terephthalate Bottle (Resin Identification Code 1)',
          conditionOrFault: 'Clean, Post-Consumer Single-Use Beverage Container',
          citationOrSpec: 'IS 14534:1998 Guidelines for Recovery and Recycling of Plastics (BIS Standard)',
          safetyWarning: 'REUSE NOTICE: Not recommended for repeated hot water (>50°C) refill due to antimony leaching risk.',
          imageEditPrompt: 'Draw neon-green circular boundary around cap [STEP 1: DETACH CAP], draw dotted blue boundary on bottle body with recycling symbol ♳.'
        }
      },
      {
        id: 'find-similar',
        label: '🛒 Find Similar / Healthier Online',
        icon: '🛒',
        badge: 'Nutri-Score B',
        summary: 'Compares sugar/price and queues direct 10-minute delivery links.',
        spokenResponses: {
          hinglish: 'Is juice mein 24g added sugar thi! Maine 3 healthier zero-sugar cold-pressed options dhundhe hain: Raw Pressery Green Juice aur B-Natural 100% Pomegranate.',
          hi: 'इस जूस में 24 ग्राम अतिरिक्त चीनी थी! मैंने 3 स्वस्थ बिना चीनी वाले कोल्ड-प्रेस्ड विकल्प खोजे हैं।',
          ta: 'இதில் 24 கிராம் சர்க்கரை உள்ளது! சர்க்கரை சேர்க்கப்படாத 3 ஆரோக்கியமான பழச்சாறுகளைக் கண்டறிந்துள்ளேன்.',
          mr: 'या ज्यूसमध्ये २४ ग्रॅम साखर होती! मी ३ साखर नसलेले निरोगी पर्याय शोधले आहेत.',
          en: 'This beverage contained 24g of added sugar. I located 3 healthier zero-added-sugar cold-pressed juices available for 10-minute delivery.'
        },
        arOverlay: {
          coordinates: { x: 32, y: 35, width: 38, height: 45 },
          calloutText: 'TOP HEALTHIER ALTERNATIVES',
          styleType: 'shopping-matches',
          matchCards: [
            { name: 'Raw Pressery Cold-Pressed Valencia', price: '₹120', score: '0g Added Sugar', delta: '-100% Sugar' },
            { name: 'B-Natural 100% Pomegranate Nectar', price: '₹95', score: 'Cold Crafted', delta: '-75% Sugar' },
            { name: 'Tender Coconut Water (Fresh Bottle)', price: '₹60', score: 'Natural Electrolytes', delta: 'Pure Nature' }
          ],
          stepInstructions: [
            'MATCH 1: Raw Pressery Cold Pressed (10-min delivery via Blinkit/Zepto).',
            'MATCH 2: B-Natural Select 100% Pure Fruit Juice.',
            'MATCH 3: Tender Coconut Natural Isotonic.'
          ]
        },
        agentSkill: {
          skillName: 'FindSimilarOnlineSkill',
          actionStatus: 'QUICK_CART_PREPARED',
          detail: 'Compared 14 retail SKUs. Best price: ₹95 at local dark store; zero added sugar.',
          bigQueryTable: 'kriyaos_commerce.intent_conversions',
          telemetry: { originalSugarGrams: 24, suggestedSugarGrams: 0, deltaSavingsPct: 100 }
        },
        diagnosticBrain: {
          componentOrSubject: 'Reconstituted Fruit Pulp Beverage (High Glycemic)',
          conditionOrFault: 'High Added Fructose Corn Syrup Ratio (24g per 250ml)',
          citationOrSpec: 'FSSAI Packaging & Labelling Regulations (Nutritional Transparency Standard)',
          safetyWarning: 'DIABETIC ADVISORY: Rapid blood sugar spike profile; prefer cold-pressed whole fruit extraction.',
          imageEditPrompt: 'Overlay price and sugar comparison tags with glowing neon gold stars pointing to recommended brand.'
        }
      },
      {
        id: 'upcycle-diy',
        label: '🎨 DIY Upcycle & Reuse Planter',
        icon: '🎨',
        badge: 'Zero-Waste Maker',
        summary: 'Generates cut-lines and inverted sub-irrigation herb planter guide.',
        spokenResponses: {
          hinglish: 'Is bottle ko fekne ke bajaye ek self-watering mint planter banayein! Dotted cut-line se cut karke inverted funnel lagayein.',
          hi: 'इसे फेंकने के बजाय एक सेल्फ-वॉटरिंग हर्ब प्लांटर बनाएं! इसे बीच से काटकर उलटा रखें।',
          ta: 'இதை வீசுவதற்குப் பதிலாக சுயமாக நீர் பாய்ச்சும் மூலிகை தொட்டியாக மாற்றலாம்!',
          mr: 'ही बाटली फेकून देण्याऐवजी स्वयंचलित पाणी देणारा रोपटा प्लांटर बनवा!',
          en: 'Instead of discarding, upcycle this into a self-watering herb planter! Slice along the neon line and invert the upper funnel.'
        },
        arOverlay: {
          coordinates: { x: 30, y: 40, width: 40, height: 35 },
          calloutText: 'DIY CUT LINE: HERB PLANTER',
          styleType: 'cut-lines',
          stepInstructions: [
            'STEP 1: Score horizontally along the glowing neon dotted line (45% height).',
            'STEP 2: Invert the top neck into the reservoir base as a gravity funnel.',
            'STEP 3: Thread a cotton wick through the pierced cap and pack with potting soil.'
          ]
        },
        agentSkill: {
          skillName: 'UpcycleGuideSkill',
          actionStatus: 'MAKER_BLUEPRINT_SAVED',
          detail: 'Dispatched 3-step DIY sub-irrigation planter CAD vector to maker notes.',
          bigQueryTable: 'kriyaos_circular.upcycle_episodes',
          telemetry: { projectType: 'sub_irrigation_planter', landfillDivertedGrams: 32 }
        },
        diagnosticBrain: {
          componentOrSubject: 'Sub-Irrigation Planter Raw Stock (PET Cylindrical Shell)',
          conditionOrFault: 'High Structural Hoop Strength, Watertight Bottom Hem',
          citationOrSpec: 'Circular Economy Design Guide (Ellen MacArthur Foundation Metric)',
          safetyWarning: 'MAKER SAFETY: Use dull safety shears when trimming trimmed plastic rims to avoid sharp edges.',
          imageEditPrompt: 'Draw horizontal glowing neon-cyan scissors cut line with dotted arrows showing upper funnel inversion.'
        }
      },
      {
        id: 'material-nutrition',
        label: '🔬 Material & Food-Grade Scan',
        icon: '🔬',
        badge: 'Polymer Lab',
        summary: 'Analyzes food contact safety, polymer migration and barrier properties.',
        spokenResponses: {
          hinglish: 'Polymer scan complete: Food-grade virgin PET, BPA free, phthalate free. Gas barrier rating 88%. Safe for cold fluids only.',
          hi: 'सामग्री विश्लेषण: वर्जिन फूड-ग्रेड पीईटी, बीपीए मुक्त, केवल ठंडे तरल पदार्थों के लिए सुरक्षित।',
          ta: 'பொருள் ஸ்கேன்: உணவு தரம், BPA இல்லை, குளிர்ந்த திரவங்களுக்கு மட்டுமே பாதுகாப்பானது.',
          mr: 'साहित्य स्कॅन: फूड-ग्रेड पीईटी, बीपीए मुक्त, फक्त थंड द्रवांसाठी सुरक्षित.',
          en: 'Polymer inspection complete: Virgin food-grade PET, BPA-free, oxygen barrier rating 88%. Safe for cold beverages only.'
        },
        arOverlay: {
          coordinates: { x: 34, y: 48, width: 32, height: 28 },
          calloutText: 'POLYMER SAFETY MATRIX',
          styleType: 'schematic-box',
          stepInstructions: [
            'SPEC 1: Density 1.38 g/cm³ (High tensile strength thermoplastic).',
            'SPEC 2: Glass transition temperature Tg = 67°C (Deforms under hot tap water).',
            'SPEC 3: Food Contact Notification FCN No. 1290 compliant.'
          ]
        },
        agentSkill: {
          skillName: 'MaterialComplianceSkill',
          actionStatus: 'POLYMER_VERIFIED',
          detail: 'Virgin PET spectrum matched with 99.2% spectral confidence; BPA: None.',
          bigQueryTable: 'kriyaos_materials.spectroscopy_logs',
          telemetry: { polymer: 'PET', foodGrade: true, maxTempCelsius: 60, bpaFree: true }
        },
        diagnosticBrain: {
          componentOrSubject: 'Biaxially Oriented Polyethylene Terephthalate (BOPET)',
          conditionOrFault: 'Zero Micro-Crack Stress Crazing, Unpigmented Natural Clarified',
          citationOrSpec: 'US FDA 21 CFR 177.1630 (Polyethylene phthalate polymers in food contact)',
          safetyWarning: 'THERMAL LIMIT: Do not microwave or fill with liquids over 60°C to prevent thermal shrinkage.',
          imageEditPrompt: 'Overlay microscopic polymer chain diagram and FDA Food-Safe compliant seal badge.'
        }
      }
    ]
  },
  {
    id: 'charger-gadget',
    label: '📱 65W GaN Charger & Cable (Consumer Tech)',
    category: 'tech',
    domain: 'Consumer Electronics & Everyday Gadgetry',
    objectName: '65W GaN Fast Charger & Braided Type-C Cable',
    material: 'Flame-Retardant V0 Polycarbonate + Gallium Nitride (GaN) Power IC',
    condition: 'Minor scuffing on folding prongs, Type-C strain-relief bend',
    sampleImage: 'https://images.unsplash.com/photo-1583863788434-e58a36330cf0?auto=format&fit=crop&w=800&q=80',
    proactiveQuestions: {
      hinglish: 'Maine 65W GaN fast charger scan kiya hai! Kya aap iska wattage test karna chahte hain, troubleshoot karna hai, upgrade dekhna hai, ya e-waste recycle karna hai?',
      hi: 'मैंने 65 वाट का GaN फास्ट चार्जर स्कैन किया है! क्या आप इसका परीक्षण करना चाहते हैं या ट्रबलशूट करना चाहते हैं?',
      ta: '65W GaN வேகமான சார்ஜரைக் கண்டறிந்துள்ளேன்! இதன் வாட்டேஜை சோதிக்கவா அல்லது சரிசெய்யவா?',
      mr: 'मी ६५ वॅट GaN फास्ट चार्जर स्कॅन केला आहे! आपल्याला याची वॅटेज तपासायची आहे की दुरुस्त करायची आहे?',
      en: 'I scanned this 65W GaN fast charger and cable! Would you like to troubleshoot pins, verify wattage output, find online upgrades, or schedule e-waste disposal?'
    },
    intents: [
      {
        id: 'gadget-troubleshoot',
        label: '🔧 Troubleshoot & Pin Cleaning',
        icon: '🔧',
        badge: 'Hardware Health',
        summary: 'Detects contact oxidation, lint in Type-C port, and cable resistance.',
        spokenResponses: {
          hinglish: 'Type-C connector pins par lint aur oxidation detect hua hai. Isopropanol swab se clean karein aur cable strain boot check karein.',
          hi: 'यूएसबी-सी पिन पर गंदगी है। आइसोप्रोपिल अल्कोहल से साफ करें।',
          ta: 'USB-C பின்களில் தூசி படிந்துள்ளது. ஐசோபிரைல் ஆல்கஹால் மூலம் சுத்தம் செய்யவும்.',
          mr: 'यूएसबी-सी पिनवर धूळ आहे. अल्कोहोलने स्वच्छ करा.',
          en: 'Oxidation detected on USB-C ground pins. Clean contacts with isopropyl alcohol swab and inspect cable strain relief.'
        },
        arOverlay: {
          coordinates: { x: 38, y: 30, width: 28, height: 35 },
          calloutText: 'USB-C PIN INSPECTION',
          styleType: 'schematic-box',
          stepInstructions: [
            'STEP 1: Disconnect from 230V AC mains before touching metal contacts.',
            'STEP 2: Use wooden toothpick to extract compressed pocket lint from female receptacle.',
            'STEP 3: Check CC1/CC2 configuration pin continuity with digital multimeter.'
          ]
        },
        agentSkill: {
          skillName: 'GadgetTroubleshootSkill',
          actionStatus: 'PIN_HEALTH_LOGGED',
          detail: 'Pin CC1 resistance: 5.1k Ohm OK. VBUS drop nominal at 4.98V.',
          bigQueryTable: 'kriyaos_gadgets.diagnostic_sessions',
          telemetry: { pinContinuityOk: true, resistanceOhms: 5100, vbusVolts: 4.98 }
        },
        diagnosticBrain: {
          componentOrSubject: 'USB-C PD 3.0 Programmable Power Supply (PPS) Receptacle',
          conditionOrFault: 'Contact Impedance Increase (Minor Dust Bridge across CC1/SBU1)',
          citationOrSpec: 'USB Type-C Specification Release 2.2 / USB Power Delivery v3.1',
          safetyWarning: 'ELECTRICAL HAZARD: Never use metal needles or ungrounded paperclips inside charging ports.',
          imageEditPrompt: 'Zoom callout on 24-pin USB-C pin map with glowing yellow crosshair on CC communication lines.'
        }
      },
      {
        id: 'gadget-upgrade',
        label: '🛒 Find Similar / Upgrade to 100W',
        icon: '🛒',
        badge: 'Top Tech Deals',
        summary: 'Compares latest GaN Prime multi-port chargers with laptop capability.',
        spokenResponses: {
          hinglish: 'Maine 3 top rated 100W GaN chargers dhundhe hain jo laptop aur phone dono simultaneously full speed charge kar sakte hain.',
          hi: 'मैंने ३ बेहतरीन १०० वाट चार्जर खोजे हैं जो लैपटॉप और फोन दोनों को एक साथ चार्ज कर सकते हैं।',
          ta: 'ஒரே நேரத்தில் லேப்டாப் மற்றும் போனை சார்ஜ் செய்யக்கூடிய 3 சிறந்த 100W சார்ஜர்களைக் கண்டறிந்துள்ளேன்.',
          mr: 'मी ३ सर्वोत्तम १०० वॅट चार्जर शोधले आहेत जे लॅपटॉप आणि फोन एकाच वेळी चार्ज करू शकतात.',
          en: 'Found 3 top-rated 100W multi-port GaN chargers capable of charging your laptop and phone simultaneously at full speed.'
        },
        arOverlay: {
          coordinates: { x: 34, y: 25, width: 34, height: 48 },
          calloutText: 'RECOMMENDED GAN UPGRADES',
          styleType: 'shopping-matches',
          matchCards: [
            { name: 'Anker 100W GaN III 3-Port Hub', price: '₹3,499', score: '4.8 ★ (12k)', delta: '+54% Wattage' },
            { name: 'CMF by Nothing 65W GaN (Slim)', price: '₹1,999', score: '4.6 ★ (8k)', delta: '-35% Size' },
            { name: 'Stuffcool 100W Centurion GaN', price: '₹2,999', score: '4.5 ★ (4k)', delta: 'Dual Laptop' }
          ],
          stepInstructions: [
            'UPGRADE 1: Anker 100W Multi-device PD 3.0.',
            'UPGRADE 2: CMF ultra-compact pocket GaN.',
            'UPGRADE 3: Stuffcool heavy-duty 4-port power brick.'
          ]
        },
        agentSkill: {
          skillName: 'FindSimilarOnlineSkill',
          actionStatus: 'UPGRADE_CART_READY',
          detail: 'Matched with 3 GaN Tier-1 brands. Best delivery: Next day 9 AM.',
          bigQueryTable: 'kriyaos_commerce.intent_conversions',
          telemetry: { originalWatts: 65, upgradeWatts: 100, ports: 3 }
        },
        diagnosticBrain: {
          componentOrSubject: 'GaN Power Brick Form Factor (Navitas GaNFast IC)',
          conditionOrFault: 'Single-Port Limitation (Desire for Multi-Device Simultaneous Fast Charge)',
          citationOrSpec: 'Energy Star Version 8.0 AC-DC External Power Supplies Standard',
          safetyWarning: 'GENUINE ACCESSORY: Beware of uncertified counterfeit chargers lacking Bureau of Indian Standards (BIS) mark.',
          imageEditPrompt: 'Overlay floating product badges with glowing neon gold stars and Amazon/Flipkart order buttons.'
        }
      },
      {
        id: 'wattage-safety',
        label: '⚡ Wattage & Safety Verification',
        icon: '⚡',
        badge: 'BIS R-8400192',
        summary: 'Verifies USB-PD negotiated profiles (5V/9V/12V/15V/20V) and thermal limits.',
        spokenResponses: {
          hinglish: 'Power Delivery profile: 20V/3.25A max 65W. Surface thermal reading 41°C normal. BIS safety certification verified.',
          hi: 'पावर डिलीवरी प्रोफाइल: 20 वोल्ट / 3.25 एम्पीयर, अधिकतम 65 वाट। तापमान 41 डिग्री सामान्य है।',
          ta: 'பவர் டெலிவரி விவரக்குறிப்பு: 20V / 3.25A அதிகபட்சம் 65W. வெப்பநிலை 41°C இயல்பானது.',
          mr: 'पॉवर डिलिव्हरी तपशील: २०V / ३.२५A कमाल ६५ वॅट. तापमान ४१°C सामान्य आहे.',
          en: 'Power delivery profiles verified: 5V/3A, 9V/3A, 15V/3A, 20V/3.25A (65W max). Operating temperature 41°C is well within IEC limits.'
        },
        arOverlay: {
          coordinates: { x: 30, y: 32, width: 40, height: 38 },
          calloutText: 'USB-PD 3.0 PROFILE RATING',
          styleType: 'schematic-box',
          stepInstructions: [
            'PROFILE 1: 5.0V @ 3.0A (15.0W legacy mobile mode).',
            'PROFILE 2: 9.0V @ 3.0A (27.0W smartphone fast charging).',
            'PROFILE 3: 20.0V @ 3.25A (65.0W laptop ultrabook profile).'
          ]
        },
        agentSkill: {
          skillName: 'ElectricalSafetyScanSkill',
          actionStatus: 'SAFETY_COMPLIANT',
          detail: 'BIS certificate R-8400192 valid. Over-voltage and thermal shutdown verified.',
          bigQueryTable: 'kriyaos_safety.electrical_audits',
          telemetry: { maxWatts: 65, bisCertified: true, tempCelsius: 41.2, overVoltageProtected: true }
        },
        diagnosticBrain: {
          componentOrSubject: 'Switched Mode Power Supply Isolation Transformer & GaN Switch',
          conditionOrFault: 'Normal Operating Thermal Envelope (41.2°C at 65W Continuous Load)',
          citationOrSpec: 'IEC 62368-1 Audio/video, information and communication technology equipment safety',
          safetyWarning: 'THERMAL NOTICE: Ensure adequate room ventilation; do not cover charging bricks with pillows or blankets.',
          imageEditPrompt: 'Overlay thermal heat map gradient from blue (ambient) to soft amber (GaN IC center).'
        }
      },
      {
        id: 'ewaste-recycle',
        label: '♻️ E-Waste Authorized Disposal',
        icon: '♻️',
        badge: 'CPCB Certified',
        summary: 'Routes rare-earth materials and copper wiring to certified recyclers.',
        spokenResponses: {
          hinglish: 'Agar yeh adapter dead ho chuka hai, toh normal kachre mein mat daalein. Maine nearest CPCB certified e-waste drop point identify kar diya hai.',
          hi: 'यदि यह खराब हो गया है, तो इसे सामान्य कचरे में न फेंकें। नजदीकी ई-कचरा केंद्र पर जमा करें।',
          ta: 'இது பழுதாகியிருந்தால், சாதாரண குப்பையில் போடாதீர்கள். அருகிலுள்ள மின்-கழிவு மையத்தில் ஒப்படைக்கவும்.',
          mr: 'हे निकामी झाले असल्यास कचऱ्यात टाकू नका. जवळच्या ई-कचरा केंद्रात जमा करा.',
          en: 'If this adapter has reached end of life, do not discard in municipal trash. I mapped the nearest authorized e-waste collection kiosk.'
        },
        arOverlay: {
          coordinates: { x: 26, y: 28, width: 48, height: 45 },
          calloutText: 'E-WASTE MATERIAL EXTRACTION',
          styleType: 'recycle-zones',
          stepInstructions: [
            'MATERIAL 1: 28g pure electrolytic copper wiring inside cable core.',
            'MATERIAL 2: High-grade GaN and silicon semiconductors for precious metal recovery.',
            'MATERIAL 3: Drop off at authorized CPCB collection center #KA-BLR-09.'
          ]
        },
        agentSkill: {
          skillName: 'EWasteRecycleSkill',
          actionStatus: 'PICKUP_SLOT_GENERATED',
          detail: 'E-waste recycling manifest #EW-2026-8912 created with certified recovery agency.',
          bigQueryTable: 'kriyaos_eco.ewaste_dispatches',
          telemetry: { copperGrams: 28, hazardousPolymerContained: true, recyclerId: 'CPCB-KA-09' }
        },
        diagnosticBrain: {
          componentOrSubject: 'End-of-Life Electronic Assembly (PCBA + Magnetics)',
          conditionOrFault: 'High Recyclable Value Material Composition (Copper, Tin, Gold-flashed pins)',
          citationOrSpec: 'E-Waste (Management) Rules, 2022 (Ministry of Environment, Forest and Climate Change)',
          safetyWarning: 'DISMANTLE WARNING: Do not smash plastic casing open with hammer; primary electrolytic capacitor may retain charge.',
          imageEditPrompt: 'Overlay green circular arrows showing recycling recovery breakdown of copper, plastic, and ICs.'
        }
      }
    ]
  },
  {
    id: 'solar-inverter',
    label: '☀️ Solar Inverter 10kW (Delta SunGrow)',
    category: 'industrial',
    domain: 'Utility Solar Photovoltaic & High-Voltage Power Systems',
    objectName: 'Solar Grid-Tie Inverter 10kW (Delta SunGrow SG10K)',
    material: 'Anodized Aluminum Chassis + High-Voltage DC Busbar + PCB',
    condition: 'Fault Code E-04 blinking, DC disconnect engaged',
    sampleImage: 'https://images.unsplash.com/photo-1509391365360-2e959784a276?auto=format&fit=crop&w=800&q=80',
    proactiveQuestions: {
      hinglish: 'Maine Delta SunGrow 10kW Solar Inverter scan kiya hai! Iska Fault Code E-04 active hai. Kya aap relay diagnose karna chahte hain, manual page 47 dekhna hai, ya spare part reorder karna hai?',
      hi: 'मैंने 10kW सोलर इन्वर्टर स्कैन किया है! फॉल्ट E-04 सक्रिय है। क्या आप रिले की जांच करना चाहते हैं?',
      ta: '10kW சோலார் இன்வெர்ட்டரை ஸ்கேன் செய்துள்ளேன்! E-04 பிழை உள்ளது. ரிலேவை சரிபார்க்கவா?',
      mr: 'मी १०kW सोलर इन्व्हर्टर स्कॅन केला आहे! एरर E-04 सक्रिय आहे. रिले तपासायचा आहे का?',
      en: 'I identified this 10kW Delta SunGrow solar inverter with Fault Code E-04! Would you like to diagnose Relay K1, view Manual Page 47, reorder the spare part, or stream robotics data?'
    },
    intents: [
      {
        id: 'industrial-repair',
        label: '🔧 Diagnose & Repair Relay K1',
        icon: '🔧',
        badge: 'High-Voltage LOTO',
        summary: 'Pinpoints contact carbon buildup and guides 24V DC contactor swap.',
        spokenResponses: {
          hinglish: 'Relay K1 ke terminals par thermal overstress hai. Pehle DC isolator switch band karke DMM se 0V confirm karein, phir Omron G2R replace karein.',
          hi: 'रिले K1 पर कार्बन जमा है। पहले डीसी स्विच बंद करें और शून्य वोल्टेज की पुष्टि करें।',
          ta: 'ரிலே K1-ல் அதிக அழுத்தம் ஏற்பட்டுள்ளது. முதலில் DC ஸ்விட்சை அணைத்து சரிபார்க்கவும்.',
          mr: 'रिले K1 वर जास्त ताण आला आहे. प्रथम डीसी स्वीच बंद करा.',
          en: 'Relay K1 suffers from thermal overstress and contact degradation. Lockout/Tagout the DC switch and verify 0.0V DC before swapping.'
        },
        arOverlay: {
          coordinates: { x: 35, y: 28, width: 28, height: 32 },
          calloutText: 'TARGET: RELAY K1 (OMRON G2R)',
          styleType: 'schematic-box',
          stepInstructions: [
            'STEP 1: Lockout/Tagout (LOTO) DC Disconnect switch on inverter underside.',
            'STEP 2: Probe K1 relay coil voltage using DMM (Verify < 0.5V DC residual).',
            'STEP 3: Release spring retention clip and swap with spare Omron G2R-24VDC.'
          ]
        },
        agentSkill: {
          skillName: 'IndustrialErpSkill',
          actionStatus: 'PARTS_DEDUCTED',
          detail: 'Deducted 1x Omron G2R-24VDC from Mobile Van KA-05; WO #8491 closed.',
          bigQueryTable: 'kriyaos_embodied_ai.repair_trajectories',
          telemetry: { faultCode: 'E-04', componentId: 'RELAY-OMRON-G2R-24VDC', lotoVerified: true }
        },
        diagnosticBrain: {
          componentOrSubject: 'Main DC Contactor / Relay K1 [Omron G2R-24VDC]',
          conditionOrFault: 'Thermal Overstress & High Contact Resistance (Fault Code: E-04 DC Overcurrent)',
          citationOrSpec: 'SunGrow-SG10K-Manual.pdf — Page 47, Section 4.3 (DC Bus Bar Isolation Schematics)',
          safetyWarning: 'HIGH VOLTAGE 600V DC RISK: Confirm 0.00V DC with calibrated DMM across terminals before tool engagement. Discharge time 5 minutes.',
          imageEditPrompt: 'Draw glowing neon-green bounding box at [35%, 28%, 28%, 32%], add glowing red directional arrow pointing to Relay K1 terminal.'
        }
      },
      {
        id: 'view-manual-page',
        label: '📖 View Manual Page 47 Schematics',
        icon: '📖',
        badge: '1M+ Context Cached',
        summary: 'Directly displays grounded schematic schematics from the 1,240-page manual.',
        spokenResponses: {
          hinglish: 'SunGrow SG10K official manual ke Section 4.3 page 47 par DC busbar isolation aur contactor pinouts verified hain.',
          hi: 'सनग्रो आधिकारिक मैनुअल के पेज ४७ पर डीसी बसबार की वायरिंग दी गई है।',
          ta: 'அதிகாரப்பூர்வ கையேட்டின் பக்கம் 47-ல் வயரிங் வரைபடம் சரிபார்க்கப்பட்டது.',
          mr: 'अधिकृत मॅन्युअलच्या पान ४७ वर वायरिंग आकृती दिली आहे.',
          en: 'Grounded against official SunGrow SG10K Manual Page 47, Section 4.3. Verified DC contactor pinouts and tolerance ratings.'
        },
        arOverlay: {
          coordinates: { x: 30, y: 22, width: 38, height: 42 },
          calloutText: 'OEM SCHEMATIC PAGE 47',
          styleType: 'schematic-box',
          stepInstructions: [
            'DIAGRAM: Terminal Pin 1 (Coil +24V) to Pin 4 (Ground Return).',
            'TOLERANCE: Max switching current 16A @ 600V DC resistive.',
            'TORQUE: M4 terminal screw torque 1.8 N·m ± 0.2 N·m.'
          ]
        },
        agentSkill: {
          skillName: 'ManualGroundingSkill',
          actionStatus: 'CITATION_VERIFIED',
          detail: '100% manual grounded without hallucination. Grounding hash: 0x4f19ae.',
          bigQueryTable: 'kriyaos_compliance.manual_citations',
          telemetry: { manualId: 'SunGrow-SG10K-Manual.pdf', page: 47, section: '4.3' }
        },
        diagnosticBrain: {
          componentOrSubject: 'Section 4.3 DC Disconnect & Galvanic Isolation Circuit',
          conditionOrFault: 'Grounded Reference Documentation (Delta SunGrow Electrical Service Manual)',
          citationOrSpec: 'SunGrow-SG10K-Manual.pdf — Page 47, Section 4.3',
          safetyWarning: 'AUTHORITATIVE: Follow official torque specifications (1.8 N·m) to prevent terminal fire hazards.',
          imageEditPrompt: 'Overlay wiring schematic diagram and circuit symbol for single-pole double-throw contactor.'
        }
      },
      {
        id: 'reorder-spare-part',
        label: '📦 Reorder Spare Relay (Van Stock)',
        icon: '📦',
        badge: 'SAP / Tally ERP',
        summary: 'Checks warehouse stock (13 units left) and automates purchase requisition.',
        spokenResponses: {
          hinglish: 'Omron G2R relay Mobile Van KA-05 mein available hai. Central inventory se naya purchase order initiate ho chuka hai.',
          hi: 'नया रिले वैन में उपलब्ध है और गोदाम से ऑर्डर कर दिया गया है।',
          ta: 'புதிய ரிலே வண்டியில் உள்ளது. புதிய கொள்முதல் ஆர்டர் தொடங்கப்பட்டது.',
          mr: 'नवीन रिले व्हॅनमध्ये उपलब्ध आहे आणि गोदामातून ऑर्डर केले आहे.',
          en: 'Omron G2R-24VDC available in mobile van inventory (13 units). Automatic purchase requisition PO-2026-9812 logged in ERP.'
        },
        arOverlay: {
          coordinates: { x: 35, y: 30, width: 30, height: 30 },
          calloutText: 'PART: OMRON G2R-24VDC',
          styleType: 'shopping-matches',
          matchCards: [
            { name: 'Omron G2R-24VDC (OEM Spec)', price: '₹340', score: 'In Van KA-05', delta: '13 in Stock' },
            { name: 'Finder 40.52 24VDC (Alt)', price: '₹390', score: 'Warehouse BLR', delta: '42 in Stock' }
          ],
          stepInstructions: [
            'STOCK: 1x Omron G2R-24VDC pulled from mobile storage shelf B3.',
            'PO TRIGGER: Automatic ERP replenishment dispatched to Omron India.',
            'COMPLIANCE: Digital gate sign-off attached to dispatch ticket.'
          ]
        },
        agentSkill: {
          skillName: 'IndustrialErpSkill',
          actionStatus: 'INVENTORY_REORDER_TRIGGERED',
          detail: 'Auto-PO #9812 dispatched to Omron Electronics; 13 units remaining.',
          bigQueryTable: 'kriyaos_erp.inventory_movements',
          telemetry: { partNumber: 'RELAY-OMRON-G2R-24VDC', remainingStock: 13, reorderTriggered: true }
        },
        diagnosticBrain: {
          componentOrSubject: 'Industrial Electromechanical Relay (PCB Mounting, Sealed Type)',
          conditionOrFault: 'Warehouse Stock Level Monitored (Threshold: 5 units)',
          citationOrSpec: 'Enterprise Spare Parts Catalog Item ID: #RELAY-OMRON-G2R-24VDC',
          safetyWarning: 'PART VERIFICATION: Ensure contact material is Ag-Alloy with gold plating for DC solar circuits.',
          imageEditPrompt: 'Overlay glowing gold checkmark badge indicating verified spare component in van stock.'
        }
      },
      {
        id: 'bigquery-robotics-stream',
        label: '🤖 Stream Robotics Episode to BigQuery',
        icon: '🤖',
        badge: 'Embodied AI Moat',
        summary: 'Archives multimodal repair trajectory for humanoid robot pre-training.',
        spokenResponses: {
          hinglish: 'Multimodal repair trajectory Google BigQuery dataset mein stream ho gaya hai humanoid robotics training ke liye!',
          hi: 'मरम्मत का डेटा रोबोटिक्स प्रशिक्षण के लिए गूगल बिगक्वेरी में सुरक्षित हो गया है!',
          ta: 'பழுதுபார்ப்பு தரவு கூகுள் பிக்-குவெரிக்கு வெற்றிகரமாக அனுப்பப்பட்டது!',
          mr: 'दुरुस्तीचा डेटा रोबोटिक्स प्रशिक्षणासाठी गुगल बिगक्वेरीमध्ये पाठवला आहे!',
          en: 'Full multimodal repair trajectory streamed into Google BigQuery kriyaos_embodied_ai dataset to train future humanoid robots.'
        },
        arOverlay: {
          coordinates: { x: 25, y: 20, width: 50, height: 60 },
          calloutText: 'EMBODIED AI TRAJECTORY LOGGED',
          styleType: 'schematic-box',
          stepInstructions: [
            'DATA TUPLE: ⟨Before Frame, Audio Wave, Gemini Trace, Tool Motion, After Frame⟩.',
            'PARTITION: kriyaos_embodied_ai.repair_trajectories (Dataset v2.4).',
            'PRIVACY: Automatic PII scrubbing complete (Worker face/badge redacted).'
          ]
        },
        agentSkill: {
          skillName: 'BigQueryRoboticsLoggerSkill',
          actionStatus: 'BIGQUERY_STREAMED',
          detail: 'Streamed episode bq_traj_solar_20261112 to BigQuery Embodied AI warehouse.',
          bigQueryTable: 'kriyaos_embodied_ai.repair_trajectories',
          telemetry: { episodeId: 'bq_traj_solar_20261112', tokensCached: 1240000, datasetVersion: 'v2.4' }
        },
        diagnosticBrain: {
          componentOrSubject: 'Physical-World Embodied AI Repair Trajectory Episode',
          conditionOrFault: 'High-Fidelity Human Demonstration Record (Expert Inverter Relay Replacement)',
          citationOrSpec: 'Google DeepMind Robotics Physical Trajectory Data Standard (RT-2/RT-X format)',
          safetyWarning: 'ANONYMIZED: All human worker facial features and site identifiers are scrubbed before storage.',
          imageEditPrompt: 'Overlay BigQuery streaming data flow telemetry nodes and neural network tensor matrix.'
        }
      }
    ]
  },
  {
    id: 'router-pcb',
    label: '⚡ Cisco Industrial Gigabit Router PCB',
    category: 'industrial',
    domain: 'Industrial Networking & High-Reliability Telecom Infrastructure',
    objectName: 'Cisco IR1101 Ruggedized Router Mainboard PCB',
    material: 'FR4 Multi-layer PCB + SMD Decoupling Capacitors + Voltage Regulators',
    condition: 'Power LED flashing amber, Port 1 PHY link inactive',
    sampleImage: 'https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=800&q=80',
    proactiveQuestions: {
      hinglish: 'Maine Cisco Industrial Gigabit Router PCB identify kiya hai! Port 1 unresponsive hai. Kya aap capacitor C142 troubleshoot karna chahte hain, PCB schematic dekhna hai, ya ESD safety check karna hai?',
      hi: 'मैंने सिस्को इंडस्ट्रियल राउटर पीसीबी को पहचाना है! क्या आप कैपेसिटर की जांच करना चाहते हैं?',
      ta: 'சிஸ்கோ இண்டஸ்ட்ரியல் ரவுட்டர் பிசிபி கண்டறியப்பட்டது! கெபாசிட்டரை சரிபார்க்கவா?',
      mr: 'मी सिस्को इंडस्ट्रियल राउटर पीसीबी ओळखला आहे! कॅपेसिटर तपासू इच्छिता?',
      en: 'I recognized this Cisco Industrial Gigabit Router PCB with amber flashing LED! Would you like to test capacitor ESR, inspect the PCB layout, or check ESD safety?'
    },
    intents: [
      {
        id: 'repair-capacitor',
        label: '🔧 Test ESR Capacitor C142',
        icon: '🔧',
        badge: 'SMD Rework',
        summary: 'Detects high Equivalent Series Resistance (ESR) and guides 350°C hot-air swap.',
        spokenResponses: {
          hinglish: 'Capacitor C142 par excessive ESR failure hai. ESD strap pehankar 350 degree hot air se desolder karein.',
          hi: 'कैपेसिटर C142 खराब है। ईएसडी स्ट्रैप पहनकर इसे बदलें।',
          ta: 'கெபாசிட்டர் C142 பழுதடைந்துள்ளது. ESD ஸ்ட்ராப் அணிந்து மாற்றவும்.',
          mr: 'कॅपेसिटर C142 खराब आहे. काळजीपूर्वक बदला.',
          en: 'Capacitor C142 exhibits abnormal ESR and ripple voltage. Don grounded ESD wristband and desolder with 350°C hot air.'
        },
        arOverlay: {
          coordinates: { x: 42, y: 35, width: 22, height: 26 },
          calloutText: 'TARGET: CAPACITOR C142',
          styleType: 'schematic-box',
          stepInstructions: [
            'STEP 1: Attach ESD grounding clip to technician wrist before PCB contact.',
            'STEP 2: Measure in-circuit ESR across C142 pads with precision LCR meter.',
            'STEP 3: Desolder with 350°C hot-air rework nozzle and seat 470uF low-ESR unit.'
          ]
        },
        agentSkill: {
          skillName: 'IndustrialErpSkill',
          actionStatus: 'SMD_PART_CONSUMED',
          detail: 'Deducted 1x Cap 470uF 35V Low-ESR from Central Stock; WO #8492 updated.',
          bigQueryTable: 'kriyaos_embodied_ai.repair_trajectories',
          telemetry: { partId: 'CAP-SMD-470UF-35V-LOWESR', esrOhms: 4.8, nominalEsr: 0.12 }
        },
        diagnosticBrain: {
          componentOrSubject: 'Switching Voltage Regulator Cap C142 (Solid Aluminum Electrolytic)',
          conditionOrFault: 'High Equivalent Series Resistance (ESR) Failure & Ripple Voltage Leakage',
          citationOrSpec: 'Cisco-IR1101-Hardware-Guide.pdf — Page 82, Section 7.2 (Power Subsystem PCB Layout)',
          safetyWarning: 'ESD ALERT: Wear grounded antistatic wrist strap before touching SMD decoupling array.',
          imageEditPrompt: 'Draw glowing neon-cyan bounding box around Cap C142, draw pulse arrow to pin 2 ground.'
        }
      },
      {
        id: 'cisco-layout',
        label: '📖 View PCB Power Delivery Layout',
        icon: '📖',
        badge: 'Cisco Schematics',
        summary: 'Displays layered copper layout and regulator power plane pinouts.',
        spokenResponses: {
          hinglish: 'Cisco IR1101 hardware guide ke Section 7.2 page 82 par 12V to 3.3V power rails verified hain.',
          hi: 'सिस्को हार्डवेयर गाइड के पेज ८२ पर पावर रेल का विवरण दिया गया है।',
          ta: 'சிஸ்கோ கையேட்டின் பக்கம் 82-ல் பவர் ரேல் வரைபடம் உள்ளது.',
          mr: 'सिस्को मॅन्युअलच्या पान ८२ वर पॉवर रेल तपशील आहे.',
          en: 'Grounded against Cisco IR1101 Hardware Guide Page 82, Section 7.2. Verified 12V to 3.3V step-down power rails.'
        },
        arOverlay: {
          coordinates: { x: 38, y: 28, width: 30, height: 35 },
          calloutText: 'CISCO PCB POWER SUB-SYSTEM',
          styleType: 'schematic-box',
          stepInstructions: [
            'RAIL 1: Main DC Input Bus (+12V to +48V wide-range terminal).',
            'RAIL 2: Buck Converter Output (+3.3V Core Logic).',
            'RAIL 3: Low-Dropout (LDO) Auxiliary (+1.8V PHY Interface).'
          ]
        },
        agentSkill: {
          skillName: 'ManualGroundingSkill',
          actionStatus: 'SCHEMATIC_LOADED',
          detail: 'Retrieved Section 7.2 power subsystem architecture from Cisco IR1101 repository.',
          bigQueryTable: 'kriyaos_compliance.manual_citations',
          telemetry: { manualId: 'Cisco-IR1101-Hardware-Guide.pdf', page: 82, section: '7.2' }
        },
        diagnosticBrain: {
          componentOrSubject: 'Multi-Phase Buck Regulator & Inductor Filtering Array',
          conditionOrFault: 'Grounded Reference Layout (Cisco Industrial Modular Router Architecture)',
          citationOrSpec: 'Cisco-IR1101-Hardware-Guide.pdf — Page 82, Section 7.2',
          safetyWarning: 'CAPACITIVE CHARGE: Disconnect upstream DC supply and wait 60 seconds for buck filter drain.',
          imageEditPrompt: 'Overlay copper trace routing highlights showing 12V bus rail flowing to inductor L14.'
        }
      },
      {
        id: 'cisco-esd',
        label: '⚡ ESD Grounding Compliance Check',
        icon: '⚡',
        badge: 'ANSI/ESD S20.20',
        summary: 'Verifies antistatic wristband resistance (<1.0 Megaohm) and mat ground.',
        spokenResponses: {
          hinglish: 'ESD safety verification complete: Wristband resistance 0.85 Megaohm verified within ANSI standard.',
          hi: 'ईएसडी सुरक्षा जांच पूरी हुई: कलाई का बैंड मानकों के अनुसार सुरक्षित है।',
          ta: 'ESD பாதுகாப்பு சோதனை முடிந்தது: மணிக்கட்டு பட்டை பாதுகாப்பாக உள்ளது.',
          mr: 'ईएसडी सुरक्षा तपासणी पूर्ण झाली.',
          en: 'Electrostatic discharge verification complete: Wrist strap path resistance 0.85 MΩ is within ANSI/ESD S20.20 specs.'
        },
        arOverlay: {
          coordinates: { x: 20, y: 15, width: 60, height: 70 },
          calloutText: 'ESD PROTECTED WORK AREA (EPA)',
          styleType: 'hazard-perimeter',
          stepInstructions: [
            'RULE 1: Verify wrist strap cuff fit snugly against bare skin.',
            'RULE 2: Common point ground cord fastened to bench ground terminal.',
            'RULE 3: Do not bring unshielded charge-generating plastics within 30cm of PCB.'
          ]
        },
        agentSkill: {
          skillName: 'EsdComplianceSkill',
          actionStatus: 'ESD_PASS',
          detail: 'Wristband resistance 0.85 MΩ verified compliant with ANSI/ESD S20.20.',
          bigQueryTable: 'kriyaos_safety.esd_audits',
          telemetry: { wristbandResistanceMOhms: 0.85, isCompliant: true }
        },
        diagnosticBrain: {
          componentOrSubject: 'Electrostatic Discharge Protective Workstation (EPA)',
          conditionOrFault: 'Sub-100V Threshold Static Sensitive Semiconductors (PHY Transceivers)',
          citationOrSpec: 'ANSI/ESD S20.20-2021 Protection of Electrical and Electronic Parts',
          safetyWarning: 'ESD ALERT: A single 200V human body static spark will permanently puncture CMOS gate oxide.',
          imageEditPrompt: 'Overlay green protective shield perimeter boundary indicating active grounded safe zone.'
        }
      },
      {
        id: 'cisco-reorder',
        label: '📦 Reorder Low-ESR Capacitor Kit',
        icon: '📦',
        badge: 'Auto-PO Requisition',
        summary: 'Stock fell to 4 units; auto purchase order PO-2026-8814 issued to supplier.',
        spokenResponses: {
          hinglish: 'Capacitor stock threshold breach hua! Purchase order PO-2026-8814 automatic vendor ko email ho chuka hai.',
          hi: 'कैपेसिटर का स्टॉक कम है। नया परचेज ऑर्डर जारी कर दिया गया है।',
          ta: 'கெபாசிட்டர் இருப்பு குறைவாக உள்ளது. தானியங்கி கொள்முதல் ஆணை அனுப்பப்பட்டது.',
          mr: 'साठा कमी झाला आहे. नवीन खरेदी ऑर्डर दिली गेली आहे.',
          en: 'Low-ESR capacitor stock fell below threshold (4 units remaining). Automatic PO-2026-8814 dispatched to distributor.'
        },
        arOverlay: {
          coordinates: { x: 42, y: 35, width: 22, height: 26 },
          calloutText: 'AUTO-PO: CAP-SMD-470UF',
          styleType: 'shopping-matches',
          matchCards: [
            { name: 'Panasonic OS-CON 470uF 35V Low-ESR', price: '₹45', score: 'Distributor Stock', delta: 'PO Issued' }
          ],
          stepInstructions: [
            'STOCK: 4 units remaining in Bangalore central electronic vault.',
            'REORDER: Minimum batch order of 100 units queued with distributor.',
            'LEAD TIME: Estimated delivery 48 hours to regional engineering lab.'
          ]
        },
        agentSkill: {
          skillName: 'IndustrialErpSkill',
          actionStatus: 'AUTO_PO_ISSUED',
          detail: 'Purchase Order #PO-8814 issued to authorized electronic distributor.',
          bigQueryTable: 'kriyaos_erp.inventory_movements',
          telemetry: { partNumber: 'CAP-SMD-470UF-35V-LOWESR', remainingStock: 4, reorderTriggered: true }
        },
        diagnosticBrain: {
          componentOrSubject: 'Surface Mount Conductive Polymer Aluminum Solid Capacitor',
          conditionOrFault: 'Inventory Reorder Threshold Reached (Safety Buffer: 5 units)',
          citationOrSpec: 'Enterprise Bill of Materials (BOM) Item #CAP-SMD-470UF-35V',
          safetyWarning: 'REPLACEMENT NOTICE: Must use ultra-low ESR (<20 mOhm) series to avoid voltage regulator ripple.',
          imageEditPrompt: 'Overlay glowing golden procurement badge and purchase order tracking ticket.'
        }
      }
    ]
  },
  {
    id: 'plc-module',
    label: '🏭 Siemens S7-1200 PLC Power Supply',
    category: 'industrial',
    domain: 'Factory Automation & Industrial Programmable Logic Controllers',
    objectName: 'Siemens S7-1200 CPU 1214C DC/DC/DC Power Rail',
    material: 'DIN-Rail Mount Polycarbonate Housing + Flyback Transformer + MOV Varistor',
    condition: 'SF system fault LED lit, 24V bus dropped to 14V under load',
    sampleImage: 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=800&q=80',
    proactiveQuestions: {
      hinglish: 'Maine Siemens S7-1200 PLC Power Supply detect kiya hai! 24V bus voltage drop ho gaya hai. Kya aap MOV varistor clamp test karna chahte hain, AC breaker isolation check karna hai, ya compliance sign karna hai?',
      hi: 'मैंने सीमेंस S7-1200 पीएलसी पावर सप्लाई स्कैन की है! क्या आप वारीस्टर की जांच करना चाहते हैं?',
      ta: 'சீமென்ஸ் S7-1200 பிஎல்சி பவர் சப்ளை கண்டறியப்பட்டது! வேரிஸ்டரை சோதிக்கவா?',
      mr: 'मी सीमेन्स S7-1200 पीएलसी पॉवर सप्लाय स्कॅन केला आहे! व्हेरिस्टर तपासायचे आहे का?',
      en: 'I recognized this Siemens S7-1200 PLC power supply with low 24V bus voltage! Would you like to clamp test the MOV varistor, verify 230V AC isolation, or sign the compliance audit?'
    },
    intents: [
      {
        id: 'plc-varistor',
        label: '🔧 Clamp Test MOV Varistor V275',
        icon: '🔧',
        badge: 'Surge Protection',
        summary: 'Diagnoses degraded voltage surge clamping and instructs replacement.',
        spokenResponses: {
          hinglish: 'MOV varistor V275 transient surge ke baad degrade ho chuka hai. Upstream 230V breaker band karke naya MOV install karein.',
          hi: 'वेरिस्टर V275 खराब हो गया है। ब्रेकर बंद करके नया लगाएं।',
          ta: 'வேரிஸ்டர் V275 பழுதடைந்துள்ளது. புதிய வேரிஸ்டரை மாற்றவும்.',
          mr: 'व्हेरिस्टर V275 खराब झाला आहे. नवीन बसवा.',
          en: 'MOV varistor V275 degraded following voltage transient. De-energize upstream 230V AC breaker and seat replacement surge module.'
        },
        arOverlay: {
          coordinates: { x: 48, y: 22, width: 24, height: 30 },
          calloutText: 'TARGET: VARISTOR V275',
          styleType: 'schematic-box',
          stepInstructions: [
            'STEP 1: De-energize 230V AC incoming terminal block TB1.',
            'STEP 2: Test resistance across MOV V275 (Expect open circuit > 10M Ohm).',
            'STEP 3: Replace damaged varistor with V275LA40CP surge module.'
          ]
        },
        agentSkill: {
          skillName: 'IndustrialErpSkill',
          actionStatus: 'PARTS_DEDUCTED',
          detail: 'Deducted 1x MOV V275LA40CP from Bangalore Hub; WO #8493 closed.',
          bigQueryTable: 'kriyaos_embodied_ai.repair_trajectories',
          telemetry: { partId: 'VARISTOR-MOV-V275LA40CP', leakageCurrentUa: 420, thresholdUa: 10 }
        },
        diagnosticBrain: {
          componentOrSubject: 'Flyback Converter Secondary MOV Varistor [V275LA40CP]',
          conditionOrFault: 'Transient Voltage Surge Clamping Degradation & Intermittent Ground Shunt',
          citationOrSpec: 'Siemens-S7-1200-System-Manual.pdf — Page 119, Section 9.4 (Power Rail Troubleshooting)',
          safetyWarning: '230V AC MAINS HAZARD: Turn off upstream circuit breaker before opening front DIN-rail flap.',
          imageEditPrompt: 'Draw glowing neon-orange bounding box around MOV Varistor V275, draw warning chevron.'
        }
      },
      {
        id: 'plc-breaker',
        label: '⚡ 230V AC Isolation Safety Gate',
        icon: '⚡',
        badge: 'Life-Safety Gate',
        summary: 'Deterministic fail-closed check verifying 0.0V AC prior to housing access.',
        spokenResponses: {
          hinglish: 'Mandatory Safety Gate: Upstream 230V AC circuit breaker switch off karke terminal TB1 par voltage zero test karein.',
          hi: 'अनिवार्य सुरक्षा द्वार: अपस्ट्रीम 230V एसी ब्रेकर बंद करें और शून्य वोल्टेज सत्यापित करें।',
          ta: 'கட்டாய பாதுகாப்பு சோதனை: 230V ஏசி மின்சாரத்தை அணைத்து பூஜ்ஜிய வோல்ட்டேஜை உறுதிப்படுத்தவும்.',
          mr: 'अनिवार्य सुरक्षा तपासणी: ब्रेकर बंद करा आणि व्होल्टेज शून्य असल्याची खात्री करा.',
          en: 'Mandatory Life-Safety Gate: Lockout upstream 230V AC circuit breaker and probe TB1 for 0.0V AC before opening enclosure.'
        },
        arOverlay: {
          coordinates: { x: 40, y: 15, width: 35, height: 40 },
          calloutText: '230V AC ISOLATION GATE',
          styleType: 'hazard-perimeter',
          stepInstructions: [
            'GATE 1: Switch Off Circuit Breaker Q1 in Main Distribution Board.',
            'GATE 2: Attach Lockout Hasps & Warning Tag "DO NOT OPERATE".',
            'GATE 3: Test-Before-Touch with Cat III 600V Rated Voltage Detector.'
          ]
        },
        agentSkill: {
          skillName: 'DeterministicSafetyGateSkill',
          actionStatus: 'ISOLATION_VERIFIED',
          detail: 'Verified 0.00V AC isolation test on terminal TB1. Work permit #WP-401 issued.',
          bigQueryTable: 'kriyaos_safety.isolation_permits',
          telemetry: { voltageResidualVolts: 0.0, permitId: 'WP-401', lotoAffixed: true }
        },
        diagnosticBrain: {
          componentOrSubject: 'Terminal Block TB1 230V AC Incoming Supply Isolation Barrier',
          conditionOrFault: 'Authoritative Deterministic Safety Interlock (Fail-Closed Gate)',
          citationOrSpec: 'OSHA 1910.147 Control of Hazardous Energy (Lockout/Tagout Standard)',
          safetyWarning: 'CRITICAL LIFE SAFETY: Camera AI cannot verify de-energized state. Physical meter test is mandatory.',
          imageEditPrompt: 'Draw glowing red warning box with crossbones and Lockout/Tagout padlock graphic.'
        }
      },
      {
        id: 'plc-compliance',
        label: '📑 Sign SHA-256 Compliance Audit',
        icon: '📑',
        badge: 'Digital Audit Trail',
        summary: 'Cryptographically seals before/after photos and technician credentials.',
        spokenResponses: {
          hinglish: 'Digital compliance signature generate ho chuki hai. SHA-256 cryptographic proof factory ledger mein record ho gaya hai.',
          hi: 'डिजिटल अनुपालन हस्ताक्षर उत्पन्न हो गया है और लेजर में सुरक्षित है।',
          ta: 'டிஜிட்டல் கையொப்பம் சரிபார்க்கப்பட்டு தொழிற்சாலை பதிவேட்டில் பதிவு செய்யப்பட்டது.',
          mr: 'डिजिटल स्वाक्षरी सुरक्षितपणे नोंदवली गेली आहे.',
          en: 'Digital compliance signature generated. SHA-256 cryptographic hash recorded in factory audit ledger.'
        },
        arOverlay: {
          coordinates: { x: 30, y: 30, width: 40, height: 40 },
          calloutText: 'SHA-256 COMPLIANCE VERIFIED',
          styleType: 'schematic-box',
          stepInstructions: [
            'HASH: 0x99fa1b43cc2088ef4a1d95c7210e7b8a1c9201f83c1.',
            'TIMESTAMP: ISO-8601 UTC Synchronized with NTP Atomic Clock.',
            'SIGNER: Lead Automation Technician KA-BLR-04.'
          ]
        },
        agentSkill: {
          skillName: 'VisualComplianceSkill',
          actionStatus: 'CRYPTOGRAPHIC_AUDIT_SEALED',
          detail: 'Generated SHA-256 hash: 0x99fa1b43cc2088ef4a1d95c7210e7b8a.',
          bigQueryTable: 'kriyaos_compliance.audit_hashes',
          telemetry: { hash: '0x99fa1b43cc2088ef4a1d95c7210e', algorithm: 'SHA-256', signed: true }
        },
        diagnosticBrain: {
          componentOrSubject: 'Plant Asset S7-1200 Digital Maintenance Certificate',
          conditionOrFault: 'Legally Defensible Proof of Workmanship & Visual Adherence',
          citationOrSpec: 'ISO 55001 Asset Management — System Compliance Specification',
          safetyWarning: 'AUDIT REQUIREMENT: Retain digital signed receipt for minimum 7-year statutory inspection review.',
          imageEditPrompt: 'Overlay holographic digital tamper-proof seal and QR code verification stamp.'
        }
      },
      {
        id: 'plc-bigquery',
        label: '🤖 BigQuery Trajectory Log',
        icon: '🤖',
        badge: 'Robotics Dataset',
        summary: 'Streams PLC flyback repair episode into humanoid robotics dataset.',
        spokenResponses: {
          hinglish: 'Siemens PLC power rail repair episode BigQuery robotics repository mein upload ho gaya hai!',
          hi: 'सीमेंस पीएलसी मरम्मत डेटा रोबोटिक्स प्रशिक्षण के लिए सफलतापूर्वक सहेज लिया गया है।',
          ta: 'சீமென்ஸ் பிஎல்சி பழுதுபார்ப்பு தரவு வெற்றிகரமாக பதிவேற்றப்பட்டது.',
          mr: 'सीमेन्स पीएलसी डेटा बिगक्वेरीमध्ये यशस्वीरित्या पाठवला गेला आहे.',
          en: 'Siemens PLC power supply repair episode successfully ingested into Google BigQuery robotics dataset.'
        },
        arOverlay: {
          coordinates: { x: 35, y: 25, width: 45, height: 50 },
          calloutText: 'BIGQUERY ROBOTICS STREAM',
          styleType: 'schematic-box',
          stepInstructions: [
            'STREAM: kriyaos_embodied_ai.repair_trajectories.',
            'ROW ID: bq_traj_siemens_20261112_1145c.',
            'TRAJECTORY: Desoldering, MOV seating, 24V DC verification test.'
          ]
        },
        agentSkill: {
          skillName: 'BigQueryRoboticsLoggerSkill',
          actionStatus: 'STREAM_VERIFIED',
          detail: 'Row ID bq_traj_siemens_20261112_1145c indexed in robotics dataset v2.4.',
          bigQueryTable: 'kriyaos_embodied_ai.repair_trajectories',
          telemetry: { rowId: 'bq_traj_siemens_20261112_1145c', dataset: 'kriyaos_embodied_ai' }
        },
        diagnosticBrain: {
          componentOrSubject: 'PLC Flyback Converter Maintenance Observation Stream',
          conditionOrFault: 'High-Value Industrial Robotics Fine-Tuning Demonstration',
          citationOrSpec: 'Google Cloud BigQuery Streaming Buffer Partition Specification',
          safetyWarning: 'CONFIDENTIALITY: All proprietary customer ladder logic code is excluded from dataset export.',
          imageEditPrompt: 'Overlay streaming network data flow graph connecting physical machine to Google Cloud.'
        }
      }
    ]
  }
];

// ==========================================
// Self-Learning AI Brain State Management
// ==========================================
const BRAIN_STORAGE_KEY = 'kriyaos_self_learning_brain_v2';

export const DEFAULT_INITIAL_BRAIN: BrainMemoryState = {
  version: 'v1.5 Autonomous',
  level: 5,
  experience: 420,
  experienceNext: 600,
  totalObjectsScanned: 18,
  accuracyScore: 98.4,
  rules: [
    {
      id: 'rule-01',
      timestamp: 'Today 11:20 AM',
      trigger: 'Empty Juice Bottle Scan',
      ruleText: 'User strongly prioritizes eco-recycling and zero-sugar similar product discovery on consumer beverage items. Automatically boost Eco & Commerce intent ranking.',
      confidence: 99.2,
      impact: 'Boosts Eco & Shopping intents for PET containers',
      feedback: 'helpful'
    },
    {
      id: 'rule-02',
      timestamp: 'Today 11:28 AM',
      trigger: 'Gadget / GaN Charger Scan',
      ruleText: 'Always check USB-C CC1 pin resistance and thermal surface limits before recommending wattage upgrades.',
      confidence: 97.8,
      impact: 'Enforces contact safety check prior to ecommerce search',
      feedback: 'auto'
    },
    {
      id: 'rule-03',
      timestamp: 'Today 11:35 AM',
      trigger: 'Solar Inverter SG10K Scan',
      ruleText: 'Mandate 5-minute capacitor bleed-off and physical DMM 0.0V DC verification before generating desolder steps for contactors.',
      confidence: 100.0,
      impact: 'Strict LOTO safety gate enforcement on all high-voltage hardware',
      feedback: 'helpful'
    }
  ],
  recentInteractions: [
    'Scanned: Empty Juice Bottle → User chose "Recycle & Dispose Guide"',
    'Scanned: 65W GaN Charger → User chose "Find Similar / Upgrade Online"',
    'Scanned: Solar Inverter 10kW → User executed "Diagnose & Repair Relay K1"'
  ]
};

export function loadBrainMemory(): BrainMemoryState {
  if (typeof window === 'undefined') return DEFAULT_INITIAL_BRAIN;
  try {
    const raw = localStorage.getItem(BRAIN_STORAGE_KEY);
    if (!raw) return DEFAULT_INITIAL_BRAIN;
    const parsed = JSON.parse(raw);
    if (parsed && Array.isArray(parsed.rules)) return parsed;
    return DEFAULT_INITIAL_BRAIN;
  } catch {
    return DEFAULT_INITIAL_BRAIN;
  }
}

export function saveBrainMemory(brain: BrainMemoryState) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(BRAIN_STORAGE_KEY, JSON.stringify(brain));
  } catch {}
}

export function recordBrainLearningEvent(
  current: BrainMemoryState,
  objectName: string,
  intentLabel: string,
  userFeedback: 'helpful' | 'improved' | 'auto' = 'auto',
  thumbnail?: string,
  category: string = 'General Object',
  bonusExp: number = 45,
  isVerified: boolean = false
): BrainMemoryState {
  const newExp = current.experience + bonusExp;
  const levelUp = newExp >= current.experienceNext;
  const newLevel = levelUp ? current.level + 1 : current.level;
  const newExpNext = levelUp ? current.experienceNext + 250 : current.experienceNext;

  const ruleId = `rule-${Date.now().toString().slice(-4)}`;
  const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  const generatedRule: LearnedRule = {
    id: ruleId,
    timestamp: `Today ${time}`,
    trigger: `${objectName} → [${intentLabel}]`,
    ruleText: `Learned from ${objectName}: User favors "${intentLabel}". The AI Brain will automatically elevate this intent and adapt visual AR overlay prominence in future encounters.`,
    confidence: Math.min(99.9, +(current.accuracyScore + (isVerified ? 0.5 : 0.2)).toFixed(1)),
    impact: `Prioritizes ${intentLabel} context in Gemini Omni prompt`,
    feedback: userFeedback,
    thumbnail,
  };

  const newSpecimens = [...(current.specimens || [])];
  if (thumbnail) {
    newSpecimens.unshift({
      id: `specimen-${Date.now().toString().slice(-6)}`,
      timestamp: time,
      objectName,
      category,
      thumbnail,
      ruleText: generatedRule.ruleText,
      verified: isVerified,
    });
  }

  const updated: BrainMemoryState = {
    ...current,
    level: newLevel,
    experience: newExp,
    experienceNext: newExpNext,
    totalObjectsScanned: current.totalObjectsScanned + 1,
    accuracyScore: Math.min(99.9, +(current.accuracyScore + 0.1).toFixed(1)),
    rules: [generatedRule, ...current.rules.slice(0, 9)],
    specimens: newSpecimens.slice(0, 16),
    recentInteractions: [
      `Scanned: ${objectName} → Executed "${intentLabel}"`,
      ...current.recentInteractions.slice(0, 5),
    ],
  };

  saveBrainMemory(updated);
  return updated;
}

export function generateBigQueryRoboticsExport(brain: BrainMemoryState): string {
  const exportPayload = {
    export_metadata: {
      generator: 'Percepta Universal Embodied AI Engine',
      generated_at: new Date().toISOString(),
      bigquery_target_table: 'percepta_embodied_ai.repair_trajectories',
      total_specimens: brain.specimens?.length || 0,
      total_learned_rules: brain.rules.length,
      brain_intelligence_level: brain.level,
      total_experience_xp: brain.experience,
      accuracy_score: brain.accuracyScore,
    },
    learned_behavioral_rules: brain.rules,
    specimen_visual_journal: brain.specimens || [],
    bigquery_repair_trajectories: (brain.specimens || []).map((specimen) => ({
      trajectory_id: `traj-${specimen.id}`,
      timestamp: specimen.timestamp,
      object_name: specimen.objectName,
      category: specimen.category,
      rule_applied: specimen.ruleText,
      verification_status: specimen.verified ? 'VERIFIED_COMPLIANT' : 'INITIAL_SCAN',
      sha256_audit_hash: pseudoSha256(`${specimen.id}-${specimen.timestamp}-${specimen.objectName}`),
      embodied_ai_sensor_stream: {
        camera_resolution: '720p',
        fps: 30,
        multimodal_model: 'Google Gemini Flash-Lite & Gemma 3',
        spatial_audio_synthesizer: 'Google Lyria',
      },
    })),
  };
  return JSON.stringify(exportPayload, null, 2);
}

function pseudoSha256(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  const hex = Math.abs(hash).toString(16).padStart(8, '0');
  return `sha256_${hex}${hex}${hex}${hex}${hex}${hex}${hex}${hex}`.slice(0, 64);
}

export function teachBrainCustomRule(
  current: BrainMemoryState,
  customNote: string
): BrainMemoryState {
  const ruleId = `rule-custom-${Date.now().toString().slice(-4)}`;
  const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  const customRule: LearnedRule = {
    id: ruleId,
    timestamp: `Today ${time}`,
    trigger: 'Manual User Teaching Note',
    ruleText: `User Directive: ${customNote}. This rule is persistently bound to the active context memory of Gemini Omni.`,
    confidence: 100.0,
    impact: 'Direct Reinforcement Learning constraint active',
    feedback: 'improved'
  };

  const updated: BrainMemoryState = {
    ...current,
    experience: current.experience + 60,
    rules: [customRule, ...current.rules.slice(0, 9)],
    recentInteractions: [
      `Direct Teacher Input: "${customNote.slice(0, 40)}..."`,
      ...current.recentInteractions.slice(0, 5)
    ]
  };

  saveBrainMemory(updated);
  return updated;
}

export function buildActiveContextMemoryPrompt(brain: BrainMemoryState): string {
  if (!brain.rules || brain.rules.length === 0) return '';
  const rulesList = brain.rules
    .slice(0, 5)
    .map((r, i) => `${i + 1}. [Confidence: ${r.confidence}%] ${r.ruleText}`)
    .join('\n');

  return `
ACTIVE REINFORCEMENT LEARNING CONTEXT (Brain Version: ${brain.version}, Level ${brain.level}):
The AI Brain has accumulated the following learned behavioral rules from prior physical-world interactions:
${rulesList}

INSTRUCTION: Adhere strictly to these learned behavioral rules when analyzing the current scene and proposing proactive action intents!
`;
}

