"""
Message templates for all supported languages: English (en), Hindi (hi), Telugu (te).
All patient-facing messages MUST use these templates to ensure consistent multilingual support.
"""

TEMPLATES = {
    "welcome": {
        "en": (
            "🏥 *Heal Hub*\n\n"
            "Hello {name}! 👋\n\n"
            "Welcome to Heal Hub — your AI-powered post-surgery recovery assistant.\n\n"
            "I'm here to help you recover safely after your {surgery_type} surgery.\n\n"
            "First, let's set up your language preference:\n\n"
            "1️⃣ English\n"
            "2️⃣ हिंदी (Hindi)\n"
            "3️⃣ తెలుగు (Telugu)\n\n"
            "Please reply with 1, 2, or 3"
        ),
        "hi": (
            "🏥 *Heal Hub*\n\n"
            "नमस्ते {name}! 👋\n\n"
            "Heal Hub में आपका स्वागत है — आपका AI-संचालित सर्जरी रिकवरी सहायक।\n\n"
            "मैं आपकी {surgery_type} सर्जरी के बाद सुरक्षित रिकवरी में मदद करने के लिए यहां हूं।\n\n"
            "पहले, अपनी भाषा चुनें:\n\n"
            "1️⃣ English\n"
            "2️⃣ हिंदी (Hindi)\n"
            "3️⃣ తెలుగు (Telugu)\n\n"
            "कृपया 1, 2, या 3 से जवाब दें"
        ),
        "te": (
            "🏥 *Heal Hub*\n\n"
            "హలో {name}! 👋\n\n"
            "Heal Hub కి స్వాగతం — మీ AI-ఆధారిత సర్జరీ రికవరీ సహాయకం.\n\n"
            "మీ {surgery_type} సర్జరీ తర్వాత సురక్షితంగా కోలుకోవడంలో మీకు సహాయం చేయడానికి నేను ఇక్కడ ఉన్నాను.\n\n"
            "ముందుగా, మీ భాష ఎంచుకోండి:\n\n"
            "1️⃣ English\n"
            "2️⃣ हिंदी (Hindi)\n"
            "3️⃣ తెలుగు (Telugu)\n\n"
            "దయచేసి 1, 2, లేదా 3 తో సమాధానం ఇవ్వండి"
        ),
    },

    "lang_confirm": {
        "en": "✅ Language set to English!",
        "hi": "✅ भाषा हिंदी में सेट हो गई!",
        "te": "✅ భాష తెలుగులో సెట్ చేయబడింది!",
    },

    "main_menu": {
        "en": (
            "I'll check in on you regularly. You can also reach out anytime.\n\n"
            "Here's what I can help with:\n\n"
            "1️⃣ 💬 Report Symptoms — Tell me how you're feeling\n"
            "2️⃣ 📸 Send Wound Photo — I'll analyze it with AI\n"
            "3️⃣ 💊 My Medicines — View your medicine schedule\n"
            "4️⃣ 📋 My Recovery Report — See your progress\n"
            "5️⃣ 📅 Book Appointment — Request a doctor visit\n"
            "6️⃣ 📞 Call Me — I'll call you back for a check-in\n"
            "7️⃣ 👨‍⚕️ Talk to Doctor — Request doctor to come online\n"
            "8️⃣ ❓ Help — See all commands\n\n"
            "Reply with a number or just type naturally!"
        ),
        "hi": (
            "मैं आपसे नियमित रूप से संपर्क करूंगा। आप कभी भी मुझसे बात कर सकते हैं।\n\n"
            "मैं आपकी कैसे मदद कर सकता हूं:\n\n"
            "1️⃣ 💬 लक्षण बताएं — बताएं आप कैसा महसूस कर रहे हैं\n"
            "2️⃣ 📸 घाव की फोटो भेजें — AI से विश्लेषण करवाएं\n"
            "3️⃣ 💊 मेरी दवाइयां — अपनी दवाइयों की सूची देखें\n"
            "4️⃣ 📋 मेरी रिकवरी रिपोर्ट — अपनी प्रगति देखें\n"
            "5️⃣ 📅 अपॉइंटमेंट बुक करें — डॉक्टर से मिलने का अनुरोध\n"
            "6️⃣ 📞 मुझे कॉल करें — मैं आपको वापस कॉल करूंगा\n"
            "7️⃣ 👨‍⚕️ डॉक्टर से बात करें — डॉक्टर को ऑनलाइन आने का अनुरोध\n"
            "8️⃣ ❓ मदद — सभी कमांड देखें\n\n"
            "नंबर से जवाब दें या बस सामान्य रूप से टाइप करें!"
        ),
        "te": (
            "నేను మీతో క్రమం తప్పకుండా సంప్రదిస్తాను. మీరు ఎప్పుడైనా నాతో మాట్లాడవచ్చు.\n\n"
            "నేను మీకు ఎలా సహాయం చేయగలను:\n\n"
            "1️⃣ 💬 లక్షణాలు చెప్పండి — మీకు ఎలా అనిపిస్తుందో చెప్పండి\n"
            "2️⃣ 📸 గాయం ఫోటో పంపండి — AI తో విశ్లేషణ చేయండి\n"
            "3️⃣ 💊 నా మందులు — మీ మందుల షెడ్యూల్ చూడండి\n"
            "4️⃣ 📋 నా రికవరీ రిపోర్ట్ — మీ ప్రగతి చూడండి\n"
            "5️⃣ 📅 అపాయింట్‌మెంట్ బుక్ చేయండి — డాక్టర్‌ని కలవడానికి అభ్యర్థన\n"
            "6️⃣ 📞 నాకు కాల్ చేయండి — నేను మీకు తిరిగి కాల్ చేస్తాను\n"
            "7️⃣ 👨‍⚕️ డాక్టర్‌తో మాట్లాడండి — డాక్టర్ ఆన్‌లైన్‌లోకి రావడానికి అభ్యర్థన\n"
            "8️⃣ ❓ సహాయం — అన్ని ఆదేశాలు చూడండి\n\n"
            "నంబర్‌తో సమాధానం ఇవ్వండి లేదా సహజంగా టైప్ చేయండి!"
        ),
    },

    "checkin_greeting": {
        "en": "Hi {name}! Day {day} check-in 🏥",
        "hi": "नमस्ते {name}! दिन {day} चेक-इन 🏥",
        "te": "హాయ్ {name}! రోజు {day} చెక్-ఇన్ 🏥",
    },

    "pain_question": {
        "en": (
            "How is your pain today? Reply 1-5:\n\n"
            "1️⃣ No pain (1-2)\n"
            "2️⃣ Mild (3-4)\n"
            "3️⃣ Moderate (5-6)\n"
            "4️⃣ Severe (7-8)\n"
            "5️⃣ Extreme (9-10)"
        ),
        "hi": (
            "आज आपका दर्द कैसा है? 1-5 में बताएं:\n\n"
            "1️⃣ कोई दर्द नहीं (1-2)\n"
            "2️⃣ हल्का (3-4)\n"
            "3️⃣ मध्यम (5-6)\n"
            "4️⃣ तेज़ (7-8)\n"
            "5️⃣ बहुत तेज़ (9-10)"
        ),
        "te": (
            "ఈరోజు మీ నొప్పి ఎలా ఉంది? 1-5 లో చెప్పండి:\n\n"
            "1️⃣ నొప్పి లేదు (1-2)\n"
            "2️⃣ తేలికపాటి (3-4)\n"
            "3️⃣ మధ్యస్థ (5-6)\n"
            "4️⃣ తీవ్రమైన (7-8)\n"
            "5️⃣ చాలా తీవ్రమైన (9-10)"
        ),
    },

    "symptom_question": {
        "en": (
            "Are you experiencing any of these?\n\n"
            "1️⃣ Swelling\n"
            "2️⃣ Fever\n"
            "3️⃣ Bleeding\n"
            "4️⃣ Redness\n"
            "5️⃣ Nausea\n"
            "6️⃣ None of these ✅\n\n"
            "Reply with numbers (e.g., 1,3 for swelling and bleeding)"
        ),
        "hi": (
            "क्या आपको इनमें से कुछ हो रहा है?\n\n"
            "1️⃣ सूजन\n"
            "2️⃣ बुखार\n"
            "3️⃣ खून बहना\n"
            "4️⃣ लालिमा\n"
            "5️⃣ जी मिचलाना\n"
            "6️⃣ इनमें से कुछ नहीं ✅\n\n"
            "नंबर से जवाब दें (जैसे, 1,3)"
        ),
        "te": (
            "మీకు వీటిలో ఏమైనా ఉన్నాయా?\n\n"
            "1️⃣ వాపు\n"
            "2️⃣ జ్వరం\n"
            "3️⃣ రక్తస్రావం\n"
            "4️⃣ ఎరుపు\n"
            "5️⃣ వాంతి\n"
            "6️⃣ వీటిలో ఏమీ లేదు ✅\n\n"
            "నంబర్‌లతో సమాధానం ఇవ్వండి (ఉదా., 1,3)"
        ),
    },

    "medicine_question": {
        "en": (
            "Did you take all your medicines today?\n\n"
            "1️⃣ Yes, all taken ✅\n"
            "2️⃣ Missed some\n"
            "3️⃣ Didn't take any"
        ),
        "hi": (
            "क्या आपने आज सभी दवाइयां ली?\n\n"
            "1️⃣ हां, सब ले ली ✅\n"
            "2️⃣ कुछ छूट गई\n"
            "3️⃣ कोई नहीं ली"
        ),
        "te": (
            "ఈరోజు మీ మందులన్నీ తీసుకున్నారా?\n\n"
            "1️⃣ అవును, అన్నీ తీసుకున్నాను ✅\n"
            "2️⃣ కొన్ని మిస్ అయ్యాయి\n"
            "3️⃣ ఏమీ తీసుకోలేదు"
        ),
    },

    "checkin_open_ended": {
        "en": "Anything else you'd like to tell your doctor? Type your message or reply 'no'.",
        "hi": "क्या आप अपने डॉक्टर को कुछ और बताना चाहते हैं? अपना संदेश टाइप करें या 'no' लिखें।",
        "te": "మీ డాక్టర్‌కి ఇంకేమైనా చెప్పాలనుకుంటున్నారా? మీ సందేశం టైప్ చేయండి లేదా 'no' అని రాయండి.",
    },

    "checkin_complete": {
        "en": "✅ Check-in complete! Your responses have been recorded and your doctor will be updated. Take care, {name}!",
        "hi": "✅ चेक-इन पूरा! आपके जवाब रिकॉर्ड हो गए हैं और आपके डॉक्टर को अपडेट किया जाएगा। अपना ख्याल रखें, {name}!",
        "te": "✅ చెక్-ఇన్ పూర్తయింది! మీ సమాధానాలు రికార్డ్ చేయబడ్డాయి మరియు మీ డాక్టర్‌కి అప్‌డేట్ చేయబడుతుంది. జాగ్రత్తగా ఉండండి, {name}!",
    },

    "appointment_request": {
        "en": (
            "📅 Appointment Request\n\n"
            "Your request has been sent to Dr. {doctor_name}. You'll receive a confirmation once the doctor schedules it.\n\n"
            "Is it urgent?\n"
            "1️⃣ Yes, urgent\n"
            "2️⃣ No, routine follow-up"
        ),
        "hi": (
            "📅 अपॉइंटमेंट अनुरोध\n\n"
            "आपका अनुरोध डॉ. {doctor_name} को भेजा गया है। डॉक्टर के शेड्यूल करने पर आपको पुष्टि मिलेगी।\n\n"
            "क्या यह ज़रूरी है?\n"
            "1️⃣ हां, ज़रूरी है\n"
            "2️⃣ नहीं, नियमित फॉलो-अप"
        ),
        "te": (
            "📅 అపాయింట్‌మెంట్ అభ్యర్థన\n\n"
            "మీ అభ్యర్థన డా. {doctor_name} కి పంపబడింది. డాక్టర్ షెడ్యూల్ చేసిన తర్వాత మీకు నిర్ధారణ వస్తుంది.\n\n"
            "ఇది అత్యవసరమా?\n"
            "1️⃣ అవును, అత్యవసరం\n"
            "2️⃣ కాదు, రొటీన్ ఫాలో-అప్"
        ),
    },

    "doctor_request": {
        "en": (
            "👨‍⚕️ Doctor Request\n\n"
            "I've notified Dr. {doctor_name} that you'd like to speak with them directly. "
            "If the doctor is available, they'll message you here.\n\n"
            "In the meantime, is there anything urgent I can help with?"
        ),
        "hi": (
            "👨‍⚕️ डॉक्टर अनुरोध\n\n"
            "मैंने डॉ. {doctor_name} को सूचित कर दिया है कि आप उनसे सीधे बात करना चाहते हैं। "
            "अगर डॉक्टर उपलब्ध हैं, तो वे आपको यहां संदेश भेजेंगे।\n\n"
            "तब तक, क्या कोई ज़रूरी बात है जिसमें मैं मदद कर सकता हूं?"
        ),
        "te": (
            "👨‍⚕️ డాక్టర్ అభ్యర్థన\n\n"
            "మీరు నేరుగా మాట్లాడాలనుకుంటున్నారని డా. {doctor_name} కి తెలియజేశాను. "
            "డాక్టర్ అందుబాటులో ఉంటే, వారు మీకు ఇక్కడ సందేశం పంపుతారు.\n\n"
            "లోగా, నేను సహాయం చేయగల అత్యవసర విషయం ఏమైనా ఉందా?"
        ),
    },

    "callback_confirm": {
        "en": "📞 Got it! I'll call you in a moment for a quick check-in.\n\nPlease keep your phone nearby.",
        "hi": "📞 समझ गया! मैं आपको थोड़ी देर में चेक-इन के लिए कॉल करूंगा।\n\nकृपया अपना फोन पास रखें।",
        "te": "📞 అర్థమైంది! చెక్-ఇన్ కోసం కొద్దిసేపటిలో మీకు కాల్ చేస్తాను.\n\nదయచేసి మీ ఫోన్ దగ్గరలో ఉంచుకోండి.",
    },

    "hospital_callback": {
        "en": (
            "🏥 Hospital Callback Request\n\n"
            "I've requested the hospital to arrange a callback for you. "
            "Someone from {hospital_name} will call you soon.\n\n"
            "Reference: Patient {name}, {surgery_type}, Day {day}"
        ),
        "hi": (
            "🏥 अस्पताल कॉलबैक अनुरोध\n\n"
            "मैंने अस्पताल से आपके लिए कॉलबैक की व्यवस्था करने का अनुरोध किया है। "
            "{hospital_name} से कोई जल्द ही आपको कॉल करेगा।\n\n"
            "संदर्भ: मरीज़ {name}, {surgery_type}, दिन {day}"
        ),
        "te": (
            "🏥 ఆస్పత్రి కాల్‌బ్యాక్ అభ్యర్థన\n\n"
            "మీ కోసం కాల్‌బ్యాక్ ఏర్పాటు చేయమని ఆస్పత్రిని అభ్యర్థించాను. "
            "{hospital_name} నుండి ఎవరైనా మీకు త్వరలో కాల్ చేస్తారు.\n\n"
            "సూచన: రోగి {name}, {surgery_type}, రోజు {day}"
        ),
    },

    "report_summary": {
        "en": (
            "📋 *Recovery Report for {name}*\n\n"
            "🏥 Surgery: {surgery_type}\n"
            "📅 Day: {day}\n"
            "🎯 Status: {status}\n"
            "💯 Recovery Score: {score}/100\n"
            "😣 Avg Pain: {avg_pain}/10\n"
            "💊 Medicine Adherence: {med_adherence}%\n"
            "📊 Check-ins: {checkin_count}\n\n"
            "🤖 AI Assessment:\n{ai_reasoning}\n\n"
            "📌 Recommendation:\n{recommendation}"
        ),
        "hi": (
            "📋 *{name} की रिकवरी रिपोर्ट*\n\n"
            "🏥 सर्जरी: {surgery_type}\n"
            "📅 दिन: {day}\n"
            "🎯 स्थिति: {status}\n"
            "💯 रिकवरी स्कोर: {score}/100\n"
            "😣 औसत दर्द: {avg_pain}/10\n"
            "💊 दवाई पालन: {med_adherence}%\n"
            "📊 चेक-इन: {checkin_count}\n\n"
            "🤖 AI मूल्यांकन:\n{ai_reasoning}\n\n"
            "📌 सिफारिश:\n{recommendation}"
        ),
        "te": (
            "📋 *{name} రికవరీ రిపోర్ట్*\n\n"
            "🏥 సర్జరీ: {surgery_type}\n"
            "📅 రోజు: {day}\n"
            "🎯 స్థితి: {status}\n"
            "💯 రికవరీ స్కోర్: {score}/100\n"
            "😣 సగటు నొప్పి: {avg_pain}/10\n"
            "💊 మందుల పాటింపు: {med_adherence}%\n"
            "📊 చెక్-ఇన్‌లు: {checkin_count}\n\n"
            "🤖 AI అంచనా:\n{ai_reasoning}\n\n"
            "📌 సిఫార్సు:\n{recommendation}"
        ),
    },

    "medicine_list": {
        "en": "💊 *Your Medicines*\n\n{medicine_list}\n\n⏰ Remember to take them on time!\nReply 'done' after taking your medicines.",
        "hi": "💊 *आपकी दवाइयां*\n\n{medicine_list}\n\n⏰ समय पर लेना याद रखें!\nदवाइयां लेने के बाद 'done' लिखें।",
        "te": "💊 *మీ మందులు*\n\n{medicine_list}\n\n⏰ సమయానికి తీసుకోవడం గుర్తుంచుకోండి!\nమందులు తీసుకున్న తర్వాత 'done' అని రాయండి.",
    },

    "help": {
        "en": (
            "❓ *Help Menu*\n\n"
            "Here's everything I can do:\n\n"
            "💬 Just type how you're feeling\n"
            "📸 Send a photo of your wound\n"
            "🎤 Send a voice note\n"
            "📞 Type 'call me' for AI callback\n"
            "🏥 Type 'hospital call' for hospital callback\n"
            "👨‍⚕️ Type 'doctor' to request doctor\n"
            "📅 Type 'appointment' to book a visit\n"
            "💊 Type 'medicines' for your medicine list\n"
            "📋 Type 'report' for recovery report\n"
            "🌐 Type 'language' to change language\n"
            "❓ Type 'help' to see this menu\n\n"
            "Or just talk to me naturally — I understand!"
        ),
        "hi": (
            "❓ *मदद मेनू*\n\n"
            "मैं यह सब कर सकता हूं:\n\n"
            "💬 बस बताएं कैसा महसूस हो रहा है\n"
            "📸 घाव की फोटो भेजें\n"
            "🎤 वॉइस नोट भेजें\n"
            "📞 AI कॉलबैक के लिए 'call me' लिखें\n"
            "🏥 अस्पताल कॉलबैक के लिए 'hospital call' लिखें\n"
            "👨‍⚕️ डॉक्टर के लिए 'doctor' लिखें\n"
            "📅 अपॉइंटमेंट के लिए 'appointment' लिखें\n"
            "💊 दवाइयों के लिए 'medicines' लिखें\n"
            "📋 रिपोर्ट के लिए 'report' लिखें\n"
            "🌐 भाषा बदलने के लिए 'language' लिखें\n"
            "❓ यह मेनू देखने के लिए 'help' लिखें\n\n"
            "या बस मुझसे सामान्य बात करें — मैं समझता हूं!"
        ),
        "te": (
            "❓ *సహాయం మెనూ*\n\n"
            "నేను ఇవన్నీ చేయగలను:\n\n"
            "💬 మీకు ఎలా అనిపిస్తుందో టైప్ చేయండి\n"
            "📸 గాయం ఫోటో పంపండి\n"
            "🎤 వాయిస్ నోట్ పంపండి\n"
            "📞 AI కాల్‌బ్యాక్ కోసం 'call me' టైప్ చేయండి\n"
            "🏥 ఆస్పత్రి కాల్‌బ్యాక్ కోసం 'hospital call' టైప్ చేయండి\n"
            "👨‍⚕️ డాక్టర్ కోసం 'doctor' టైప్ చేయండి\n"
            "📅 అపాయింట్‌మెంట్ కోసం 'appointment' టైప్ చేయండి\n"
            "💊 మందుల కోసం 'medicines' టైప్ చేయండి\n"
            "📋 రిపోర్ట్ కోసం 'report' టైప్ చేయండి\n"
            "🌐 భాష మార్చడానికి 'language' టైప్ చేయండి\n"
            "❓ ఈ మెనూ చూడటానికి 'help' టైప్ చేయండి\n\n"
            "లేదా నాతో సహజంగా మాట్లాడండి — నేను అర్థం చేసుకుంటాను!"
        ),
    },

    "photo_prompt": {
        "en": "📸 Please send a photo of your surgical wound area.",
        "hi": "📸 कृपया अपने सर्जरी वाले घाव की फोटो भेजें।",
        "te": "📸 దయచేసి మీ సర్జరీ గాయం ప్రాంతం ఫోటో పంపండి.",
    },

    "voice_fail": {
        "en": "I couldn't understand your voice message. Could you type your message instead?",
        "hi": "मैं आपका वॉइस मैसेज समझ नहीं पाया। क्या आप टाइप करके बता सकते हैं?",
        "te": "మీ వాయిస్ మెసేజ్ అర్థం కాలేదు. దయచేసి టైప్ చేసి చెప్పగలరా?",
    },

    "not_registered": {
        "en": "Sorry, you're not registered. Please contact your hospital.",
        "hi": "क्षमा करें, आप पंजीकृत नहीं हैं। कृपया अपने अस्पताल से संपर्क करें।",
        "te": "క్షమించండి, మీరు నమోదు కాలేదు. దయచేసి మీ ఆస్పత్రిని సంప్రదించండి.",
    },

    "stop_confirm": {
        "en": "Check-ins paused. Send 'start' to resume. Get well soon!",
        "hi": "चेक-इन रोक दिया गया। फिर से शुरू करने के लिए 'start' भेजें। जल्दी ठीक हो जाइए!",
        "te": "చెక్-ఇన్‌లు ఆపివేయబడ్డాయి. తిరిగి ప్రారంభించడానికి 'start' పంపండి. త్వరగా కోలుకోండి!",
    },

    # Voice call templates
    "voice_greeting": {
        "en": "Hello {name}, this is Heal Hub, your recovery assistant. How is your pain today on a scale of 1 to 10?",
        "hi": "नमस्ते {name}, यह Heal Hub है, आपका रिकवरी सहायक। आज आपका दर्द 1 से 10 में कितना है?",
        "te": "నమస్కారం {name}, ఇది Heal Hub, మీ రికవరీ సహాయకం. ఈరోజు మీ నొప్పి 1 నుండి 10 లో ఎంత?",
    },

    "voice_symptoms": {
        "en": "Thank you. Are you experiencing any swelling, fever, or bleeding near the surgical area?",
        "hi": "धन्यवाद। क्या आपको सर्जरी के आसपास सूजन, बुखार, या खून आ रहा है?",
        "te": "ధన్యవాదాలు. సర్జరీ ప్రాంతం దగ్గర వాపు, జ్వరం, లేదా రక్తస్రావం ఉందా?",
    },

    "voice_medicines": {
        "en": "Got it. Have you been taking your medicines regularly?",
        "hi": "समझ गया। क्या आप अपनी दवाइयां नियमित रूप से ले रहे हैं?",
        "te": "అర్థమైంది. మీరు మీ మందులు క్రమం తప్పకుండా తీసుకుంటున్నారా?",
    },

    "voice_concerns": {
        "en": "One last thing. Do you have any other concerns you'd like me to tell your doctor?",
        "hi": "एक आखिरी बात। क्या आप अपने डॉक्टर को कुछ और बताना चाहते हैं?",
        "te": "ఒక చివరి విషయం. మీ డాక్టర్‌కి ఇంకేమైనా చెప్పాలనుకుంటున్నారా?",
    },

    "voice_closing": {
        "en": (
            "Thank you {name}. I've recorded all your responses and your doctor will be updated. "
            "If you need anything, just send us a WhatsApp message. Take care and get well soon!"
        ),
        "hi": (
            "धन्यवाद {name}। मैंने आपके सारे जवाब रिकॉर्ड कर लिए हैं और आपके डॉक्टर को अपडेट कर दिया जाएगा। "
            "कुछ भी चाहिए तो WhatsApp पर मैसेज करें। अपना ख्याल रखिए!"
        ),
        "te": (
            "ధన్యవాదాలు {name}. మీ సమాధానాలన్నీ రికార్డ్ చేశాము, మీ డాక్టర్‌కి అప్‌డేట్ చేస్తాము. "
            "ఏమైనా కావాలంటే WhatsApp లో మెసేజ్ పంపండి. జాగ్రత్త!"
        ),
    },

    "voice_no_response": {
        "en": "I didn't hear anything. Let me move to the next question.",
        "hi": "मुझे कुछ सुनाई नहीं दिया। अगले सवाल पर चलते हैं।",
        "te": "నాకు ఏమీ వినపడలేదు. తదుపరి ప్రశ్నకు వెళ్దాం.",
    },

    "voice_move_on": {
        "en": "Let me move on.",
        "hi": "आगे बढ़ते हैं।",
        "te": "ముందుకు వెళ్దాం.",
    },

    "voice_no_problem": {
        "en": "No problem.",
        "hi": "कोई बात नहीं।",
        "te": "ఫర్వాలేదు.",
    },

    # Reminder templates
    "reminder": {
        "en": "Hi {name}, just a gentle reminder to complete your check-in. How are you feeling today?",
        "hi": "नमस्ते {name}, आपका चेक-इन अभी बाकी है। आप कैसा महसूस कर रहे हैं?",
        "te": "నమస్కారం {name}, మీ చెక్-ఇన్ పెండింగ్ ఉంది. మీరు ఎలా ఫీల్ అవుతున్నారు?",
    },

    # ── Agent-specific templates ──

    "language_selection_retry": {
        "en": "Please reply with:\n1️⃣ for English\n2️⃣ for हिंदी\n3️⃣ for తెలుగు",
        "hi": "कृपया जवाब दें:\n1️⃣ English के लिए\n2️⃣ हिंदी के लिए\n3️⃣ తెలుగు के लिए",
        "te": "దయచేసి సమాధానం ఇవ్వండి:\n1️⃣ English కోసం\n2️⃣ हिंदी కోసం\n3️⃣ తెలుగు కోసం",
    },

    "greeting_reply": {
        "en": "Hello {name}! 👋 How are you feeling today?",
        "hi": "नमस्ते {name}! 👋 आज आप कैसा महसूस कर रहे हैं?",
        "te": "నమస్తే {name}! 👋 ఈరోజు మీకు ఎలా అనిపిస్తుంది?",
    },

    "photo_analysis_result": {
        "en": (
            "📸 *Wound Analysis Complete*\n\n"
            "🔍 {description}\n"
            "⚠️ Risk Level: {risk}\n\n"
            "💡 Recommendation: {recommendation}\n\n"
            "Your doctor has been notified and can see this analysis."
        ),
        "hi": (
            "📸 *घाव विश्लेषण पूरा*\n\n"
            "🔍 {description}\n"
            "⚠️ जोखिम स्तर: {risk}\n\n"
            "💡 सिफारिश: {recommendation}\n\n"
            "आपके डॉक्टर को सूचित कर दिया गया है।"
        ),
        "te": (
            "📸 *గాయం విశ్లేషణ పూర్తయింది*\n\n"
            "🔍 {description}\n"
            "⚠️ ప్రమాద స్థాయి: {risk}\n\n"
            "💡 సిఫార్సు: {recommendation}\n\n"
            "మీ డాక్టర్‌కి తెలియజేయబడింది."
        ),
    },

    "no_medicines": {
        "en": "No medicines have been added to your profile yet. Please ask your doctor to update your medicine list.",
        "hi": "आपकी प्रोफाइल में अभी तक कोई दवाइयां नहीं जोड़ी गई हैं। कृपया अपने डॉक्टर से अपनी दवाइयों की सूची अपडेट करने के लिए कहें।",
        "te": "మీ ప్రొఫైల్‌లో ఇంకా మందులు జోడించబడలేదు. దయచేసి మీ డాక్టర్‌ని మీ మందుల జాబితా అప్‌డేట్ చేయమని అడగండి.",
    },

    "appointment_confirmed": {
        "en": "✅ Got it! Your appointment request has been sent. The hospital will confirm the date and time soon.",
        "hi": "✅ समझ गया! आपका अपॉइंटमेंट अनुरोध भेज दिया गया है। अस्पताल जल्द ही तारीख और समय की पुष्टि करेगा।",
        "te": "✅ అర్థమైంది! మీ అపాయింట్‌మెంట్ అభ్యర్థన పంపబడింది. ఆస్పత్రి త్వరలో తేదీ మరియు సమయం నిర్ధారిస్తుంది.",
    },

    "medicine_reminder": {
        "en": (
            "💊 *Medicine Reminder*\n\n"
            "Hi {name}! It's time to take your medicines:\n\n"
            "{medicine_list}\n\n"
            "Please take them as prescribed. Reply *1* if you've taken them ✅"
        ),
        "hi": (
            "💊 *दवाई की याद*\n\n"
            "नमस्ते {name}! अपनी दवाइयां लेने का समय हो गया है:\n\n"
            "{medicine_list}\n\n"
            "कृपया डॉक्टर के बताए अनुसार लें। अगर ले ली हैं तो *1* भेजें ✅"
        ),
        "te": (
            "💊 *మందుల రిమైండర్*\n\n"
            "హాయ్ {name}! మీ మందులు తీసుకునే సమయం:\n\n"
            "{medicine_list}\n\n"
            "దయచేసి సూచించిన విధంగా తీసుకోండి. తీసుకుంటే *1* పంపండి ✅"
        ),
    },
}


def get_template(key: str, lang: str = "en", **kwargs) -> str:
    """Get a template string in the specified language, with variables filled in."""
    template_group = TEMPLATES.get(key, {})
    template = template_group.get(lang, template_group.get("en", ""))
    if kwargs:
        try:
            return template.format(**kwargs)
        except KeyError:
            return template
    return template
