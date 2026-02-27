import json
import logging
from app.config import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()

WOUND_PROMPT = """Analyze this post-surgical wound photo. Describe:
1. Overall appearance (clean/inflamed/infected)
2. Signs of redness or swelling (none/mild/moderate/severe)
3. Any discharge or bleeding visible
4. Estimated healing stage
5. Risk level: normal / mild_concern / infection_risk
6. Confidence level (0-1)

Be conservative — when in doubt, flag for doctor review.

Respond in JSON format:
{
  "description": "detailed description",
  "appearance": "clean/inflamed/infected",
  "redness": "none/mild/moderate/severe",
  "discharge": "none/mild/moderate/severe",
  "healing_stage": "early/progressing/well-healed",
  "risk_level": "normal/mild_concern/infection_risk",
  "confidence": 0.0,
  "recommendation": "what to do next"
}"""


async def analyze_wound(image_bytes: bytes) -> dict:
    """Analyze wound photo using Gemini Vision."""
    if not settings.GEMINI_API_KEY:
        return {
            "description": "Wound analysis unavailable — API key not configured",
            "risk_level": "mild_concern",
            "confidence": 0.0,
            "recommendation": "Please have your doctor review the photo at your next visit",
        }

    try:
        import google.generativeai as genai
        genai.configure(api_key=settings.GEMINI_API_KEY)
        model = genai.GenerativeModel("gemini-2.0-flash")

        import PIL.Image
        import io
        image = PIL.Image.open(io.BytesIO(image_bytes))

        response = model.generate_content(
            [WOUND_PROMPT, image],
            generation_config=genai.types.GenerationConfig(
                temperature=0.1,
                max_output_tokens=500,
            ),
        )

        text = response.text.strip()
        if text.startswith("```"):
            lines = text.split("\n")
            lines = [l for l in lines if not l.strip().startswith("```")]
            text = "\n".join(lines)

        try:
            result = json.loads(text)
        except json.JSONDecodeError:
            start = text.find("{")
            end = text.rfind("}") + 1
            if start != -1 and end > start:
                result = json.loads(text[start:end])
            else:
                result = {
                    "description": text[:300],
                    "risk_level": "mild_concern",
                    "confidence": 0.3,
                    "recommendation": "Unable to parse analysis. Doctor review recommended.",
                }

        return result

    except Exception as e:
        logger.error(f"Wound analysis failed: {e}")
        return {
            "description": f"Analysis error: {str(e)[:100]}",
            "risk_level": "mild_concern",
            "confidence": 0.0,
            "recommendation": "Please have your doctor review the photo",
        }
