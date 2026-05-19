export type TaskVisualType = "green" | "blue" | "orange";
export type EnvironmentShape = "relaxed" | "structured";
export type EffortLevel = "low" | "medium" | "high";

export type OpportunityTask = {
  id: string;
  name: string;
  startTime: string;
  durationMinutes: number;
  peopleNeeded: number;
  spotsRemaining: number;
  shortDescription: string;
  fullDescription: string;
  typeColor: TaskVisualType;
  environmentShape: EnvironmentShape;
  physicalEffort: EffortLevel;
  mentalEffort: EffortLevel;
  steps: string[];
  toolsProvided: string[];
  thingsToBring: string[];
  customFields: { label: string; value: string }[];
};

export type MockOpportunity = {
  id: string;
  title: string;
  organizerName: string;
  trustedOrganizer?: boolean;
  category: string;
  city: string;
  prefecture: string;
  address: string;
  mapsUrl: string;
  startsAt: string;
  endsAt: string;
  scheduleLabel: string;
  durationLabel: string;
  volunteersNeeded: number;
  spotsRemaining: number;
  allowMultipleTaskSelection?: boolean;
  tags: string[];
  shortDescription: string;
  description: string;
  coverImageUrl?: string;
  workspaceImageUrls: string[];
  thingsToBring?: string[];
  arrivalGuidance?: string;
  firstLandmarkDescription?: string;
  firstLandmarkImageUrl?: string;
  firstContactName?: string;
  firstContactRole?: string;
  firstContactImageUrl?: string;
  aiGenerated: boolean;
  taskFlow: OpportunityTask[];
};

