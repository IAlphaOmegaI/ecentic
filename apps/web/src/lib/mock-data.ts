export type Product = {
  _id: string;
  title: string;
  price: number;
  category: string;
  brand: string;
  sku: string;
  winRate: number;
  winRateTrend: number;
  gpt4WinRate: number;
  claudeWinRate: number;
  geminiWinRate: number;
  dataQuality: number;
  optimizationStatus: "optimized" | "pending" | "unoptimized";
  topCompetitor: string;
  competitorWinRate: number;
  lastSimulated: string;
};

export const products: Product[] = [
  {
    _id: "1",
    title: "Pro Wireless Earbuds",
    price: 139,
    category: "Electronics",
    brand: "AudioMax",
    sku: "AX-PRO-101",
    winRate: 34,
    winRateTrend: -3,
    gpt4WinRate: 41,
    claudeWinRate: 28,
    geminiWinRate: 32,
    dataQuality: 62,
    optimizationStatus: "unoptimized",
    topCompetitor: "SoundMax X3",
    competitorWinRate: 76,
    lastSimulated: "2 hours ago",
  },
  {
    _id: "2",
    title: "Bamboo Travel Mug",
    price: 38,
    category: "Kitchen",
    brand: "EcoSip",
    sku: "ES-MUG-002",
    winRate: 72,
    winRateTrend: 8,
    gpt4WinRate: 78,
    claudeWinRate: 68,
    geminiWinRate: 70,
    dataQuality: 88,
    optimizationStatus: "optimized",
    topCompetitor: "GreenMug Pro",
    competitorWinRate: 28,
    lastSimulated: "1 hour ago",
  },
  {
    _id: "3",
    title: "Memory Foam Pillow",
    price: 89,
    category: "Bedding",
    brand: "SleepCo",
    sku: "SC-PIL-033",
    winRate: 45,
    winRateTrend: 2,
    gpt4WinRate: 52,
    claudeWinRate: 41,
    geminiWinRate: 43,
    dataQuality: 71,
    optimizationStatus: "unoptimized",
    topCompetitor: "DreamFoam Elite",
    competitorWinRate: 55,
    lastSimulated: "3 hours ago",
  },
  {
    _id: "4",
    title: "Stainless Steel Water Bottle",
    price: 32,
    category: "Kitchen",
    brand: "HydroMax",
    sku: "HM-BTL-044",
    winRate: 58,
    winRateTrend: 5,
    gpt4WinRate: 63,
    claudeWinRate: 54,
    geminiWinRate: 57,
    dataQuality: 80,
    optimizationStatus: "optimized",
    topCompetitor: "AquaShield Pro",
    competitorWinRate: 42,
    lastSimulated: "30 minutes ago",
  },
  {
    _id: "5",
    title: "Yoga Mat Premium",
    price: 65,
    category: "Fitness",
    brand: "FlexFit",
    sku: "FF-MAT-055",
    winRate: 23,
    winRateTrend: -7,
    gpt4WinRate: 28,
    claudeWinRate: 19,
    geminiWinRate: 21,
    dataQuality: 45,
    optimizationStatus: "unoptimized",
    topCompetitor: "LuluMat Ultra",
    competitorWinRate: 77,
    lastSimulated: "5 hours ago",
  },
  {
    _id: "6",
    title: "Coffee Grinder Pro",
    price: 120,
    category: "Kitchen",
    brand: "BrewMaster",
    sku: "BM-GRD-066",
    winRate: 61,
    winRateTrend: 4,
    gpt4WinRate: 67,
    claudeWinRate: 58,
    geminiWinRate: 59,
    dataQuality: 82,
    optimizationStatus: "optimized",
    topCompetitor: "JavaPro Elite",
    competitorWinRate: 39,
    lastSimulated: "1 hour ago",
  },
  {
    _id: "7",
    title: "LED Desk Lamp",
    price: 79,
    category: "Electronics",
    brand: "LightCraft",
    sku: "LC-LMP-077",
    winRate: 38,
    winRateTrend: 1,
    gpt4WinRate: 44,
    claudeWinRate: 33,
    geminiWinRate: 37,
    dataQuality: 67,
    optimizationStatus: "pending",
    topCompetitor: "BrightMax 3000",
    competitorWinRate: 62,
    lastSimulated: "2 hours ago",
  },
  {
    _id: "8",
    title: "Running Shoes Air",
    price: 145,
    category: "Footwear",
    brand: "SpeedStep",
    sku: "SS-SHO-088",
    winRate: 19,
    winRateTrend: -11,
    gpt4WinRate: 24,
    claudeWinRate: 15,
    geminiWinRate: 18,
    dataQuality: 42,
    optimizationStatus: "unoptimized",
    topCompetitor: "NikeAir Ultra",
    competitorWinRate: 81,
    lastSimulated: "4 hours ago",
  },
  {
    _id: "9",
    title: "Ceramic Dinner Set",
    price: 180,
    category: "Kitchen",
    brand: "TableArt",
    sku: "TA-DNS-099",
    winRate: 55,
    winRateTrend: 6,
    gpt4WinRate: 61,
    claudeWinRate: 50,
    geminiWinRate: 54,
    dataQuality: 77,
    optimizationStatus: "optimized",
    topCompetitor: "CorningWare Pro",
    competitorWinRate: 45,
    lastSimulated: "6 hours ago",
  },
  {
    _id: "10",
    title: "Bluetooth Speaker Mini",
    price: 95,
    category: "Electronics",
    brand: "SoundBlast",
    sku: "SB-SPK-100",
    winRate: 29,
    winRateTrend: -2,
    gpt4WinRate: 35,
    claudeWinRate: 24,
    geminiWinRate: 28,
    dataQuality: 58,
    optimizationStatus: "unoptimized",
    topCompetitor: "BoseMax Compact",
    competitorWinRate: 71,
    lastSimulated: "3 hours ago",
  },
] as const;

