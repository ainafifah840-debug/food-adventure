/* =========================================================
   FOOD ADVENTURE! – learning content
   All vocabulary, questions and scripts live in this file so
   teachers can review or adapt the content in one place.
   ========================================================= */

window.FA_DATA = {
  /* Pre-recorded MP3s are preferred when present; browser speech is the fallback. */
  audio: { useRecordings: true, folder: "audio/" },

  /* ---------- 10 vocabulary flashcards ---------- */
  foods: [
    {
      id: "apple", en: "Apple", ms: "Epal", emoji: "🍎", group: "Fruits",
      alt: "a shiny red fruit with a small stem and a green leaf",
      clues: ["I am a fruit.", "I can be red or green.", "People enjoy eating me as a snack."],
      sentence: "I eat an apple every morning.",
      accept: ["epal"]
    },
    {
      id: "banana", en: "Banana", ms: "Pisang", emoji: "🍌", group: "Fruits",
      alt: "a long, curved yellow fruit",
      clues: ["I am a fruit.", "I am long, curved and yellow.", "You peel my skin before you eat me."],
      sentence: "My brother puts a banana in his lunch box.",
      accept: ["pisang"]
    },
    {
      id: "orange", en: "Orange", ms: "Oren", emoji: "🍊", group: "Fruits",
      alt: "a round, juicy orange-coloured fruit",
      clues: ["I am a round fruit.", "My name is also the name of a colour.", "I am juicy and people make juice from me."],
      sentence: "Orange juice is fresh and sweet.",
      accept: ["oren", "limau", "limau manis"]
    },
    {
      id: "carrot", en: "Carrot", ms: "Lobak merah", emoji: "🥕", group: "Vegetables",
      alt: "a long orange vegetable with green leaves on top",
      clues: ["I am a vegetable.", "I am orange, long and crunchy.", "Rabbits love to eat me!"],
      sentence: "My mother puts carrots in the chicken soup.",
      accept: ["lobak merah", "lobak"]
    },
    {
      id: "broccoli", en: "Broccoli", ms: "Brokoli", emoji: "🥦", group: "Vegetables",
      alt: "a green vegetable that looks like a small tree",
      clues: ["I am a green vegetable.", "I look like a small tree.", "You can steam me or stir-fry me."],
      sentence: "I eat broccoli with rice for dinner.",
      accept: ["brokoli"]
    },
    {
      id: "spinach", en: "Spinach", ms: "Bayam", emoji: "🥬", group: "Vegetables",
      alt: "a bunch of soft, dark green leaves",
      clues: ["I am a vegetable with soft green leaves.", "People often cook me with garlic.", "I help to make your body strong."],
      sentence: "Spinach is good for our health.",
      accept: ["bayam"]
    },
    {
      id: "fish", en: "Fish", ms: "Ikan", emoji: "🐟", group: "Protein",
      alt: "a blue animal with fins that lives in water",
      clues: ["I live in rivers and seas.", "I have fins and I can swim.", "People fry, grill or steam me."],
      sentence: "We eat fried fish for lunch.",
      accept: ["ikan"]
    },
    {
      id: "chicken", en: "Chicken", ms: "Ayam", emoji: "🍗", group: "Protein",
      alt: "a cooked drumstick of meat",
      clues: ["I come from a farm bird that says \"cluck, cluck\".", "People cook me in curry or fry me.", "I give your body protein to grow."],
      sentence: "My favourite food is chicken curry.",
      accept: ["ayam"]
    },
    {
      id: "bread", en: "Bread", ms: "Roti", emoji: "🍞", group: "Food and Drinks",
      alt: "a soft brown loaf that can be sliced",
      clues: ["I am made from flour.", "I am soft and you can slice me.", "People put butter or jam on me."],
      sentence: "I eat bread and eggs for breakfast.",
      accept: ["roti"]
    },
    {
      id: "milk", en: "Milk", ms: "Susu", emoji: "🥛", group: "Food and Drinks",
      alt: "a glass of white drink",
      clues: ["I am a white drink.", "I come from cows.", "I help to make your bones and teeth strong."],
      sentence: "I drink a glass of milk every night.",
      accept: ["susu"]
    }
  ],

  /* ---------- Vocabulary checkpoint (5 MCQ) ---------- */
  checkpoint: [
    {
      q: "I am orange, crunchy and often eaten as a vegetable. What am I?",
      options: ["Apple", "Carrot", "Banana"], answer: 1
    },
    {
      q: "I am a white drink. I come from cows and I make your bones strong. What am I?",
      options: ["Milk", "Bread", "Fish"], answer: 0
    },
    {
      q: "I am long and yellow. You peel my skin before you eat me. What am I?",
      options: ["Orange", "Spinach", "Banana"], answer: 2
    },
    {
      q: "I am a green vegetable and I look like a small tree. What is my Malay name?",
      options: ["Bayam", "Brokoli", "Lobak merah"], answer: 1
    },
    {
      q: "I live in water and I have fins. What am I?",
      options: ["Chicken", "Apple", "Fish"], answer: 2
    }
  ],

  /* ---------- Matching challenge rounds ---------- */
  matchingRounds: [
    { title: "Round One", items: ["apple", "banana", "carrot"] },
    { title: "Round Two", items: ["broccoli", "milk", "bread"] }
  ],

  /* ---------- Speaking corner ---------- */
  speakingQuestions: [
    { q: "Can you describe your favourite food?", emoji: "🍳",
      examples: ["My favourite food is nasi lemak. It is fragrant and tasty.", "My favourite food is mango. It is sweet, juicy and yellow."] },
    { q: "Tell me about a meal you enjoyed recently.", emoji: "🍽️",
      examples: ["Yesterday, I had dinner with my family. We ate rice and chicken.", "Last Sunday, I helped my mother prepare lunch. Then, we ate together."] },
    { q: "How often do you eat vegetables?", emoji: "🥦",
      examples: ["I eat vegetables five times a week.", "I eat vegetables every day."] },
    { q: "What is your favourite food?", emoji: "🍗",
      examples: ["My favourite food is fried chicken.", "My favourite food is fried rice."] },
    { q: "What do you usually drink during lunch?", emoji: "🥤",
      examples: ["I drink plain water during lunch.", "I usually drink milk during lunch."] },
    { q: "Do you like eating fruits?", emoji: "🍉",
      examples: ["Yes, I do. I like eating bananas.", "Yes, I like eating apples and oranges."] }
  ],
  sentenceStarters: [
    "I usually eat...",
    "My favourite food is...",
    "I drink...",
    "I like eating...",
    "I eat vegetables ... times a week."
  ],
  speakingVocab: [
    { en: "breakfast", ms: "sarapan", emoji: "🌅" },
    { en: "lunch", ms: "makan tengah hari", emoji: "☀️" },
    { en: "dinner", ms: "makan malam", emoji: "🌙" },
    { en: "usually", ms: "biasanya", emoji: "🔁" },
    { en: "often", ms: "kerap / selalu", emoji: "📅" },
    { en: "sometimes", ms: "kadang-kadang", emoji: "🤔" },
    { en: "every day", ms: "setiap hari", emoji: "🗓️" },
    { en: "favourite", ms: "kegemaran", emoji: "❤️" },
    { en: "healthy", ms: "sihat", emoji: "💪" },
    { en: "delicious", ms: "sedap", emoji: "😋" },
    { en: "drink", ms: "minum / minuman", emoji: "🥤" },
    { en: "vegetables", ms: "sayur-sayuran", emoji: "🥗" }
  ],
  shareFoods: ["bread and eggs", "nasi lemak", "roti canai", "fried rice", "chicken", "fish", "fruits", "vegetables"],
  shareMeals: ["breakfast", "lunch", "dinner"],

  /* ---------- Listening corner ---------- */
  interview: [
    { who: "Interviewer", text: "Good morning, Sarah! Can you tell me about your eating habits?" },
    { who: "Sarah", text: "Good morning! I usually eat bread and eggs for breakfast. I also drink a glass of milk." },
    { who: "Interviewer", text: "How often do you eat vegetables?" },
    { who: "Sarah", text: "I eat vegetables almost every day. I really like carrots and broccoli." },
    { who: "Interviewer", text: "What is your favourite fruit?" },
    { who: "Sarah", text: "My favourite fruit is banana because it is sweet and delicious." },
    { who: "Interviewer", text: "Do you drink enough water every day?" },
    { who: "Sarah", text: "Yes! I always bring a water bottle to school." },
    { who: "Interviewer", text: "That's great! Thank you for sharing." },
    { who: "Sarah", text: "You're welcome!" }
  ],
  trueFalse: [
    { s: "Sarah eats bread and eggs for breakfast.", answer: true,
      evidence: "Sarah said: \"I usually eat bread and eggs for breakfast.\"" },
    { s: "Sarah drinks orange juice every morning.", answer: false,
      evidence: "Sarah drinks a glass of milk, not orange juice." },
    { s: "Sarah likes carrots and broccoli.", answer: true,
      evidence: "Sarah said: \"I really like carrots and broccoli.\"" },
    { s: "Her favourite fruit is an apple.", answer: false,
      evidence: "Her favourite fruit is banana, not apple." },
    { s: "Sarah brings a water bottle to school.", answer: true,
      evidence: "Sarah said: \"I always bring a water bottle to school.\"" }
  ],

  /* ---------- Final quiz (10 questions, MCQ + True/False) ---------- */
  quiz: [
    { type: "mc", skill: "Picture identification", picture: "🥦", pictureAlt: "a green vegetable that looks like a small tree",
      q: "Look at the picture. What is this food?",
      options: ["Carrot", "Broccoli", "Spinach"], answer: 1,
      explain: "This is broccoli. It looks like a small green tree." },
    { type: "mc", skill: "Picture identification", picture: "🍞", pictureAlt: "a soft brown loaf",
      q: "Look at the picture. What is this food?",
      options: ["Bread", "Milk", "Banana"], answer: 0,
      explain: "This is bread (roti). It is made from flour." },
    { type: "mc", skill: "Contextual clues",
      q: "I am a round fruit. My name is also the name of a colour. What am I?",
      options: ["Apple", "Orange", "Banana"], answer: 1,
      explain: "Orange is a fruit and also a colour." },
    { type: "mc", skill: "Vocabulary",
      q: "What is the Malay word for CHICKEN?",
      options: ["Ikan", "Ayam", "Roti"], answer: 1,
      explain: "Chicken is \"ayam\" in Bahasa Melayu." },
    { type: "mc", skill: "Vocabulary",
      q: "\"Lobak merah\" in English is...",
      options: ["Carrot", "Apple", "Spinach"], answer: 0,
      explain: "\"Lobak merah\" means carrot." },
    { type: "tf", skill: "Contextual clues",
      q: "Spinach is a fruit.",
      answer: false,
      explain: "False. Spinach (bayam) is a vegetable with green leaves." },
    { type: "mc", skill: "Eating habits",
      q: "Your friend asks: \"What do you usually eat for breakfast?\" Which is the best answer?",
      options: ["I usually eat bread and eggs.", "I am eleven years old.", "My school is very big."], answer: 0,
      explain: "We answer with \"I usually eat...\" to talk about breakfast." },
    { type: "mc", skill: "Eating habits",
      q: "Which question asks about vegetables?",
      options: ["What is your name?", "How often do you eat vegetables?", "Where is your school?"], answer: 1,
      explain: "\"How often do you eat vegetables?\" asks about eating habits." },
    { type: "tf", skill: "Listening", picture: "🎧", pictureAlt: "headphones",
      q: "In the interview, Sarah's favourite fruit is banana.",
      answer: true,
      explain: "True. Sarah said banana is sweet and delicious." },
    { type: "mc", skill: "Listening", picture: "🎧", pictureAlt: "headphones",
      q: "In the interview, what does Sarah always bring to school?",
      options: ["An orange", "A water bottle", "A packet of bread"], answer: 1,
      explain: "Sarah said: \"I always bring a water bottle to school.\"" }
  ]
};