export const mockOpportunities: MockOpportunity[] = [
  {
    id: "garden-cleanup",
    title: "Community garden cleanup",
    organizerName: "Kamogawa Neighborhood Association",
    trustedOrganizer: true,
    category: "Outdoor care",
    city: "Kyoto",
    prefecture: "Kyoto",
    address: "Kamogawa Delta, Sakyo Ward, Kyoto",
    mapsUrl:
      "https://www.google.com/maps/search/?api=1&query=Kamogawa%20Delta%20Kyoto",
    startsAt: "2026-06-06T09:30:00+09:00",
    endsAt: "2026-06-06T12:30:00+09:00",
    scheduleLabel: "Saturday, Jun 6 · 9:30-12:30",
    durationLabel: "3 hours",
    volunteersNeeded: 12,
    spotsRemaining: 5,
    tags: ["gardening", "outdoor", "beginner friendly"],
    shortDescription:
      "Refresh a riverside community garden with light planting, sweeping, and shared tea afterward.",
    description:
      "Help neighbors prepare the riverside garden for early summer. The morning is split into small, friendly task groups, so you can choose between planting, tidying paths, or welcoming visitors. No gardening experience is required.",
    coverImageUrl:
      "https://images.unsplash.com/photo-1466692476868-aef1dfb1e735?auto=format&fit=crop&w=1400&q=80",
    workspaceImageUrls: [
      "https://images.unsplash.com/photo-1416879595882-3373a0480b5b?auto=format&fit=crop&w=900&q=80",
      "https://images.unsplash.com/photo-1515150144380-bca9f1650ed9?auto=format&fit=crop&w=900&q=80",
      "https://images.unsplash.com/photo-1591857177580-dc82b9ac4e1e?auto=format&fit=crop&w=900&q=80",
    ],
    thingsToBring: ["Comfortable shoes", "Hat or sun cover", "Water bottle"],
    arrivalGuidance:
      "Meet at the north side of the delta, near the small wooden garden sign. The check-in table opens 10 minutes before the start time.",
    firstLandmarkDescription:
      "Look for a low wooden sign beside the herb beds and a folding table with green name tags.",
    firstLandmarkImageUrl:
      "https://images.unsplash.com/photo-1558904541-efa843a96f01?auto=format&fit=crop&w=900&q=80",
    firstContactName: "Sarah Tanaka",
    firstContactRole: "volunteer check-in lead",
    firstContactImageUrl:
      "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=400&q=80",
    aiGenerated: true,
    taskFlow: [
      {
        id: "plant-seedlings",
        name: "Plant seedlings",
        startTime: "09:45",
        durationMinutes: 65,
        peopleNeeded: 4,
        spotsRemaining: 2,
        shortDescription: "Add herbs and summer flowers to prepared beds.",
        fullDescription:
          "Work with a small group to place seedlings, loosen soil, and water the new plants. A coordinator will show the pattern before you begin.",
        typeColor: "green",
        environmentShape: "relaxed",
        physicalEffort: "medium",
        mentalEffort: "low",
        steps: ["Choose a bed", "Place seedlings", "Add soil", "Water gently"],
        toolsProvided: ["Gloves", "Hand trowels", "Watering cans"],
        thingsToBring: ["Comfortable shoes", "Hat or sun cover"],
        customFields: [{ label: "Good for", value: "People who like quiet outdoor work" }],
      },
      {
        id: "path-tidying",
        name: "Tidy garden paths",
        startTime: "10:00",
        durationMinutes: 75,
        peopleNeeded: 5,
        spotsRemaining: 1,
        shortDescription: "Sweep leaves and clear the walking path edges.",
        fullDescription:
          "Keep the garden easy to walk through by sweeping the main path, collecting fallen leaves, and moving small branches to the compost area.",
        typeColor: "blue",
        environmentShape: "structured",
        physicalEffort: "medium",
        mentalEffort: "medium",
        steps: ["Collect tools", "Sweep assigned path", "Sort leaves", "Return tools"],
        toolsProvided: ["Brooms", "Leaf bags", "Dustpans"],
        thingsToBring: ["Work clothes"],
        customFields: [{ label: "Surface", value: "Mostly flat gravel path" }],
      },
      {
        id: "tea-table",
        name: "Set up tea table",
        startTime: "11:10",
        durationMinutes: 45,
        peopleNeeded: 3,
        spotsRemaining: 2,
        shortDescription: "Prepare a small refreshment table for volunteers.",
        fullDescription:
          "Arrange cups, snacks, and a simple sign-in corner so everyone can take a short break together after the cleanup.",
        typeColor: "orange",
        environmentShape: "relaxed",
        physicalEffort: "low",
        mentalEffort: "low",
        steps: ["Wipe table", "Arrange cups", "Set snacks out", "Welcome people"],
        toolsProvided: ["Table", "Tea", "Cups", "Snacks"],
        thingsToBring: ["Nothing special"],
        customFields: [{ label: "Interaction level", value: "Light conversation" }],
      },
    ],
  },
  {
    id: "market-support",
    title: "Local market support",
    organizerName: "Uji Weekend Market",
    category: "Event support",
    city: "Uji",
    prefecture: "Kyoto",
    address: "Uji City Cultural Center, Uji, Kyoto",
    mapsUrl:
      "https://www.google.com/maps/search/?api=1&query=Uji%20City%20Cultural%20Center",
    startsAt: "2026-06-07T13:00:00+09:00",
    endsAt: "2026-06-07T17:00:00+09:00",
    scheduleLabel: "Sunday, Jun 7 · 13:00-17:00",
    durationLabel: "4 hours",
    volunteersNeeded: 10,
    spotsRemaining: 3,
    tags: ["community", "event", "social"],
    shortDescription:
      "Support a weekend local market by guiding visitors, arranging booths, and helping vendors close smoothly.",
    description:
      "Join the afternoon market team for a lively community event. Tasks are grouped by comfort level, from calm booth tidying to active visitor guidance.",
    coverImageUrl:
      "https://images.unsplash.com/photo-1488459716781-31db52582fe9?auto=format&fit=crop&w=1400&q=80",
    workspaceImageUrls: [
      "https://images.unsplash.com/photo-1533900298318-6b8da08a523e?auto=format&fit=crop&w=900&q=80",
      "https://images.unsplash.com/photo-1504711434969-e33886168f5c?auto=format&fit=crop&w=900&q=80",
    ],
    thingsToBring: ["Comfortable shoes", "Small towel"],
    arrivalGuidance:
      "Enter through the cultural center main doors and follow the weekend market signs to the registration desk.",
    firstLandmarkDescription:
      "The first marker is a green market banner beside the entrance map.",
    firstContactName: "Mika Yamamoto",
    firstContactRole: "market floor coordinator",
    aiGenerated: true,
    taskFlow: [
      {
        id: "visitor-guide",
        name: "Guide visitors",
        startTime: "13:15",
        durationMinutes: 90,
        peopleNeeded: 4,
        spotsRemaining: 1,
        shortDescription: "Answer simple questions and point visitors to booths.",
        fullDescription:
          "Stand near the entrance with a printed map and help visitors find food stalls, toilets, and the rest area.",
        typeColor: "orange",
        environmentShape: "structured",
        physicalEffort: "medium",
        mentalEffort: "medium",
        steps: ["Pick up map", "Stay near entrance", "Guide visitors", "Share updates"],
        toolsProvided: ["Market map", "Name badge"],
        thingsToBring: ["Comfortable shoes"],
        customFields: [{ label: "Language", value: "Japanese helpful, English welcome" }],
      },
      {
        id: "booth-reset",
        name: "Reset booth supplies",
        startTime: "15:00",
        durationMinutes: 60,
        peopleNeeded: 3,
        spotsRemaining: 1,
        shortDescription: "Restock flyers, bags, and small display items.",
        fullDescription:
          "Move between assigned booths and quietly refill shared supplies so vendors can keep serving visitors.",
        typeColor: "blue",
        environmentShape: "relaxed",
        physicalEffort: "low",
        mentalEffort: "medium",
        steps: ["Check supply box", "Visit booths", "Refill items", "Report low stock"],
        toolsProvided: ["Supply checklist", "Tote bag"],
        thingsToBring: ["Nothing special"],
        customFields: [{ label: "Pace", value: "Calm walking task" }],
      },
    ],
  },
  {
    id: "craft-workshop",
    title: "Craft workshop helper",
    organizerName: "Nara Community Studio",
    category: "Creative workshop",
    city: "Nara",
    prefecture: "Nara",
    address: "Naramachi, Nara",
    mapsUrl: "https://www.google.com/maps/search/?api=1&query=Naramachi%20Nara",
    startsAt: "2026-06-10T18:30:00+09:00",
    endsAt: "2026-06-10T20:30:00+09:00",
    scheduleLabel: "Wednesday, Jun 10 · 18:30-20:30",
    durationLabel: "2 hours",
    volunteersNeeded: 6,
    spotsRemaining: 4,
    tags: ["crafts", "teaching", "indoor"],
    shortDescription:
      "Help children and seniors during a calm evening craft session in a small community studio.",
    description:
      "Support a mixed-age craft workshop by preparing materials, helping participants follow simple steps, and tidying the studio afterward.",
    coverImageUrl:
      "https://images.unsplash.com/photo-1452860606245-08befc0ff44b?auto=format&fit=crop&w=1400&q=80",
    workspaceImageUrls: [
      "https://images.unsplash.com/photo-1513364776144-60967b0f800f?auto=format&fit=crop&w=900&q=80",
    ],
    aiGenerated: false,
    taskFlow: [
      {
        id: "materials-prep",
        name: "Prepare materials",
        startTime: "18:30",
        durationMinutes: 30,
        peopleNeeded: 2,
        spotsRemaining: 1,
        shortDescription: "Lay out paper, thread, and sample pieces.",
        fullDescription:
          "Prepare each seat with the right materials and check that scissors, glue, and sample pieces are easy to reach.",
        typeColor: "blue",
        environmentShape: "structured",
        physicalEffort: "low",
        mentalEffort: "medium",
        steps: ["Open material boxes", "Set each seat", "Check tools", "Place samples"],
        toolsProvided: ["Craft tools", "Material checklist"],
        thingsToBring: ["Nothing special"],
        customFields: [{ label: "Best fit", value: "Detail-oriented helpers" }],
      },
      {
        id: "participant-help",
        name: "Help participants",
        startTime: "19:00",
        durationMinutes: 70,
        peopleNeeded: 4,
        spotsRemaining: 3,
        shortDescription: "Support people who need help with craft steps.",
        fullDescription:
          "Move gently around the room, answer questions, and help participants who get stuck with folding, tying, or arranging parts.",
        typeColor: "orange",
        environmentShape: "relaxed",
        physicalEffort: "low",
        mentalEffort: "medium",
        steps: ["Watch for raised hands", "Offer help", "Encourage participants", "Share issues"],
        toolsProvided: ["Sample craft", "Step sheet"],
        thingsToBring: ["Patience", "Comfortable indoor shoes"],
        customFields: [{ label: "Noise level", value: "Quiet indoor room" }],
      },
    ],
  },
  {
    id: "temple-morning-sweep",
    title: "Temple morning sweep",
    organizerName: "Higashiyama Temple Friends",
    category: "Outdoor care",
    city: "Kyoto",
    prefecture: "Kyoto",
    address: "Higashiyama, Kyoto",
    mapsUrl: "https://www.google.com/maps/search/?api=1&query=Higashiyama%20Kyoto",
    startsAt: "2026-06-13T07:30:00+09:00",
    endsAt: "2026-06-13T09:30:00+09:00",
    scheduleLabel: "Saturday, Jun 13 · 7:30-9:30",
    durationLabel: "2 hours",
    volunteersNeeded: 8,
    spotsRemaining: 6,
    tags: ["morning", "quiet", "outdoor"],
    shortDescription:
      "Join a quiet early-morning sweep of the temple approach before visitors arrive.",
    description:
      "Help keep a neighborhood temple approach clean and welcoming. The work is calm, mostly outdoors, and guided by a local caretaker.",
    coverImageUrl:
      "https://images.unsplash.com/photo-1528360983277-13d401cdc186?auto=format&fit=crop&w=1400&q=80",
    workspaceImageUrls: [
      "https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?auto=format&fit=crop&w=900&q=80",
      "https://images.unsplash.com/photo-1492571350019-22de08371fd3?auto=format&fit=crop&w=900&q=80",
    ],
    aiGenerated: true,
    taskFlow: [
      {
        id: "approach-sweep",
        name: "Sweep stone approach",
        startTime: "07:40",
        durationMinutes: 50,
        peopleNeeded: 4,
        spotsRemaining: 3,
        shortDescription: "Sweep leaves and dust from the main stone path.",
        fullDescription:
          "Use bamboo brooms to sweep the temple approach in small sections, then collect leaves near the side gate.",
        typeColor: "green",
        environmentShape: "structured",
        physicalEffort: "medium",
        mentalEffort: "low",
        steps: ["Pick up broom", "Sweep assigned section", "Collect leaves", "Return tools"],
        toolsProvided: ["Bamboo broom", "Leaf baskets"],
        thingsToBring: ["Quiet shoes", "Water bottle"],
        customFields: [{ label: "Atmosphere", value: "Very quiet morning setting" }],
      },
      {
        id: "lantern-wipe",
        name: "Wipe lantern bases",
        startTime: "08:30",
        durationMinutes: 35,
        peopleNeeded: 2,
        spotsRemaining: 2,
        shortDescription: "Gently wipe dust from outdoor lantern bases.",
        fullDescription:
          "Clean low stone lantern bases with soft cloths. The caretaker will point out which areas should not be touched.",
        typeColor: "blue",
        environmentShape: "structured",
        physicalEffort: "low",
        mentalEffort: "medium",
        steps: ["Receive cloth", "Check assigned lanterns", "Wipe bases", "Report damage"],
        toolsProvided: ["Soft cloths", "Small bucket"],
        thingsToBring: ["Nothing special"],
        customFields: [{ label: "Care level", value: "Gentle handling needed" }],
      },
    ],
  },
  {
    id: "library-shelf-refresh",
    title: "Library shelf refresh",
    organizerName: "Nara Reading Room",
    category: "Calm indoor support",
    city: "Nara",
    prefecture: "Nara",
    address: "Nara City Library, Nara",
    mapsUrl:
      "https://www.google.com/maps/search/?api=1&query=Nara%20City%20Library",
    startsAt: "2026-06-14T10:00:00+09:00",
    endsAt: "2026-06-14T12:00:00+09:00",
    scheduleLabel: "Sunday, Jun 14 · 10:00-12:00",
    durationLabel: "2 hours",
    volunteersNeeded: 5,
    spotsRemaining: 2,
    tags: ["library", "indoor", "calm"],
    shortDescription:
      "Help refresh a small community reading corner by sorting books and creating clear shelf labels.",
    description:
      "Support a quiet library maintenance morning. Tasks are designed for volunteers who prefer calm indoor work with clear steps.",
    coverImageUrl:
      "https://images.unsplash.com/photo-1524995997946-a1c2e315a42f?auto=format&fit=crop&w=1400&q=80",
    workspaceImageUrls: [
      "https://images.unsplash.com/photo-1507842217343-583bb7270b66?auto=format&fit=crop&w=900&q=80",
      "https://images.unsplash.com/photo-1519682337058-a94d519337bc?auto=format&fit=crop&w=900&q=80",
    ],
    aiGenerated: false,
    taskFlow: [
      {
        id: "sort-returns",
        name: "Sort returned books",
        startTime: "10:05",
        durationMinutes: 55,
        peopleNeeded: 3,
        spotsRemaining: 1,
        shortDescription: "Sort returned books by genre and shelf area.",
        fullDescription:
          "Work from a cart of recently returned books, matching each book to a genre label before placing it on the correct shelf.",
        typeColor: "blue",
        environmentShape: "structured",
        physicalEffort: "low",
        mentalEffort: "medium",
        steps: ["Check genre label", "Sort by shelf", "Place books", "Flag unknown items"],
        toolsProvided: ["Sorting cart", "Genre guide"],
        thingsToBring: ["Nothing special"],
        customFields: [{ label: "Noise level", value: "Quiet" }],
      },
      {
        id: "label-corners",
        name: "Refresh shelf labels",
        startTime: "11:00",
        durationMinutes: 45,
        peopleNeeded: 2,
        spotsRemaining: 1,
        shortDescription: "Replace worn shelf labels with clearer signs.",
        fullDescription:
          "Remove faded paper labels and attach newly printed shelf labels so visitors can find books faster.",
        typeColor: "blue",
        environmentShape: "relaxed",
        physicalEffort: "low",
        mentalEffort: "low",
        steps: ["Remove old labels", "Clean shelf edge", "Attach new labels", "Check alignment"],
        toolsProvided: ["Labels", "Tape", "Cleaning cloth"],
        thingsToBring: ["Nothing special"],
        customFields: [{ label: "Best fit", value: "People who enjoy tidy details" }],
      },
    ],
  },
  {
    id: "riverbank-picnic-setup",
    title: "Riverbank picnic setup",
    organizerName: "Kamo Family Picnic Team",
    category: "Event support",
    city: "Kyoto",
    prefecture: "Kyoto",
    address: "Kamo River, Kyoto",
    mapsUrl: "https://www.google.com/maps/search/?api=1&query=Kamo%20River%20Kyoto",
    startsAt: "2026-06-20T15:00:00+09:00",
    endsAt: "2026-06-20T18:00:00+09:00",
    scheduleLabel: "Saturday, Jun 20 · 15:00-18:00",
    durationLabel: "3 hours",
    volunteersNeeded: 9,
    spotsRemaining: 4,
    tags: ["family", "event", "outdoor"],
    shortDescription:
      "Help set up picnic mats, shade corners, and activity tables for a small family gathering.",
    description:
      "Support a relaxed riverside picnic for local families. Volunteers can help with setup, simple activity stations, and cleanup.",
    coverImageUrl:
      "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1400&q=80",
    workspaceImageUrls: [
      "https://images.unsplash.com/photo-1472653431158-6364773b2a56?auto=format&fit=crop&w=900&q=80",
      "https://images.unsplash.com/photo-1533777857889-4be7c70b33f7?auto=format&fit=crop&w=900&q=80",
      "https://images.unsplash.com/photo-1492684223066-81342ee5ff30?auto=format&fit=crop&w=900&q=80",
    ],
    aiGenerated: true,
    taskFlow: [
      {
        id: "mat-layout",
        name: "Lay picnic mats",
        startTime: "15:05",
        durationMinutes: 40,
        peopleNeeded: 3,
        spotsRemaining: 1,
        shortDescription: "Set picnic mats and low tables in shaded areas.",
        fullDescription:
          "Arrange picnic mats with enough walking space between groups and place low tables near each mat.",
        typeColor: "green",
        environmentShape: "relaxed",
        physicalEffort: "medium",
        mentalEffort: "low",
        steps: ["Check layout", "Carry mats", "Place tables", "Secure corners"],
        toolsProvided: ["Mats", "Low tables", "Clips"],
        thingsToBring: ["Comfortable shoes"],
        customFields: [{ label: "Weather note", value: "Shade available, but bring sun cover" }],
      },
      {
        id: "activity-table",
        name: "Run activity table",
        startTime: "16:00",
        durationMinutes: 75,
        peopleNeeded: 4,
        spotsRemaining: 2,
        shortDescription: "Support simple drawing and paper craft activities.",
        fullDescription:
          "Welcome children to the activity table, explain the simple craft, and keep materials stocked.",
        typeColor: "orange",
        environmentShape: "relaxed",
        physicalEffort: "low",
        mentalEffort: "medium",
        steps: ["Set materials", "Explain craft", "Help participants", "Refill supplies"],
        toolsProvided: ["Paper", "Crayons", "Tape", "Sample crafts"],
        thingsToBring: ["Friendly energy"],
        customFields: [{ label: "Interaction level", value: "High but casual" }],
      },
    ],
  },
  {
    id: "bike-repair-pop-up",
    title: "Bike repair pop-up helper",
    organizerName: "Uji Cycle Care",
    category: "Community repair",
    city: "Uji",
    prefecture: "Kyoto",
    address: "Uji Station Plaza, Uji, Kyoto",
    mapsUrl:
      "https://www.google.com/maps/search/?api=1&query=Uji%20Station%20Plaza",
    startsAt: "2026-06-21T09:00:00+09:00",
    endsAt: "2026-06-21T13:00:00+09:00",
    scheduleLabel: "Sunday, Jun 21 · 9:00-13:00",
    durationLabel: "4 hours",
    volunteersNeeded: 7,
    spotsRemaining: 3,
    tags: ["repair", "community", "hands-on"],
    shortDescription:
      "Help a pop-up bike repair booth with check-in, tool passing, and basic safety checks.",
    description:
      "Support local mechanics during a free bike repair pop-up. You do not need to be a mechanic; several roles focus on check-in and organizing parts.",
    coverImageUrl:
      "https://images.unsplash.com/photo-1485965120184-e220f721d03e?auto=format&fit=crop&w=1400&q=80",
    workspaceImageUrls: [
      "https://images.unsplash.com/photo-1507035895480-2b3156c31fc8?auto=format&fit=crop&w=900&q=80",
      "https://images.unsplash.com/photo-1517649763962-0c623066013b?auto=format&fit=crop&w=900&q=80",
    ],
    aiGenerated: true,
    taskFlow: [
      {
        id: "bike-checkin",
        name: "Bike check-in",
        startTime: "09:00",
        durationMinutes: 80,
        peopleNeeded: 2,
        spotsRemaining: 1,
        shortDescription: "Welcome visitors and note what repair help they need.",
        fullDescription:
          "Ask visitors what issue they are having, attach a numbered tag to the bike, and guide them to the waiting area.",
        typeColor: "orange",
        environmentShape: "structured",
        physicalEffort: "low",
        mentalEffort: "medium",
        steps: ["Greet visitor", "Write issue", "Attach bike tag", "Guide to queue"],
        toolsProvided: ["Clipboard", "Bike tags", "Pens"],
        thingsToBring: ["Comfortable shoes"],
        customFields: [{ label: "Queue style", value: "First come, first served" }],
      },
      {
        id: "tool-runner",
        name: "Tool runner",
        startTime: "10:20",
        durationMinutes: 90,
        peopleNeeded: 3,
        spotsRemaining: 1,
        shortDescription: "Bring tools and small parts to repair tables.",
        fullDescription:
          "Help mechanics keep working smoothly by finding labeled tools, bringing replacement parts, and returning items to the correct box.",
        typeColor: "blue",
        environmentShape: "structured",
        physicalEffort: "medium",
        mentalEffort: "medium",
        steps: ["Listen for request", "Find tool", "Bring to table", "Return after use"],
        toolsProvided: ["Tool labels", "Parts boxes"],
        thingsToBring: ["Closed-toe shoes"],
        customFields: [{ label: "Safety", value: "No repair experience required" }],
      },
      {
        id: "safety-check",
        name: "Basic safety check",
        startTime: "11:30",
        durationMinutes: 45,
        peopleNeeded: 2,
        spotsRemaining: 1,
        shortDescription: "Use a checklist to confirm repaired bikes are ready.",
        fullDescription:
          "Follow a simple checklist for brakes, bell, tire pressure, and lights before bikes are returned to visitors.",
        typeColor: "green",
        environmentShape: "structured",
        physicalEffort: "low",
        mentalEffort: "high",
        steps: ["Check brakes", "Check bell", "Check tires", "Ask mechanic if unsure"],
        toolsProvided: ["Checklist", "Tire gauge"],
        thingsToBring: ["Careful attention"],
        customFields: [{ label: "Training", value: "Five-minute briefing provided" }],
      },
    ],
  },
];

const categoryPlaceholderImages: Record<string, string> = {
  "Outdoor care":
    "https://images.unsplash.com/photo-1523348837708-15d4a09cfac2?auto=format&fit=crop&w=1400&q=80",
  "Event support":
    "https://images.unsplash.com/photo-1533174072545-7a4b6ad7a6c3?auto=format&fit=crop&w=1400&q=80",
  "Creative workshop":
    "https://images.unsplash.com/photo-1513364776144-60967b0f800f?auto=format&fit=crop&w=1400&q=80",
};

export function getMockOpportunity(id: string) {
  return mockOpportunities.find((opportunity) => opportunity.id === id);
}

export function getMockOpportunityTask(opportunityId: string, taskId: string) {
  return getMockOpportunity(opportunityId)?.taskFlow.find((task) => task.id === taskId);
}

export function getOpportunityCoverImage(opportunity: MockOpportunity) {
  return (
    opportunity.coverImageUrl ??
    categoryPlaceholderImages[opportunity.category] ??
    "https://images.unsplash.com/photo-1491438590914-bc09fcaaf77a?auto=format&fit=crop&w=1400&q=80"
  );
}