export type Competitor = {
  _id: string;
  brand: string;
  productsTracked: number;
  yourWinRate: number;
  theirStrongestAttribute: string;
  yourStrongestAttribute: string;
  lastUpdated: string;
};

export const competitors: Competitor[] = [
  {
    _id: "1",
    brand: "SoundMax",
    productsTracked: 6,
    yourWinRate: 23,
    theirStrongestAttribute: "Battery life specs",
    yourStrongestAttribute: "Driver quality",
    lastUpdated: "1 hour ago",
  },
  {
    _id: "2",
    brand: "EcoHome",
    productsTracked: 4,
    yourWinRate: 61,
    theirStrongestAttribute: "Return policy",
    yourStrongestAttribute: "Material quality",
    lastUpdated: "30 minutes ago",
  },
  {
    _id: "3",
    brand: "TechPro",
    productsTracked: 8,
    yourWinRate: 35,
    theirStrongestAttribute: "Warranty coverage",
    yourStrongestAttribute: "Build quality",
    lastUpdated: "2 hours ago",
  },
  {
    _id: "4",
    brand: "PrimeBrands",
    productsTracked: 5,
    yourWinRate: 48,
    theirStrongestAttribute: "Shipping speed",
    yourStrongestAttribute: "Price-to-quality",
    lastUpdated: "4 hours ago",
  },
] as const;

export type Optimization = {
  _id: string;
  productId: string;
  productTitle: string;
  type: "title" | "description" | "structured_data" | "all";
  estimatedLift: number;
  modelsAffected: string[];
  status: "pending" | "in_progress" | "published" | "dismissed";
  publishedAt?: string;
  winRateBefore?: number;
  winRateAfter?: number;
};

export const optimizations: Optimization[] = [
  {
    _id: "1",
    productId: "1",
    productTitle: "Pro Wireless Earbuds",
    type: "all",
    estimatedLift: 28,
    modelsAffected: ["GPT-4", "Claude", "Gemini"],
    status: "pending",
  },
  {
    _id: "2",
    productId: "5",
    productTitle: "Yoga Mat Premium",
    type: "description",
    estimatedLift: 21,
    modelsAffected: ["GPT-4", "Claude"],
    status: "pending",
  },
  {
    _id: "3",
    productId: "8",
    productTitle: "Running Shoes Air",
    type: "all",
    estimatedLift: 35,
    modelsAffected: ["GPT-4", "Claude", "Gemini"],
    status: "pending",
  },
  {
    _id: "4",
    productId: "10",
    productTitle: "Bluetooth Speaker Mini",
    type: "structured_data",
    estimatedLift: 18,
    modelsAffected: ["Gemini"],
    status: "pending",
  },
  {
    _id: "5",
    productId: "7",
    productTitle: "LED Desk Lamp",
    type: "title",
    estimatedLift: 12,
    modelsAffected: ["GPT-4"],
    status: "in_progress",
  },
  {
    _id: "6",
    productId: "2",
    productTitle: "Bamboo Travel Mug",
    type: "all",
    estimatedLift: 24,
    modelsAffected: ["GPT-4", "Claude", "Gemini"],
    status: "published",
    publishedAt: "Yesterday",
    winRateBefore: 64,
    winRateAfter: 72,
  },
  {
    _id: "7",
    productId: "4",
    productTitle: "Stainless Steel Water Bottle",
    type: "description",
    estimatedLift: 15,
    modelsAffected: ["GPT-4", "Claude"],
    status: "published",
    publishedAt: "2 days ago",
    winRateBefore: 53,
    winRateAfter: 58,
  },
  {
    _id: "8",
    productId: "6",
    productTitle: "Coffee Grinder Pro",
    type: "structured_data",
    estimatedLift: 10,
    modelsAffected: ["Claude"],
    status: "dismissed",
  },
] as const;

export const overallWinRate = 43;
export const winRateTrend = 3;

export const activityFeed = [
  {
    _id: "a1",
    type: "optimization_published",
    message: "Optimization published for Bamboo Travel Mug — win rate +8%",
    timestamp: "1 hour ago",
  },
  {
    _id: "a2",
    type: "simulation_complete",
    message: "Daily simulation completed — 3 products improved",
    timestamp: "2 hours ago",
  },
  {
    _id: "a3",
    type: "drift",
    message: "Model drift detected on Claude — 7 products affected",
    timestamp: "Yesterday",
  },
  {
    _id: "a4",
    type: "competitor",
    message: "New competitor detected: AudioPeak ZX1",
    timestamp: "Yesterday",
  },
  {
    _id: "a5",
    type: "optimization_published",
    message: "Optimization published for Stainless Steel Water Bottle — win rate +5%",
    timestamp: "2 days ago",
  },
] as const;
